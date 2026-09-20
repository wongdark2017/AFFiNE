/**
 * @vitest-environment happy-dom
 */
import {
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
  notifySuccess: vi.fn(),
}));

vi.mock('@affine/admin/use-query', () => ({
  useQuery: () => ({
    data: { appConfig: mocked.appConfig },
    mutate: vi.fn(),
  }),
}));

vi.mock('@affine/admin/use-mutation', () => ({
  useMutation: () => ({ trigger: mocked.saveUpdates }),
}));

vi.mock('@affine/component', () => ({
  notify: { success: mocked.notifySuccess, error: vi.fn() },
}));

import { CopilotSettings } from './copilot-settings';
import { useAppConfig } from './use-app-config';

function SettingsHarness() {
  const settings = useAppConfig();
  return (
    <>
      <CopilotSettings
        key={settings.getGroupVersion('copilot')}
        config={settings.patchedAppConfig.copilot}
        onChange={settings.update}
      />
      <button
        disabled={!settings.isGroupDirty('copilot')}
        onClick={() => {
          settings.saveGroup('copilot').catch(() => {});
        }}
      >
        Save AI settings
      </button>
      <button onClick={() => settings.resetGroup('copilot')}>
        Cancel AI settings
      </button>
    </>
  );
}

const initialLocale = getLocale();
const relayGroup = () =>
  within(screen.getByRole('group', { name: 'OpenAI-compatible API' }));

describe('CopilotSettings', () => {
  beforeEach(() => {
    setLocale('en');
    mocked.saveUpdates.mockReset();
    mocked.notifySuccess.mockReset();
    mocked.saveUpdates.mockResolvedValue({ updateAppConfig: {} });
    mocked.appConfig = {
      copilot: {
        enabled: true,
        providers: {
          openaiCompatible: {
            apiKey: 'test-secret',
            baseURL: 'http://localhost:11434/v1',
            defaultModel: 'test-model',
            reasoningSupported: true,
            futureOption: { keep: true },
          },
          openai: { apiKey: '', baseURL: 'https://api.openai.com/v1' },
          gemini: { apiKey: '' },
          anthropic: { apiKey: '' },
          fal: { apiKey: '' },
        },
        unsplash: { key: '' },
        exa: { key: '' },
        storage: {
          provider: 'aws-s3',
          bucket: 'test-bucket',
          config: {
            endpoint: 'https://s3.example.com',
            region: 'test-region',
            credentials: {
              accessKeyId: 'test-access-id',
              secretAccessKey: 'test-storage-secret',
              sessionToken: 'test-session-token',
            },
            futureStorageOption: true,
          },
        },
      },
    };
  });

  afterEach(() => {
    cleanup();
    setLocale(initialLocale);
  });

  test('shows named fields and masks keys without changing the configuration', () => {
    const { container } = render(<SettingsHarness />);
    const relay = relayGroup();
    const key = relay.getByLabelText('API key') as HTMLInputElement;

    expect(container.querySelector('textarea')).toBeNull();
    expect(key.type).toBe('password');
    expect(key.value).toBe('test-secret');
    expect(
      (relay.getByLabelText('Default model') as HTMLInputElement).value
    ).toBe('test-model');

    fireEvent.click(relay.getByRole('button', { name: 'Show API key' }));
    expect(key.type).toBe('text');
    fireEvent.click(relay.getByRole('button', { name: 'Hide API key' }));
    expect(key.type).toBe('password');
    expect(
      screen
        .getByRole('button', { name: 'Save AI settings' })
        .hasAttribute('disabled')
    ).toBe(true);
  });

  test('saves edits and an empty key while preserving unexposed provider settings', async () => {
    render(<SettingsHarness />);
    const relay = relayGroup();

    fireEvent.change(relay.getByLabelText('API endpoint'), {
      target: { value: 'http://localhost:8000/v1' },
    });
    fireEvent.change(relay.getByLabelText('Default model'), {
      target: { value: 'another-model' },
    });
    fireEvent.change(relay.getByLabelText('API key'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save AI settings' }));

    await waitFor(() => expect(mocked.saveUpdates).toHaveBeenCalledTimes(1));
    expect(mocked.saveUpdates).toHaveBeenCalledWith({
      updates: [
        {
          module: 'copilot',
          key: 'providers.openaiCompatible',
          value: {
            apiKey: '',
            baseURL: 'http://localhost:8000/v1',
            defaultModel: 'another-model',
            reasoningSupported: true,
            futureOption: { keep: true },
          },
        },
      ],
    });
    expect(mocked.appConfig.copilot.providers.openaiCompatible.apiKey).toBe(
      'test-secret'
    );
  });

  test('cancel restores saved values and hides a revealed key', () => {
    render(<SettingsHarness />);
    fireEvent.click(relayGroup().getByRole('button', { name: 'Show API key' }));
    fireEvent.change(relayGroup().getByLabelText('API key'), {
      target: { value: 'edited-secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel AI settings' }));

    const key = relayGroup().getByLabelText('API key') as HTMLInputElement;
    expect(key.value).toBe('test-secret');
    expect(key.type).toBe('password');
    expect(
      screen
        .getByRole('button', { name: 'Save AI settings' })
        .hasAttribute('disabled')
    ).toBe(true);
  });

  test('updates a nested storage secret without losing sibling credentials or options', async () => {
    render(<SettingsHarness />);
    const key = screen.getByLabelText('Secret access key') as HTMLInputElement;
    expect(key.type).toBe('password');
    fireEvent.change(key, { target: { value: 'replacement-storage-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save AI settings' }));

    await waitFor(() => expect(mocked.saveUpdates).toHaveBeenCalledTimes(1));
    expect(mocked.saveUpdates).toHaveBeenCalledWith({
      updates: [
        {
          module: 'copilot',
          key: 'storage',
          value: {
            ...mocked.appConfig.copilot.storage,
            config: {
              ...mocked.appConfig.copilot.storage.config,
              credentials: {
                accessKeyId: 'test-access-id',
                secretAccessKey: 'replacement-storage-secret',
                sessionToken: 'test-session-token',
              },
            },
          },
        },
      ],
    });
  });

  test('renders local storage fields and Chinese labels without needing provider credentials', () => {
    setLocale('zh');
    mocked.appConfig.copilot.storage = {
      provider: 'fs',
      bucket: 'copilot',
      config: { path: '/tmp/affine-test-storage' },
    };
    const { container } = render(<SettingsHarness />);
    expect(screen.queryByLabelText('Secret access key')).toBeNull();
    expect(container.querySelector('textarea')).toBeNull();
    expect(screen.getByDisplayValue('/tmp/affine-test-storage')).not.toBeNull();
    expect(screen.queryByText('Default model')).toBeNull();
  });

  test('clearing the optional S3 endpoint restores automatic endpoint selection', async () => {
    render(<SettingsHarness />);
    expect(
      screen
        .getByLabelText('Sign upload content type')
        .getAttribute('aria-checked')
    ).toBe('true');
    fireEvent.change(screen.getByLabelText('Storage endpoint (optional)'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save AI settings' }));
    await waitFor(() => expect(mocked.saveUpdates).toHaveBeenCalledTimes(1));
    const serialized = JSON.parse(
      JSON.stringify(mocked.saveUpdates.mock.calls[0][0])
    );
    expect(serialized.updates[0].value.config).not.toHaveProperty('endpoint');
    expect(serialized.updates[0].value.config.region).toBe('test-region');
  });

  test('selecting the default R2 jurisdiction removes the EU override', async () => {
    mocked.appConfig.copilot.storage = {
      provider: 'cloudflare-r2',
      bucket: 'test-bucket',
      config: { accountId: 'test-account', jurisdiction: 'eu' },
    };
    render(<SettingsHarness />);
    expect((screen.getByLabelText('Region') as HTMLInputElement).value).toBe(
      'auto'
    );
    expect(screen.queryByLabelText('Use path-style addressing')).toBeNull();
    fireEvent.click(screen.getByText('AI file storage (advanced)'));
    fireEvent.keyDown(screen.getByLabelText('Jurisdiction'), {
      key: 'ArrowDown',
    });
    fireEvent.click(screen.getByRole('option', { name: 'Default' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save AI settings' }));
    await waitFor(() => expect(mocked.saveUpdates).toHaveBeenCalledTimes(1));
    const serialized = JSON.parse(
      JSON.stringify(mocked.saveUpdates.mock.calls[0][0])
    );
    expect(serialized.updates[0].value.config).toEqual({
      accountId: 'test-account',
    });
  });
});
