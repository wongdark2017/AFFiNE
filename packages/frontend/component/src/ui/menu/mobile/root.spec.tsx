/**
 * @vitest-environment happy-dom
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type PropsWithChildren, useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';

vi.mock('@affine/i18n', () => ({
  useI18n: () => ({ 'com.affine.backButton': () => 'Back' }),
}));
vi.mock('../../modal', () => ({
  Modal: ({ open, children }: PropsWithChildren<{ open: boolean }>) =>
    open ? <div role="dialog">{children}</div> : null,
}));
vi.mock('../../../utils', () => ({ observeResize: () => () => {} }));

import { MobileMenu } from './root';

afterEach(cleanup);

test('controlled menu can reopen after its content closes it through the parent', () => {
  function ControlledMenu() {
    const [open, setOpen] = useState(false);
    return (
      <MobileMenu
        rootOptions={{ open, onOpenChange: setOpen }}
        items={
          <button onClick={() => setOpen(false)}>Close from content</button>
        }
      >
        <button>Switch workspace</button>
      </MobileMenu>
    );
  }
  render(<ControlledMenu />);
  fireEvent.click(screen.getByRole('button', { name: 'Switch workspace' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Close from content' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Switch workspace' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
});
