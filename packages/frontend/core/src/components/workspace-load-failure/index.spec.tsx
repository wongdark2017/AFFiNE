/**
 * @vitest-environment happy-dom
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ButtonHTMLAttributes, ReactElement } from 'react';
import { afterEach, expect, test, vi } from 'vitest';

import en from '../../../../i18n/src/resources/en.json';

const copy = vi.hoisted(() => vi.fn());
vi.mock('@affine/core/utils/clipboard', () => ({ copyTextToClipboard: copy }));
vi.mock('@affine/i18n', () => ({
  useI18n: () =>
    new Proxy(
      {},
      { get: (_target, key) => () => en[key as keyof typeof en] ?? key }
    ),
}));
vi.mock('@affine/component', () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

import { WorkspaceLoadFailure } from './index';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('missing root offers explicit reload and switching without performing either automatically', () => {
  const onReload = vi.fn();
  const switcher = vi.fn((trigger: ReactElement) => trigger);
  render(
    <WorkspaceLoadFailure
      state={{ kind: 'missing-local-root' }}
      getDiagnostics={() => ({ workspaceId: 'root-test' })}
      onReload={onReload}
      renderWorkspaceSwitcher={switcher}
    />
  );
  expect(
    screen.getByRole('heading', { name: 'Unable to open this local workspace' })
  ).toBeTruthy();
  expect(onReload).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Switch workspace' })).toBeTruthy();
  fireEvent.click(
    screen.getByRole('button', { name: en['com.affine.error.reload'] })
  );
  expect(onReload).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Syncing...')).toBeNull();
});

test('timeout is described as unfinished loading, not as missing documents', () => {
  render(
    <WorkspaceLoadFailure
      state={{ kind: 'stalled' }}
      getDiagnostics={() => ({ workspaceId: 'root-test' })}
      renderWorkspaceSwitcher={trigger => trigger}
    />
  );
  expect(
    screen.getByRole('heading', { name: 'Workspace is taking longer to load' })
  ).toBeTruthy();
  expect(screen.queryByText('Unable to open this local workspace')).toBeNull();
});

test('copies only the provided safe diagnostics and shows recovery guidance', async () => {
  copy.mockResolvedValue(true);
  const diagnostic = { workspaceId: 'root-test', state: 'missing-local-root' };
  render(
    <WorkspaceLoadFailure
      state={{ kind: 'missing-local-root' }}
      getDiagnostics={() => diagnostic}
      renderWorkspaceSwitcher={trigger => trigger}
    />
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Copy diagnostic information' })
  );
  await waitFor(() =>
    expect(copy).toHaveBeenCalledWith(JSON.stringify(diagnostic, null, 2))
  );
  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toBe(
      'Diagnostic information copied'
    )
  );
  expect(screen.getByText('Recovery options')).toBeTruthy();
});

test('clipboard failure is visible without showing an exception or losing the reload action', async () => {
  copy.mockRejectedValue(new Error('private clipboard details'));
  render(
    <WorkspaceLoadFailure
      state={{ kind: 'load-error', code: 'read_failed' }}
      getDiagnostics={() => ({ workspaceId: 'root-test' })}
      renderWorkspaceSwitcher={trigger => trigger}
    />
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Copy diagnostic information' })
  );
  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toBe(
      'Could not copy diagnostic information'
    )
  );
  expect(screen.queryByText('private clipboard details')).toBeNull();
  expect(
    screen.getByRole('button', { name: en['com.affine.error.reload'] })
  ).toBeTruthy();
});
