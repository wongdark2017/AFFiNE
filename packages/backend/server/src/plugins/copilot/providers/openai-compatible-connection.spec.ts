import { once } from 'node:events';
import { createServer } from 'node:http';

import test from 'ava';
import Sinon from 'sinon';

import {
  CONNECTION_TEST_ERRORS,
  ConnectionTestError,
  testOpenAICompatibleConnection,
} from './openai-compatible-connection';

const draft = {
  apiKey: 'test-secret',
  baseURL: 'https://models.example',
  defaultModel: 'draft-model',
};
const chat = {
  model: 'upstream-model',
  choices: [{ message: { role: 'assistant', content: 'OK' } }],
};

test.afterEach.always(() => Sinon.restore());

test.serial(
  'probes the draft model with a bounded real chat request',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch').callsFake(async () =>
      Response.json(chat)
    );
    const result = await testOpenAICompatibleConnection({
      ...draft,
      apiKey: ` ${draft.apiKey} `,
      defaultModel: ` ${draft.defaultModel} `,
    });
    t.is(result.model, draft.defaultModel);
    t.true(Number.isInteger(result.latencyMs));
    t.true(result.latencyMs >= 0);
    t.deepEqual(Object.keys(result).sort(), ['latencyMs', 'model']);
    t.is(fetch.callCount, 1);
    const [url, request] = fetch.firstCall.args;
    t.is(url, 'https://models.example/v1/chat/completions');
    t.is(request?.method, 'POST');
    t.deepEqual(request?.headers, {
      Authorization: 'Bearer test-secret',
      'Content-Type': 'application/json',
    });
    t.is(request?.redirect, 'error');
    t.true(request?.signal instanceof AbortSignal);
    t.deepEqual(JSON.parse(String(request?.body)), {
      model: 'draft-model',
      messages: [{ role: 'user', content: 'Reply with OK.' }],
      stream: false,
      max_completion_tokens: 32,
    });
  }
);

test.serial(
  'shares discovery URL normalization and local relay support',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch').callsFake(async () =>
      Response.json(chat)
    );
    for (const [baseURL, expected] of [
      [
        'https://models.example///',
        'https://models.example/v1/chat/completions',
      ],
      [
        'https://models.example/v1/',
        'https://models.example/v1/chat/completions',
      ],
      [
        'https://models.example/proxy/v1///',
        'https://models.example/proxy/v1/chat/completions',
      ],
      ['http://127.0.0.1:11434/', 'http://127.0.0.1:11434/v1/chat/completions'],
    ]) {
      await testOpenAICompatibleConnection({ ...draft, baseURL });
      t.is(fetch.lastCall.args[0], expected);
    }
  }
);

test.serial(
  'requires all three draft fields before contacting the service',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch');
    for (const input of [
      null,
      {},
      { ...draft, apiKey: '' },
      { ...draft, baseURL: ' ' },
      { ...draft, defaultModel: '' },
      { ...draft, defaultModel: ' ' },
      { ...draft, defaultModel: null },
      { ...draft, defaultModel: 42 },
      { apiKey: draft.apiKey, baseURL: draft.baseURL },
    ]) {
      await t.throwsAsync(testOpenAICompatibleConnection(input), {
        instanceOf: ConnectionTestError,
        message: CONNECTION_TEST_ERRORS.missingCredentials,
      });
    }
    t.false(fetch.called);
  }
);

test.serial('rejects unsafe addresses without forwarding the key', async t => {
  const fetch = Sinon.stub(globalThis, 'fetch');
  for (const baseURL of [
    'not-a-url',
    'file:///tmp/models',
    'ftp://models.example',
    'https://user:password@models.example',
    'https://user@models.example',
    'https://models.example?key=secret',
    'https://models.example#secret',
    'https://models.example?',
    'https://models.example#',
  ]) {
    await t.throwsAsync(testOpenAICompatibleConnection({ ...draft, baseURL }), {
      message: CONNECTION_TEST_ERRORS.invalidURL,
    });
  }
  t.false(fetch.called);
});

test.serial(
  'retries once with max_tokens only for an explicitly unsupported limit',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch');
    for (const error of [
      { code: 'unsupported_parameter', param: 'max_completion_tokens' },
      {
        message:
          "Unsupported parameter: 'max_completion_tokens'. Use 'max_tokens'.",
      },
    ]) {
      fetch.reset();
      fetch.onFirstCall().resolves(Response.json({ error }, { status: 400 }));
      fetch.onSecondCall().resolves(Response.json(chat));
      await testOpenAICompatibleConnection(draft);
      t.is(fetch.callCount, 2);
      const first = fetch.firstCall.args[1];
      const second = fetch.secondCall.args[1];
      t.is(first?.signal, second?.signal);
      t.deepEqual(JSON.parse(String(second?.body)), {
        model: 'draft-model',
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        stream: false,
        max_tokens: 32,
      });
      t.is(second?.redirect, 'error');
    }
  }
);

test.serial(
  'does not retry an authentication, server or unrelated input failure',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch');
    for (const [status, error, code] of [
      [
        401,
        { code: 'unsupported_parameter', param: 'max_completion_tokens' },
        'unauthorized',
      ],
      [
        500,
        { code: 'unsupported_parameter', param: 'max_completion_tokens' },
        'requestFailed',
      ],
      [
        400,
        { code: 'invalid_value', param: 'max_completion_tokens' },
        'requestFailed',
      ],
      [
        400,
        { code: 'unsupported_parameter', param: 'temperature' },
        'requestFailed',
      ],
      [
        400,
        {
          code: 'unsupported_parameter',
          param: 'temperature',
          message:
            'Unsupported parameter: temperature. Use max_completion_tokens.',
        },
        'requestFailed',
      ],
      [
        400,
        {
          code: 'invalid_value',
          param: 'max_completion_tokens',
          message: 'This value of max_completion_tokens is not supported.',
        },
        'requestFailed',
      ],
    ] as const) {
      fetch.reset();
      fetch.resolves(Response.json({ error }, { status }));
      await t.throwsAsync(testOpenAICompatibleConnection(draft), {
        message: CONNECTION_TEST_ERRORS[code],
      });
      t.is(fetch.callCount, 1);
    }
  }
);

test.serial(
  'never performs a third request if the legacy fallback also fails',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch').callsFake(async () =>
      Response.json(
        {
          error: {
            code: 'unsupported_parameter',
            param: 'max_completion_tokens',
          },
        },
        { status: 400 }
      )
    );
    await t.throwsAsync(testOpenAICompatibleConnection(draft), {
      message: CONNECTION_TEST_ERRORS.requestFailed,
    });
    t.is(fetch.callCount, 2);
  }
);

test.serial(
  'maps service failures to safe credential, model, quota and rate errors',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch');
    for (const [status, code] of [
      [401, 'unauthorized'],
      [403, 'unauthorized'],
      [402, 'quota'],
      [404, 'modelUnavailable'],
      [405, 'modelUnavailable'],
      [429, 'rateLimited'],
      [500, 'requestFailed'],
      [302, 'requestFailed'],
    ] as const) {
      fetch.resolves(
        new Response('test-secret private diagnostic', { status })
      );
      await t.throwsAsync(testOpenAICompatibleConnection(draft), {
        message: CONNECTION_TEST_ERRORS[code],
      });
    }
    for (const [status, error, code] of [
      [429, { code: 'insufficient_quota' }, 'quota'],
      [400, { type: 'quota_exceeded' }, 'quota'],
      [400, { code: 'model_not_found' }, 'modelUnavailable'],
      [400, { param: 'model' }, 'modelUnavailable'],
      [
        400,
        { message: 'This is not a chat model. test-secret' },
        'modelUnavailable',
      ],
    ] as const) {
      fetch.resolves(Response.json({ error }, { status }));
      await t.throwsAsync(testOpenAICompatibleConnection(draft), {
        message: CONNECTION_TEST_ERRORS[code],
      });
    }
  }
);

test.serial(
  'rejects HTML, malformed JSON and missing or invalid chat choices',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch');
    for (const body of [
      '<html>test-secret</html>',
      '{}',
      '{"choices":[]}',
      '{"choices":[null]}',
      '{"choices":[{}]}',
      '{"choices":[{"message":{"role":"user","content":"OK"}}]}',
      '{"choices":[{"message":{"role":"assistant","content":42}}]}',
      '{"choices":[{"message":{"role":"assistant","content":null}}]}',
      '{"choices":[{"message":{"role":"assistant","content":null},"finish_reason":"stop"}]}',
      '{"data":[{"id":"draft-model"}]}',
    ]) {
      fetch.resolves(new Response(body));
      await t.throwsAsync(testOpenAICompatibleConnection(draft), {
        message: CONNECTION_TEST_ERRORS.invalidResponse,
      });
    }
  }
);

test.serial(
  'accepts reasoning responses that exhaust the small completion budget',
  async t => {
    Sinon.stub(globalThis, 'fetch').resolves(
      Response.json({
        choices: [
          {
            message: { role: 'assistant', content: null },
            finish_reason: 'length',
          },
        ],
      })
    );
    const result = await testOpenAICompatibleConnection(draft);
    t.is(result.model, draft.defaultModel);
  }
);

test.serial('sanitizes thrown network errors and does not retry', async t => {
  const fetch = Sinon.stub(globalThis, 'fetch').rejects(
    new Error(draft.apiKey)
  );
  await t.throwsAsync(testOpenAICompatibleConnection(draft), {
    message: CONNECTION_TEST_ERRORS.connection,
  });
  t.is(fetch.callCount, 1);
});

test.serial(
  'applies a single twenty-second timeout across a fallback request',
  async t => {
    const abort = new AbortController();
    const timeout = Sinon.stub(AbortSignal, 'timeout').returns(abort.signal);
    const fetch = Sinon.stub(globalThis, 'fetch');
    fetch.onFirstCall().resolves(
      Response.json(
        {
          error: {
            code: 'unsupported_parameter',
            param: 'max_completion_tokens',
          },
        },
        { status: 400 }
      )
    );
    fetch.onSecondCall().callsFake(async () => {
      abort.abort();
      throw new DOMException(draft.apiKey, 'AbortError');
    });
    await t.throwsAsync(testOpenAICompatibleConnection(draft), {
      message: CONNECTION_TEST_ERRORS.timeout,
    });
    t.true(timeout.calledOnceWithExactly(20_000));
    t.is(fetch.firstCall.args[1]?.signal, fetch.secondCall.args[1]?.signal);
  }
);

test.serial(
  'expired response reads cannot produce success or trigger a retry',
  async t => {
    const abort = new AbortController();
    Sinon.stub(AbortSignal, 'timeout').returns(abort.signal);
    const response = Response.json(chat);
    Sinon.stub(response, 'json').callsFake(async () => {
      abort.abort();
      return chat;
    });
    const fetch = Sinon.stub(globalThis, 'fetch').resolves(response);
    await t.throwsAsync(testOpenAICompatibleConnection(draft), {
      message: CONNECTION_TEST_ERRORS.timeout,
    });
    t.is(fetch.callCount, 1);
  }
);

test.serial(
  'sends and parses a real HTTP chat exchange with a local relay',
  async t => {
    const requests: { path?: string; authorization?: string; body: string }[] =
      [];
    const server = createServer(async (req, res) => {
      let body = '';
      for await (const chunk of req) body += chunk;
      requests.push({
        path: req.url,
        authorization: req.headers.authorization,
        body,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(chat));
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.teardown(async () => {
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    });
    const address = server.address();
    if (!address || typeof address === 'string')
      return t.fail('Missing test server port');
    const result = await testOpenAICompatibleConnection({
      ...draft,
      baseURL: `http://127.0.0.1:${address.port}/proxy/v1///`,
    });
    t.is(result.model, draft.defaultModel);
    t.is(requests.length, 1);
    t.is(requests[0].path, '/proxy/v1/chat/completions');
    t.is(requests[0].authorization, `Bearer ${draft.apiKey}`);
    t.is(JSON.parse(requests[0].body).max_completion_tokens, 32);
  }
);

test.serial(
  'aborts a real response stream when the shared deadline expires',
  async t => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write('{"choices":');
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.teardown(async () => {
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    });
    const address = server.address();
    if (!address || typeof address === 'string')
      return t.fail('Missing test server port');
    const timeoutSignal = AbortSignal.timeout(500);
    const timeout = Sinon.stub(AbortSignal, 'timeout').returns(timeoutSignal);
    await t.throwsAsync(
      testOpenAICompatibleConnection({
        ...draft,
        baseURL: `http://127.0.0.1:${address.port}`,
      }),
      { message: CONNECTION_TEST_ERRORS.timeout }
    );
    t.true(timeout.calledOnceWithExactly(20_000));
  }
);
