import test from 'ava';
import Sinon from 'sinon';

import {
  fetchOpenAICompatibleModels,
  MODEL_DISCOVERY_ERRORS,
  ModelDiscoveryError,
} from './openai-compatible-models';

const draft = { apiKey: 'test-secret', baseURL: 'https://models.example' };

test.afterEach.always(() => Sinon.restore());

test.serial(
  'normalizes root, v1 and proxy paths without duplicating v1',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch').callsFake(async () =>
      Response.json({
        data: [
          { id: 'chat-a' },
          { id: '' },
          { id: 'chat-a' },
          { id: ' chat-b ' },
        ],
      })
    );
    for (const [baseURL, expected] of [
      ['https://models.example', 'https://models.example/v1/models'],
      ['https://models.example///', 'https://models.example/v1/models'],
      ['https://models.example/v1/', 'https://models.example/v1/models'],
      [
        'https://models.example/proxy/v1///',
        'https://models.example/proxy/v1/models',
      ],
      ['http://127.0.0.1:11434/', 'http://127.0.0.1:11434/v1/models'],
    ]) {
      t.deepEqual(await fetchOpenAICompatibleModels({ ...draft, baseURL }), [
        'chat-a',
        'chat-b',
      ]);
      t.is(fetch.lastCall.args[0], expected);
      t.deepEqual(fetch.lastCall.args[1]?.headers, {
        Authorization: 'Bearer test-secret',
      });
      t.is(fetch.lastCall.args[1]?.redirect, 'error');
      t.true(fetch.lastCall.args[1]?.signal instanceof AbortSignal);
    }
  }
);

test.serial(
  'accepts empty model lists without requiring a default model',
  async t => {
    Sinon.stub(globalThis, 'fetch').resolves(Response.json({ data: [] }));
    t.deepEqual(await fetchOpenAICompatibleModels(draft), []);
  }
);

test.serial(
  'rejects missing or non-string credentials before requesting models',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch');
    for (const input of [
      null,
      {},
      { ...draft, apiKey: '' },
      { ...draft, apiKey: ' ' },
      { ...draft, apiKey: 123 },
      { ...draft, baseURL: [] },
    ]) {
      await t.throwsAsync(fetchOpenAICompatibleModels(input), {
        instanceOf: ModelDiscoveryError,
        message: MODEL_DISCOVERY_ERRORS.missingCredentials,
      });
    }
    t.false(fetch.called);
  }
);

test.serial(
  'rejects unsafe URL components before sending credentials',
  async t => {
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
      await t.throwsAsync(fetchOpenAICompatibleModels({ ...draft, baseURL }), {
        instanceOf: ModelDiscoveryError,
        message: MODEL_DISCOVERY_ERRORS.invalidURL,
      });
    }
    t.false(fetch.called);
  }
);

test.serial(
  'maps upstream HTTP failures without reading or echoing response bodies',
  async t => {
    const fetch = Sinon.stub(globalThis, 'fetch');
    for (const [status, code] of [
      [401, 'unauthorized'],
      [403, 'unauthorized'],
      [404, 'unsupported'],
      [429, 'rateLimited'],
      [500, 'requestFailed'],
      [302, 'requestFailed'],
    ] as const) {
      const response = new Response(
        'test-secret internal upstream diagnostic',
        { status }
      );
      const read = Sinon.spy(response, 'json');
      fetch.resolves(response);
      await t.throwsAsync(fetchOpenAICompatibleModels(draft), {
        message: MODEL_DISCOVERY_ERRORS[code],
      });
      t.false(read.called);
      t.false(response.bodyUsed);
    }
  }
);

test.serial('rejects malformed JSON and invalid model item shapes', async t => {
  const fetch = Sinon.stub(globalThis, 'fetch');
  for (const body of [
    '<html>secret</html>',
    '{}',
    '{"data":null}',
    '{"data":{}}',
    '{"data":[null]}',
    '{"data":[{}]}',
    '{"data":[{"id":42}]}',
  ]) {
    fetch.resolves(new Response(body));
    await t.throwsAsync(fetchOpenAICompatibleModels(draft), {
      message: MODEL_DISCOVERY_ERRORS.invalidResponse,
    });
  }
});

test.serial(
  'sanitizes connection errors without exposing credentials',
  async t => {
    Sinon.stub(globalThis, 'fetch').rejects(
      new Error('test-secret request failed')
    );
    await t.throwsAsync(fetchOpenAICompatibleModels(draft), {
      message: MODEL_DISCOVERY_ERRORS.connection,
    });
  }
);

test.serial(
  'enforces a ten-second timeout with a safe timeout error',
  async t => {
    const abort = new AbortController();
    const timeout = Sinon.stub(AbortSignal, 'timeout').returns(abort.signal);
    Sinon.stub(globalThis, 'fetch').callsFake(async () => {
      abort.abort();
      throw new DOMException('test-secret', 'AbortError');
    });
    await t.throwsAsync(fetchOpenAICompatibleModels(draft), {
      message: MODEL_DISCOVERY_ERRORS.timeout,
    });
    t.true(timeout.calledOnceWithExactly(10_000));
  }
);

test.serial(
  'rejects a model list whose response body completes after the deadline',
  async t => {
    const abort = new AbortController();
    Sinon.stub(AbortSignal, 'timeout').returns(abort.signal);
    const response = Response.json({ data: [{ id: 'late-model' }] });
    Sinon.stub(response, 'json').callsFake(async () => {
      abort.abort();
      return { data: [{ id: 'late-model' }] };
    });
    Sinon.stub(globalThis, 'fetch').resolves(response);
    await t.throwsAsync(fetchOpenAICompatibleModels(draft), {
      message: MODEL_DISCOVERY_ERRORS.timeout,
    });
  }
);
