import { afterEach, describe, expect, test } from 'vitest';

import { getLocale, setLocale, t, translateConfigDesc } from './index';
import { UI_ZH } from './zh';

const initialLocale = getLocale();

afterEach(() => {
  setLocale(initialLocale);
});

describe('t', () => {
  test('returns the original text when locale is en', () => {
    setLocale('en');
    expect(t('Save Changes')).toBe('Save Changes');
  });

  test('returns the translation when locale is zh and the entry exists', () => {
    setLocale('zh');
    UI_ZH['__test_only__'] = '测试';
    try {
      expect(t('__test_only__')).toBe('测试');
    } finally {
      delete UI_ZH['__test_only__'];
    }
  });

  test('falls back to the English source for unknown strings', () => {
    setLocale('zh');
    expect(t('Some brand new copy that is not translated')).toBe(
      'Some brand new copy that is not translated'
    );
  });

  test('interpolates {name} placeholders in both locales', () => {
    setLocale('en');
    expect(t('{count} members', { count: 3 })).toBe('3 members');
    setLocale('zh');
    UI_ZH['{count} members'] = '{count} 位成员';
    try {
      expect(t('{count} members', { count: 3 })).toBe('3 位成员');
    } finally {
      delete UI_ZH['{count} members'];
    }
  });

  test('leaves unknown placeholders untouched', () => {
    setLocale('en');
    expect(t('{count} members')).toBe('{count} members');
  });
});

describe('translateConfigDesc', () => {
  test('falls back to the generated English desc for unknown fields', () => {
    setLocale('zh');
    expect(translateConfigDesc('nonexistent/field', 'English desc')).toBe(
      'English desc'
    );
  });

  test('returns the English desc when locale is en', () => {
    setLocale('en');
    expect(translateConfigDesc('server/name', 'English desc')).toBe(
      'English desc'
    );
  });
});
