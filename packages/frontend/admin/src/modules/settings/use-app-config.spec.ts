/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocked = vi.hoisted(() => {
  let queryState: {
    appConfig: {
      server: {
        name: string;
        hosts: string[];
      };
      auth: {
        allowSignup: boolean;
      };
      storages: {
        blob: {
          storage: {
            provider: string;
            config?: { region: string; requestTimeoutMs?: number };
          };
        };
      };
    };
  } = {
    appConfig: {
      server: {
        name: '',
        hosts: [],
      },
      auth: {
        allowSignup: true,
      },
      storages: {
        blob: {
          storage: {
            provider: 'fs',
          },
        },
      },
    },
  };

  return {
    getQueryState: () => queryState,
    setQueryState: (next: typeof queryState) => {
      queryState = next;
    },
    mutateMock: vi.fn(),
    saveUpdatesMock: vi.fn(),
    notifySuccessMock: vi.fn(),
    notifyErrorMock: vi.fn(),
  };
});

vi.mock('@affine/admin/use-query', () => ({
  useQuery: () => ({
    data: mocked.getQueryState(),
    mutate: mocked.mutateMock,
  }),
}));

vi.mock('@affine/admin/use-mutation', () => ({
  useMutation: () => ({
    trigger: mocked.saveUpdatesMock,
  }),
}));

vi.mock('@affine/component', () => ({
  notify: {
    success: mocked.notifySuccessMock,
    error: mocked.notifyErrorMock,
  },
}));

import { useAppConfig } from './use-app-config';

describe('useAppConfig', () => {
  beforeEach(() => {
    mocked.setQueryState({
      appConfig: {
        server: {
          name: 'AFFiNE',
          hosts: ['localhost'],
        },
        auth: {
          allowSignup: true,
        },
        storages: {
          blob: {
            storage: {
              provider: 'fs',
            },
          },
        },
      },
    });

    mocked.mutateMock.mockReset();
    mocked.saveUpdatesMock.mockReset();
    mocked.notifySuccessMock.mockReset();
    mocked.notifyErrorMock.mockReset();

    mocked.mutateMock.mockImplementation(async updater => {
      const currentState = mocked.getQueryState();
      if (typeof updater === 'function') {
        mocked.setQueryState(updater(currentState));
      }
      return mocked.getQueryState();
    });
  });

  test('clears dirty state when value is changed back to original', () => {
    const { result } = renderHook(() => useAppConfig());

    act(() => {
      result.current.update('server/name', 'AFFiNE Cloud');
    });
    expect(result.current.isGroupDirty('server')).toBe(true);

    act(() => {
      result.current.update('server/name', 'AFFiNE');
    });
    expect(result.current.isGroupDirty('server')).toBe(false);
  });

  test('resetGroup cancels only target group changes immediately', () => {
    const { result } = renderHook(() => useAppConfig());

    act(() => {
      result.current.update('server/name', 'AFFiNE Cloud');
      result.current.update('auth/allowSignup', false);
    });

    expect(result.current.isGroupDirty('server')).toBe(true);
    expect(result.current.isGroupDirty('auth')).toBe(true);

    act(() => {
      result.current.resetGroup('server');
    });

    expect(result.current.isGroupDirty('server')).toBe(false);
    expect(result.current.isGroupDirty('auth')).toBe(true);
    expect(result.current.patchedAppConfig.server.name).toBe('AFFiNE');
    expect(result.current.getGroupVersion('server')).toBe(1);
  });

  test('saveGroup submits only target group updates and keeps others dirty', async () => {
    const { result } = renderHook(() => useAppConfig());

    act(() => {
      result.current.update('server/name', 'AFFiNE Cloud');
      result.current.update('auth/allowSignup', false);
    });

    mocked.saveUpdatesMock.mockResolvedValue({
      updateAppConfig: {
        server: {
          name: 'AFFiNE Cloud',
        },
      },
    });

    await act(async () => {
      await result.current.saveGroup('server');
    });

    expect(mocked.saveUpdatesMock).toHaveBeenCalledWith({
      updates: [
        {
          module: 'server',
          key: 'name',
          value: 'AFFiNE Cloud',
        },
      ],
    });
    expect(result.current.isGroupDirty('server')).toBe(false);
    expect(result.current.isGroupDirty('auth')).toBe(true);
    expect(result.current.patchedAppConfig.server.name).toBe('AFFiNE Cloud');
    expect(result.current.getGroupVersion('server')).toBe(1);
    expect(mocked.notifySuccessMock).toHaveBeenCalledTimes(1);
  });

  test('marks group dirty when nested enum-like option changes', () => {
    const { result } = renderHook(() => useAppConfig());

    act(() => {
      result.current.update('storages/blob.storage/provider', 'aws-s3');
    });

    expect(result.current.isGroupDirty('storages')).toBe(true);
  });

  test.each(['save', 'saveGroup'] as const)(
    '%s replaces saved objects so clearing optional fields survives later edits',
    async saveMethod => {
      const query = mocked.getQueryState();
      query.appConfig.storages.blob.storage.config = {
        region: 'test-region',
        requestTimeoutMs: 30000,
      };
      const { result } = renderHook(() => useAppConfig());
      act(() => {
        result.current.update(
          'storages/blob.storage/config.requestTimeoutMs',
          undefined
        );
      });
      // JSON serialization omits cleared optional properties.
      mocked.saveUpdatesMock.mockResolvedValue({
        updateAppConfig: {
          storages: {
            blob: {
              storage: { provider: 'fs', config: { region: 'test-region' } },
            },
          },
        },
      });
      await act(async () => {
        if (saveMethod === 'saveGroup') {
          await result.current.saveGroup('storages');
        } else {
          await result.current.save();
        }
      });
      expect(
        mocked.getQueryState().appConfig.storages.blob.storage.config
      ).not.toHaveProperty('requestTimeoutMs');
      expect(
        result.current.patchedAppConfig.storages.blob.storage.config
      ).not.toHaveProperty('requestTimeoutMs');

      act(() => {
        result.current.update('storages/blob.storage/provider', 'aws-s3');
      });
      expect(result.current.updates['storages.blob.storage'].to).toEqual({
        provider: 'aws-s3',
        config: { region: 'test-region' },
      });
    }
  );
});
