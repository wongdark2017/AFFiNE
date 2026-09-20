/**
 * @vitest-environment happy-dom
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { getLocale, setLocale } from '../../i18n';

const mocked = vi.hoisted(() => ({
  affineFetch: vi.fn<typeof fetch>(),
}));

vi.mock('@affine/admin/fetch-utils', () => ({
  affineFetch: mocked.affineFetch,
}));

import { OpenAICompatibleConnectionTest } from './openai-compatible-connection-test';

const initialLocale = getLocale();
const draftConfig = {
  apiKey: 'test-unsaved-key',
  baseURL: 'https://draft-models.example.com/v1',
  defaultModel: 'custom/manually-entered-model',
};
const fallbackError =
  'Connection test failed. Check the API key, endpoint and model, then try again.';
const invalidResponse = 'Model service returned an invalid chat response.';

function connectionResponse(model = draftConfig.defaultModel, latencyMs = 125) {
  return new Response(JSON.stringify({ model, latencyMs }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function deferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('OpenAICompatibleConnectionTest', () => {
  beforeEach(() => {
    setLocale('en');
    mocked.affineFetch.mockReset();
  });

  afterEach(() => {
    cleanup();
    setLocale(initialLocale);
  });

  test('tests unsaved credentials and a manually entered model without submitting settings', async () => {
    const request = deferredResponse();
    const onSubmit = vi.fn(event => event.preventDefault());
    mocked.affineFetch.mockReturnValueOnce(request.promise);
    render(
      <form onSubmit={onSubmit}>
        <OpenAICompatibleConnectionTest {...draftConfig} />
      </form>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));

    expect(mocked.affineFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mocked.affineFetch.mock.calls[0];
    expect(url).toBe('/api/copilot/admin/test-connection');
    expect(options?.method).toBe('POST');
    expect(new Headers(options?.headers).get('Content-Type')).toBe(
      'application/json'
    );
    expect(JSON.parse(String(options?.body))).toEqual(draftConfig);
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    const loadingButton = screen.getByRole('button', {
      name: 'Testing connection...',
    });
    expect(loadingButton.hasAttribute('disabled')).toBe(true);
    fireEvent.click(loadingButton);
    expect(mocked.affineFetch).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => {
      request.resolve(
        connectionResponse('custom/manually-entered-model', 125.6)
      );
    });

    const result = await screen.findByRole('status');
    expect(result.textContent).toContain('Connection successful.');
    expect(result.textContent).toContain(
      'Model: custom/manually-entered-model · 126 ms'
    );
    expect(screen.getByRole('button', { name: 'Test again' })).not.toBeNull();
    expect(mocked.affineFetch).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test.each(['network', 'server'])(
    'shows a safe %s failure and allows retrying',
    async failure => {
      if (failure === 'network') {
        mocked.affineFetch.mockRejectedValueOnce(
          new Error('private upstream details test-unsaved-key')
        );
      } else {
        mocked.affineFetch.mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              message: 'private upstream details test-unsaved-key',
            }),
            { status: 502 }
          )
        );
      }
      mocked.affineFetch.mockResolvedValueOnce(connectionResponse());
      render(<OpenAICompatibleConnectionTest {...draftConfig} />);
      fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));

      expect((await screen.findByRole('alert')).textContent).toBe(
        fallbackError
      );
      expect(screen.queryByText(/private upstream details/)).toBeNull();
      expect(screen.queryByText(/test-unsaved-key/)).toBeNull();
      expect(screen.queryByRole('status')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Test again' }));

      expect((await screen.findByRole('status')).textContent).toContain(
        'Connection successful.'
      );
      expect(screen.queryByRole('alert')).toBeNull();
      expect(mocked.affineFetch).toHaveBeenCalledTimes(2);
    }
  );

  test.each([
    'not JSON',
    JSON.stringify({ model: '', latencyMs: 125 }),
    JSON.stringify({ model: 123, latencyMs: 125 }),
    JSON.stringify({ model: 'model-alpha', latencyMs: -1 }),
    JSON.stringify({ model: 'model-alpha', latencyMs: '125' }),
    JSON.stringify({ model: 'model-alpha' }),
  ])('rejects invalid successful response %s', async responseBody => {
    mocked.affineFetch.mockResolvedValueOnce(new Response(responseBody));
    render(<OpenAICompatibleConnectionTest {...draftConfig} />);
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      invalidResponse
    );
    expect(screen.queryByRole('status')).toBeNull();
    expect(
      screen
        .getByRole('button', { name: 'Test again' })
        .hasAttribute('disabled')
    ).toBe(false);
  });

  test.each([
    { apiKey: '' },
    { baseURL: '' },
    { defaultModel: '' },
    { apiKey: '   ' },
    { baseURL: '   ' },
    { defaultModel: '   ' },
  ])('requires all connection fields: %o', missingField => {
    render(
      <OpenAICompatibleConnectionTest {...draftConfig} {...missingField} />
    );
    const button = screen.getByRole('button', { name: 'Test connection' });

    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.click(button);
    expect(mocked.affineFetch).not.toHaveBeenCalled();
  });

  test.each([
    { apiKey: 'replacement-test-key' },
    { baseURL: 'https://other-models.example.com/v1' },
    { defaultModel: 'another-model' },
  ])('clears the result when the connection changes: %o', async changed => {
    mocked.affineFetch.mockResolvedValueOnce(connectionResponse());
    const { rerender } = render(
      <OpenAICompatibleConnectionTest {...draftConfig} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    await screen.findByRole('status');

    rerender(<OpenAICompatibleConnectionTest {...draftConfig} {...changed} />);

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Test connection' })
    ).not.toBeNull();
    expect(mocked.affineFetch).toHaveBeenCalledTimes(1);
  });

  test.each(['success', 'failure'])(
    'aborts an outdated request and ignores its late %s',
    async oldResult => {
      const oldRequest = deferredResponse();
      mocked.affineFetch
        .mockReturnValueOnce(oldRequest.promise)
        .mockResolvedValueOnce(connectionResponse('new-model', 80));
      const { rerender } = render(
        <OpenAICompatibleConnectionTest {...draftConfig} />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
      const oldSignal = mocked.affineFetch.mock.calls[0][1]?.signal;

      rerender(
        <OpenAICompatibleConnectionTest
          {...draftConfig}
          defaultModel="new-model"
        />
      );

      expect(oldSignal?.aborted).toBe(true);
      fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
      expect((await screen.findByRole('status')).textContent).toContain(
        'Model: new-model · 80 ms'
      );
      expect(
        JSON.parse(String(mocked.affineFetch.mock.calls[1][1]?.body))
          .defaultModel
      ).toBe('new-model');

      await act(async () => {
        oldRequest.resolve(
          oldResult === 'success'
            ? connectionResponse('stale-model', 900)
            : new Response('private upstream error', { status: 500 })
        );
      });

      expect(screen.getByRole('status').textContent).toContain(
        'Model: new-model · 80 ms'
      );
      expect(screen.queryByText(/stale-model/)).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    }
  );

  test('aborts on unmount and ignores a late result', async () => {
    const request = deferredResponse();
    mocked.affineFetch.mockReturnValueOnce(request.promise);
    const { unmount, container } = render(
      <OpenAICompatibleConnectionTest {...draftConfig} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    const signal = mocked.affineFetch.mock.calls[0][1]?.signal;

    unmount();

    expect(signal?.aborted).toBe(true);
    await act(async () => {
      request.resolve(connectionResponse());
    });
    expect(container.childElementCount).toBe(0);
  });
});
