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
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { getLocale, setLocale } from '../../i18n';
import type { AppConfig } from './config';

const mocked = vi.hoisted(() => ({
  appConfig: {} as AppConfig,
  saveUpdates: vi.fn(),
  mutate: vi.fn(),
  affineFetch: vi.fn<typeof fetch>(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('@affine/admin/use-query', () => ({
  useQuery: () => ({
    data: { appConfig: mocked.appConfig },
    mutate: mocked.mutate,
  }),
}));
vi.mock('@affine/admin/use-mutation', () => ({
  useMutation: () => ({ trigger: mocked.saveUpdates }),
}));
vi.mock('@affine/admin/fetch-utils', () => ({
  affineFetch: mocked.affineFetch,
}));
vi.mock('@affine/component', () => ({
  notify: { success: mocked.notifySuccess, error: mocked.notifyError },
}));
vi.mock('../header', () => ({
  Header: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

import { SettingsPage } from './index';

const initialLocale = getLocale();
const relayGroup = () =>
  within(screen.getByRole('group', { name: 'OpenAI-compatible API' }));
const jsonResponse = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });

function openAISettings() {
  render(<SettingsPage />);
  fireEvent.click(
    screen.getByRole('button', { name: 'AI Manage ai settings' })
  );
}

describe('AI settings in SettingsPage', () => {
  beforeEach(() => {
    setLocale('en');
    vi.clearAllMocks();
    mocked.appConfig = {
      copilot: {
        enabled: true,
        providers: {
          openaiCompatible: {
            apiKey: 'saved-test-secret',
            baseURL: 'https://saved.example.com/v1',
            defaultModel: 'saved-model',
            futureOption: { keep: true },
          },
        },
        storage: {
          provider: 'fs',
          bucket: 'copilot',
          config: { path: '/tmp' },
        },
      },
    };
    mocked.mutate.mockImplementation(async updater => {
      mocked.appConfig = updater({ appConfig: mocked.appConfig }).appConfig;
      return { appConfig: mocked.appConfig };
    });
    mocked.saveUpdates.mockReset();
    mocked.affineFetch.mockReset();
  });

  afterEach(() => {
    cleanup();
    setLocale(initialLocale);
    vi.restoreAllMocks();
  });

  test('uses draft credentials for both actions, saves the selection, and cancels subsequent changes', async () => {
    mocked.affineFetch
      .mockResolvedValueOnce(jsonResponse({ models: ['selected-model'] }))
      .mockResolvedValueOnce(
        jsonResponse({ model: 'selected-model', latencyMs: 120 })
      );
    openAISettings();
    const relay = relayGroup();
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save.hasAttribute('disabled')).toBe(true);
    expect(relay.queryByRole('textbox', { name: /JSON/ })).toBeNull();

    fireEvent.change(relay.getByLabelText('API key'), {
      target: { value: 'draft-test-secret' },
    });
    fireEvent.change(relay.getByLabelText('API endpoint'), {
      target: { value: 'https://draft.example.com/v1' },
    });
    fireEvent.click(relay.getByRole('button', { name: 'Get models' }));
    fireEvent.click(
      await relay.findByRole('option', { name: 'selected-model' })
    );
    fireEvent.click(relay.getByRole('button', { name: 'Test connection' }));
    await relay.findByText('Connection successful.');

    expect(mocked.affineFetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/copilot/admin/models',
      '/api/copilot/admin/test-connection',
    ]);
    expect(
      mocked.affineFetch.mock.calls.map(([, options]) =>
        JSON.parse(String(options?.body))
      )
    ).toEqual([
      { apiKey: 'draft-test-secret', baseURL: 'https://draft.example.com/v1' },
      {
        apiKey: 'draft-test-secret',
        baseURL: 'https://draft.example.com/v1',
        defaultModel: 'selected-model',
      },
    ]);
    expect(mocked.saveUpdates).not.toHaveBeenCalled();
    const savedProvider = {
      apiKey: 'draft-test-secret',
      baseURL: 'https://draft.example.com/v1',
      defaultModel: 'selected-model',
      futureOption: { keep: true },
    };
    mocked.saveUpdates.mockResolvedValueOnce({
      updateAppConfig: {
        copilot: { providers: { openaiCompatible: savedProvider } },
      },
    });
    fireEvent.click(save);
    await waitFor(() => expect(mocked.notifySuccess).toHaveBeenCalledOnce());

    expect(mocked.saveUpdates).toHaveBeenCalledWith({
      updates: [
        {
          module: 'copilot',
          key: 'providers.openaiCompatible',
          value: savedProvider,
        },
      ],
    });
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(relayGroup().queryByText('Connection successful.')).toBeNull();

    fireEvent.click(relayGroup().getByRole('button', { name: 'Show API key' }));
    fireEvent.change(relayGroup().getByLabelText('API key'), {
      target: { value: 'discarded-test-secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const key = relayGroup().getByLabelText<HTMLInputElement>('API key');
    expect(key.value).toBe('draft-test-secret');
    expect(key.type).toBe('password');
    expect(
      relayGroup().getByLabelText<HTMLInputElement>('Default model').value
    ).toBe('selected-model');
    expect(mocked.saveUpdates).toHaveBeenCalledOnce();
  });

  test.each(['success', 'failure'])(
    'protects all AI controls while saving and restores them after %s',
    async outcome => {
      let resolve!: (value: unknown) => void;
      let reject!: (reason: Error) => void;
      mocked.saveUpdates.mockReturnValueOnce(
        new Promise((resolvePromise, rejectPromise) => {
          resolve = resolvePromise;
          reject = rejectPromise;
        })
      );
      vi.spyOn(console, 'error').mockImplementation(() => {});
      openAISettings();
      fireEvent.change(relayGroup().getByLabelText('API key'), {
        target: { value: 'updated-test-secret' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      // Native fieldset disabling includes the key reveal, Radix switches,
      // model selector, and the two requests, not only the save buttons.
      for (const control of screen
        .getByRole('group', { name: 'OpenAI-compatible API' })
        .querySelectorAll('input, button')) {
        // happy-dom's :disabled only checks the element's own attribute.
        expect(control.closest('fieldset:disabled')).not.toBeNull();
      }

      await act(async () => {
        if (outcome === 'success') {
          resolve({
            updateAppConfig: {
              copilot: {
                providers: {
                  openaiCompatible: {
                    ...mocked.appConfig.copilot.providers.openaiCompatible,
                    apiKey: 'updated-test-secret',
                  },
                },
              },
            },
          });
        } else {
          reject(new Error('Save failed'));
        }
      });

      const key = relayGroup().getByLabelText<HTMLInputElement>('API key');
      expect(key.closest('fieldset:disabled')).toBeNull();
      expect(key.value).toBe('updated-test-secret');
      expect(key.type).toBe('password');
      expect(
        screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')
      ).toBe(outcome === 'success');
      if (outcome === 'failure') {
        expect(mocked.notifyError).toHaveBeenCalledOnce();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(
          relayGroup().getByLabelText<HTMLInputElement>('API key').value
        ).toBe('saved-test-secret');
      }
    }
  );
});
