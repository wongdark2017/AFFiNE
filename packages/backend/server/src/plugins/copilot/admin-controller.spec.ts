import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import ava, { type TestFn } from 'ava';
import Sinon from 'sinon';
import request from 'supertest';

import { Cache, Config, CryptoHelper } from '../../base';
import { GlobalExceptionFilter } from '../../base/nestjs/exception';
import { THROTTLER_PROTECTED } from '../../base/throttler/decorators';
import { AccessTokenService } from '../../core/auth/access-token';
import { AuthSessionService } from '../../core/auth/auth-session';
import { AuthGuard } from '../../core/auth/guard';
import { CSRF_COOKIE_NAME } from '../../core/auth/input';
import { AuthService } from '../../core/auth/service';
import type { Session } from '../../core/auth/session';
import { FeatureService } from '../../core/features/service';
import { CopilotAdminController } from './admin-controller';
import { OpenAICompatibleProvider } from './providers/openai-compatible';
import { CONNECTION_TEST_ERRORS } from './providers/openai-compatible-connection';
import { MODEL_DISCOVERY_ERRORS } from './providers/openai-compatible-models';
import { openAICompatibleURL } from './providers/openai-compatible-url';

const test = ava as TestFn<{ app: INestApplication }>;
const draft = { apiKey: 'draft-secret', baseURL: 'https://models.example' };

test.before(async t => {
  const module = await Test.createTestingModule({
    controllers: [CopilotAdminController],
    providers: [
      AuthGuard,
      ...[
        CryptoHelper,
        Cache,
        Config,
        AuthService,
        AccessTokenService,
        AuthSessionService,
      ].map(provide => ({ provide, useValue: {} })),
      {
        provide: FeatureService,
        useValue: { isAdmin: async (id: string) => id === 'admin' },
      },
    ],
  }).compile();
  const app = module.createNestApplication();
  app.useLogger(false);
  app.useGlobalGuards(app.get(AuthGuard));
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();
  t.context.app = app;
});

test.beforeEach(t => {
  // Exercise the real default AuthGuard and AdminGuard while replacing session
  // lookup, so these route tests cannot connect to a database.
  Sinon.stub(t.context.app.get(AuthGuard), 'signIn').callsFake(async req => {
    const id = req.get('x-test-user');
    if (!id) return null;
    req.session = { user: { id } } as Session;
    req.authType = req.get('x-test-auth-type') === 'jwt' ? 'jwt' : 'session';
    return req.session;
  });
});

test.afterEach.always(() => Sinon.restore());
test.after.always(async t => t.context.app.close());

test.serial(
  'anonymous requests are rejected before contacting the model service',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch');
    const res = await request(t.context.app.getHttpServer())
      .post('/api/copilot/admin/models')
      .send(draft)
      .expect(401);
    t.is(res.body.name, 'AUTHENTICATION_REQUIRED');
    t.false(fetch.called);
  }
);

test.serial('signed-in non-admin requests are forbidden', async t => {
  const fetch = Sinon.stub(globalThis, 'fetch');
  const res = await request(t.context.app.getHttpServer())
    .post('/api/copilot/admin/models')
    .set('x-test-user', 'member')
    .send(draft)
    .expect(403);
  t.is(res.body.name, 'ACTION_FORBIDDEN');
  t.false(fetch.called);
});

test.serial(
  'admins discover models using unsaved credentials without a default model',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch').resolves(
      Response.json({ data: [{ id: 'draft-model' }, { id: 'draft-model' }] })
    );
    const res = await request(t.context.app.getHttpServer())
      .post('/api/copilot/admin/models')
      .set('x-test-user', 'admin')
      .set('Cookie', `${CSRF_COOKIE_NAME}=test-csrf`)
      .set('x-affine-csrf-token', 'test-csrf')
      .send(draft)
      .expect(200);
    t.deepEqual(res.body, { models: ['draft-model'] });
    t.is(fetch.firstCall.args[0], 'https://models.example/v1/models');
    t.deepEqual(fetch.firstCall.args[1]?.headers, {
      Authorization: 'Bearer draft-secret',
    });
    t.false(JSON.stringify(res.body).includes(draft.apiKey));
    t.is(
      Reflect.getMetadata(THROTTLER_PROTECTED, CopilotAdminController),
      'strict'
    );
  }
);

test.serial(
  'invalid draft inputs return a safe project BadRequest',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch');
    const res = await request(t.context.app.getHttpServer())
      .post('/api/copilot/admin/models')
      .set('x-test-user', 'admin')
      .set('Cookie', `${CSRF_COOKIE_NAME}=test-csrf`)
      .set('x-affine-csrf-token', 'test-csrf')
      .send({ apiKey: draft.apiKey })
      .expect(400);
    t.is(res.body.name, 'BAD_REQUEST');
    t.is(res.body.message, MODEL_DISCOVERY_ERRORS.missingCredentials);
    t.false(JSON.stringify(res.body).includes(draft.apiKey));
    t.false(fetch.called);
  }
);

test.serial(
  'upstream authentication failure is a sanitized 400, not a local 401',
  async t => {
    Sinon.stub(globalThis, 'fetch').resolves(
      new Response(draft.apiKey, { status: 401 })
    );
    const res = await request(t.context.app.getHttpServer())
      .post('/api/copilot/admin/models')
      .set('x-test-user', 'admin')
      .set('Cookie', `${CSRF_COOKIE_NAME}=test-csrf`)
      .set('x-affine-csrf-token', 'test-csrf')
      .send(draft)
      .expect(400);
    t.is(res.body.name, 'BAD_REQUEST');
    t.is(res.body.message, MODEL_DISCOVERY_ERRORS.unauthorized);
    t.false(JSON.stringify(res.body).includes(draft.apiKey));
  }
);

test.serial(
  'connection tests require authentication before contacting the service',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch');
    const res = await request(t.context.app.getHttpServer())
      .post('/api/copilot/admin/test-connection')
      .send({ ...draft, defaultModel: 'draft-model' })
      .expect(401);
    t.is(res.body.name, 'AUTHENTICATION_REQUIRED');
    t.false(fetch.called);
  }
);

test.serial('connection tests reject signed-in non-admin users', async t => {
  const fetch = Sinon.stub(globalThis, 'fetch');
  const res = await request(t.context.app.getHttpServer())
    .post('/api/copilot/admin/test-connection')
    .set('x-test-user', 'member')
    .send({ ...draft, defaultModel: 'draft-model' })
    .expect(403);
  t.is(res.body.name, 'ACTION_FORBIDDEN');
  t.false(fetch.called);
});

test.serial(
  'admins test unsaved model credentials with chat without leaking response contents',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch').resolves(
      Response.json({
        model: 'upstream private diagnostic',
        choices: [{ message: { role: 'assistant', content: draft.apiKey } }],
      })
    );
    const res = await request(t.context.app.getHttpServer())
      .post('/api/copilot/admin/test-connection')
      .set('x-test-user', 'admin')
      .set('Cookie', `${CSRF_COOKIE_NAME}=test-csrf`)
      .set('x-affine-csrf-token', 'test-csrf')
      .send({ ...draft, defaultModel: 'draft-model' })
      .expect(200);
    t.is(res.body.model, 'draft-model');
    t.true(Number.isInteger(res.body.latencyMs));
    t.is(fetch.firstCall.args[0], 'https://models.example/v1/chat/completions');
    t.deepEqual(fetch.firstCall.args[1]?.headers, {
      Authorization: 'Bearer draft-secret',
      'Content-Type': 'application/json',
    });
    t.false(JSON.stringify(res.body).includes(draft.apiKey));
    t.false(JSON.stringify(res.body).includes('private diagnostic'));
    t.is(
      Reflect.getMetadata(THROTTLER_PROTECTED, CopilotAdminController),
      'strict'
    );
  }
);

test.serial(
  'admin connection tests require a model and return safe project errors',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch');
    const res = await request(t.context.app.getHttpServer())
      .post('/api/copilot/admin/test-connection')
      .set('x-test-user', 'admin')
      .set('Cookie', `${CSRF_COOKIE_NAME}=test-csrf`)
      .set('x-affine-csrf-token', 'test-csrf')
      .send(draft)
      .expect(400);
    t.is(res.body.name, 'BAD_REQUEST');
    t.is(res.body.message, CONNECTION_TEST_ERRORS.missingCredentials);
    t.false(fetch.called);
  }
);

test.serial(
  'upstream connection test failures are sanitized project BadRequest responses',
  async t => {
    Sinon.stub(globalThis, 'fetch').resolves(
      new Response(draft.apiKey, { status: 401 })
    );
    const res = await request(t.context.app.getHttpServer())
      .post('/api/copilot/admin/test-connection')
      .set('x-test-user', 'admin')
      .set('Cookie', `${CSRF_COOKIE_NAME}=test-csrf`)
      .set('x-affine-csrf-token', 'test-csrf')
      .send({ ...draft, defaultModel: 'draft-model' })
      .expect(400);
    t.is(res.body.name, 'BAD_REQUEST');
    t.is(res.body.message, CONNECTION_TEST_ERRORS.unauthorized);
    t.false(JSON.stringify(res.body).includes(draft.apiKey));
  }
);

for (const endpoint of ['models', 'test-connection']) {
  test.serial(
    `${endpoint} rejects missing or mismatched cookie CSRF tokens`,
    async t => {
      const fetch = Sinon.stub(globalThis, 'fetch');
      for (const [cookie, header] of [
        ['', ''],
        ['test-csrf', ''],
        ['', 'test-csrf'],
        ['test-csrf', 'wrong-csrf'],
      ]) {
        const req = request(t.context.app.getHttpServer())
          .post(`/api/copilot/admin/${endpoint}`)
          .set('x-test-user', 'admin');
        if (cookie) req.set('Cookie', `${CSRF_COOKIE_NAME}=${cookie}`);
        if (header) req.set('x-affine-csrf-token', header);
        const res = await req
          .send({ ...draft, defaultModel: 'draft-model' })
          .expect(403);
        t.is(res.body.name, 'ACTION_FORBIDDEN');
      }
      t.false(fetch.called);
    }
  );

  test.serial(
    `${endpoint} rejects cross-site simple form submissions`,
    async t => {
      const fetch = Sinon.stub(globalThis, 'fetch');
      await request(t.context.app.getHttpServer())
        .post(`/api/copilot/admin/${endpoint}`)
        .set('x-test-user', 'admin')
        .set('Origin', 'https://other.example')
        .set('Cookie', `${CSRF_COOKIE_NAME}=test-csrf`)
        .type('form')
        .send({ ...draft, defaultModel: 'draft-model' })
        .expect(403);
      t.false(fetch.called);
    }
  );

  test.serial(
    `${endpoint} accepts an authenticated admin bearer session without CSRF`,
    async t => {
      Sinon.stub(globalThis, 'fetch').resolves(
        Response.json(
          endpoint === 'models'
            ? { data: [{ id: 'draft-model' }] }
            : { choices: [{ message: { role: 'assistant', content: 'OK' } }] }
        )
      );
      await request(t.context.app.getHttpServer())
        .post(`/api/copilot/admin/${endpoint}`)
        .set('x-test-user', 'admin')
        .set('x-test-auth-type', 'jwt')
        .send({ ...draft, defaultModel: 'draft-model' })
        .expect(200);
      t.pass();
    }
  );
}

test.serial(
  'draft probes and live compatible chat use the same normalized URL',
  async t => {
    for (const baseURL of [
      'https://models.example',
      'https://models.example/v1/',
      'https://models.example/proxy/v1///',
      'http://127.0.0.1:11434///',
    ]) {
      class ConfiguredProvider extends OpenAICompatibleProvider {
        protected override get config() {
          return { apiKey: draft.apiKey, baseURL, defaultModel: 'draft-model' };
        }
      }
      const config = await new ConfiguredProvider()
        .getDriverSpec()
        .createBackendConfig();
      t.is(
        `${config.base_url}/v1/chat/completions`,
        openAICompatibleURL(baseURL, 'chat/completions')
      );
      t.is(config.auth_token, draft.apiKey);
    }
  }
);
