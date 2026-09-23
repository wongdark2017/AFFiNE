/**
 * @vitest-environment happy-dom
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { getLocale, setLocale } from '../../i18n';

const mocked = vi.hoisted(() => ({
  affineFetch: vi.fn<typeof fetch>(),
  onChange: vi.fn<(value: string) => void>(),
}));

vi.mock('@affine/admin/fetch-utils', () => ({
  affineFetch: mocked.affineFetch,
}));

import { OpenAICompatibleModelInput } from './openai-compatible-model-input';

const initialLocale = getLocale();
const draftCredentials = {
  apiKey: 'test-draft-key',
  baseURL: 'https://draft-models.example.com/v1',
};

function ModelInputHarness({
  apiKey = draftCredentials.apiKey,
  baseURL = draftCredentials.baseURL,
  initialValue = '',
}: {
  apiKey?: string;
  baseURL?: string;
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <OpenAICompatibleModelInput
      apiKey={apiKey}
      baseURL={baseURL}
      value={value}
      onChange={nextValue => {
        mocked.onChange(nextValue);
        setValue(nextValue);
      }}
    />
  );
}

function modelsResponse(models: string[]) {
  return new Response(JSON.stringify({ models }), {
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

const modelInput = () =>
  screen.getByRole<HTMLInputElement>('combobox', { name: 'Default model' });

describe('OpenAICompatibleModelInput', () => {
  beforeEach(() => {
    setLocale('en');
    mocked.affineFetch.mockReset();
    mocked.onChange.mockReset();
  });

  afterEach(() => {
    cleanup();
    setLocale(initialLocale);
  });

  test('fetches with unsaved credentials and no default model without selecting a model', async () => {
    const request = deferredResponse();
    mocked.affineFetch.mockReturnValueOnce(request.promise);
    render(<ModelInputHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Get models' }));

    expect(mocked.affineFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mocked.affineFetch.mock.calls[0];
    expect(url).toBe('/api/copilot/admin/models');
    expect(options?.method).toBe('POST');
    expect(new Headers(options?.headers).get('Content-Type')).toBe(
      'application/json'
    );
    expect(JSON.parse(String(options?.body))).toEqual(draftCredentials);
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(
      screen
        .getByRole('button', { name: 'Fetching models...' })
        .hasAttribute('disabled')
    ).toBe(true);
    expect(modelInput().disabled).toBe(false);

    await act(async () => {
      request.resolve(modelsResponse(['model-alpha', 'model-beta']));
    });

    expect(await screen.findByText('2 models available.')).not.toBeNull();
    expect(
      screen.getByRole('button', { name: 'Refresh models' })
    ).not.toBeNull();
    expect(modelInput().value).toBe('');
    expect(mocked.onChange).not.toHaveBeenCalled();
  });

  test('shows the full fetched list while preserving a previously configured model', async () => {
    mocked.affineFetch.mockResolvedValueOnce(
      modelsResponse(['model-alpha', 'model-beta'])
    );
    render(<ModelInputHarness initialValue="legacy-model" />);

    fireEvent.click(screen.getByRole('button', { name: 'Get models' }));

    const list = within(
      await screen.findByRole('listbox', { name: 'Available models' })
    );
    expect(list.getAllByRole('option')).toHaveLength(2);
    expect(list.getByRole('option', { name: 'model-alpha' })).not.toBeNull();
    expect(list.getByRole('option', { name: 'model-beta' })).not.toBeNull();
    expect(modelInput().value).toBe('legacy-model');
    expect(mocked.onChange).not.toHaveBeenCalled();
  });

  test('filters after typing and writes back the selected full model ID', async () => {
    mocked.affineFetch.mockResolvedValueOnce(
      modelsResponse(['vendor/model-alpha', 'vendor/model-beta'])
    );
    render(<ModelInputHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Get models' }));
    await screen.findByRole('option', { name: 'vendor/model-alpha' });

    fireEvent.change(modelInput(), { target: { value: 'beta' } });

    expect(mocked.onChange).toHaveBeenLastCalledWith('beta');
    expect(
      screen.queryByRole('option', { name: 'vendor/model-alpha' })
    ).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'vendor/model-beta' }));

    expect(mocked.onChange).toHaveBeenLastCalledWith('vendor/model-beta');
    expect(modelInput().value).toBe('vendor/model-beta');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('supports manual model IDs before fetching and when no option matches', async () => {
    mocked.affineFetch.mockResolvedValueOnce(modelsResponse(['model-alpha']));
    render(<ModelInputHarness />);
    fireEvent.change(modelInput(), {
      target: { value: 'custom/manual-model' },
    });

    expect(mocked.onChange).toHaveBeenLastCalledWith('custom/manual-model');
    expect(modelInput().value).toBe('custom/manual-model');
    expect(mocked.affineFetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Get models' }));
    await screen.findByRole('option', { name: 'model-alpha' });
    fireEvent.change(modelInput(), {
      target: { value: 'another/manual-model' },
    });

    expect(
      screen.getByText('No matching models. You can enter a model ID manually.')
    ).not.toBeNull();
    expect(screen.queryByRole('option')).toBeNull();
    expect(modelInput().value).toBe('another/manual-model');
    expect(mocked.onChange).toHaveBeenLastCalledWith('another/manual-model');
  });

  test('closes with Escape, reopens the list, and selects with the keyboard', async () => {
    mocked.affineFetch.mockResolvedValueOnce(
      modelsResponse(['model-alpha', 'model-beta'])
    );
    render(<ModelInputHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Get models' }));
    await screen.findByRole('listbox', { name: 'Available models' });

    fireEvent.keyDown(modelInput(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(mocked.onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Show model options' }));
    expect(
      screen.getByRole('listbox', { name: 'Available models' })
    ).not.toBeNull();
    fireEvent.change(modelInput(), { target: { value: 'beta' } });
    fireEvent.keyDown(modelInput(), { key: 'ArrowDown' });
    fireEvent.keyDown(modelInput(), { key: 'Enter' });

    expect(mocked.onChange).toHaveBeenLastCalledWith('model-beta');
    expect(modelInput().value).toBe('model-beta');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('keeps the configured model and manual input available when the list is empty', async () => {
    mocked.affineFetch.mockResolvedValueOnce(modelsResponse([]));
    render(<ModelInputHarness initialValue="legacy-model" />);
    fireEvent.click(screen.getByRole('button', { name: 'Get models' }));

    expect(
      await screen.findByText(
        'No models were returned. You can enter a model ID manually.'
      )
    ).not.toBeNull();
    expect(modelInput().value).toBe('legacy-model');
    expect(mocked.onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('option')).toBeNull();
    fireEvent.change(modelInput(), { target: { value: 'manual-model' } });
    expect(mocked.onChange).toHaveBeenLastCalledWith('manual-model');
  });

  test('shows a safe error and allows retrying without replacing the model', async () => {
    mocked.affineFetch
      .mockRejectedValueOnce(
        new Error('private upstream details test-draft-key')
      )
      .mockResolvedValueOnce(modelsResponse(['model-after-retry']));
    render(<ModelInputHarness initialValue="legacy-model" />);
    fireEvent.click(screen.getByRole('button', { name: 'Get models' }));

    expect(
      await screen.findByText(
        'Unable to fetch models. Check the API key and endpoint, then try again.'
      )
    ).not.toBeNull();
    expect(screen.queryByText(/private upstream details/)).toBeNull();
    expect(modelInput().value).toBe('legacy-model');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByRole('option', { name: 'model-after-retry' })
    ).not.toBeNull();
    expect(mocked.affineFetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(mocked.onChange).not.toHaveBeenCalled();
  });

  test('does not expose an unrecognized server error response', async () => {
    mocked.affineFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'private upstream response' }), {
        status: 500,
      })
    );
    render(<ModelInputHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Get models' }));

    expect(
      await screen.findByText(
        'Unable to fetch models. Check the API key and endpoint, then try again.'
      )
    ).not.toBeNull();
    expect(screen.queryByText(/private upstream response/)).toBeNull();
    expect(mocked.onChange).not.toHaveBeenCalled();
  });

  test.each([
    { apiKey: 'replacement-test-key' },
    { baseURL: 'https://other-models.example.com/v1' },
  ])('clears fetched options when credentials change: %o', async changed => {
    mocked.affineFetch.mockResolvedValueOnce(modelsResponse(['old-model']));
    const { rerender } = render(
      <ModelInputHarness initialValue="legacy-model" />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Get models' }));
    await screen.findByRole('option', { name: 'old-model' });

    rerender(<ModelInputHarness initialValue="legacy-model" {...changed} />);

    expect(screen.queryByRole('option', { name: 'old-model' })).toBeNull();
    expect(screen.queryByText('1 models available.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Get models' })).not.toBeNull();
    expect(modelInput().value).toBe('legacy-model');
    expect(mocked.onChange).not.toHaveBeenCalled();
  });

  test('aborts an outdated request and ignores it even if it resolves after the new request', async () => {
    const oldRequest = deferredResponse();
    mocked.affineFetch
      .mockReturnValueOnce(oldRequest.promise)
      .mockResolvedValueOnce(modelsResponse(['new-model']));
    const { rerender } = render(<ModelInputHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Get models' }));
    const oldSignal = mocked.affineFetch.mock.calls[0][1]?.signal;

    rerender(<ModelInputHarness apiKey="replacement-test-key" />);

    expect(oldSignal?.aborted).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Get models' }));
    await screen.findByRole('option', { name: 'new-model' });
    expect(
      JSON.parse(String(mocked.affineFetch.mock.calls[1][1]?.body)).apiKey
    ).toBe('replacement-test-key');

    await act(async () => {
      oldRequest.resolve(modelsResponse(['stale-model']));
    });

    expect(screen.getByRole('option', { name: 'new-model' })).not.toBeNull();
    expect(screen.queryByRole('option', { name: 'stale-model' })).toBeNull();
    expect(mocked.onChange).not.toHaveBeenCalled();
  });

  test('aborts on unmount and ignores a late successful response', async () => {
    const request = deferredResponse();
    mocked.affineFetch.mockReturnValueOnce(request.promise);
    const { unmount, container } = render(<ModelInputHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Get models' }));
    const signal = mocked.affineFetch.mock.calls[0][1]?.signal;

    unmount();

    expect(signal?.aborted).toBe(true);
    await act(async () => {
      request.resolve(modelsResponse(['late-model']));
    });
    expect(container.childElementCount).toBe(0);
    expect(mocked.onChange).not.toHaveBeenCalled();
  });

  test.each([
    { apiKey: '' },
    { baseURL: '' },
    { apiKey: '   ' },
    { baseURL: '   ' },
  ])('disables fetching when credentials are incomplete: %o', credentials => {
    render(<ModelInputHarness {...credentials} />);
    const button = screen.getByRole('button', { name: 'Get models' });

    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.click(button);
    expect(mocked.affineFetch).not.toHaveBeenCalled();
    fireEvent.change(modelInput(), { target: { value: 'manual-model' } });
    expect(mocked.onChange).toHaveBeenLastCalledWith('manual-model');
  });

  test('uses Chinese labels and translates fetch failure feedback', async () => {
    setLocale('zh');
    mocked.affineFetch.mockRejectedValueOnce(
      new Error('private upstream error')
    );
    render(<ModelInputHarness />);

    expect(screen.getByRole('combobox', { name: '默认模型' })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '获取模型' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '重试' })).not.toBeNull();
    });
    expect(
      screen.queryByText(
        'Unable to fetch models. Check the API key and endpoint, then try again.'
      )
    ).toBeNull();
    expect(screen.queryByText('private upstream error')).toBeNull();
  });
});
