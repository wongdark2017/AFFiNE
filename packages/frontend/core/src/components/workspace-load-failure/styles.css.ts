import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  minHeight: 0,
  overflowY: 'auto',
  padding: 24,
  color: cssVarV2('text/primary'),
});
export const content = style({
  maxWidth: 600,
  width: '100%',
  marginBlock: 'auto',
});
export const title = style({
  // This heading receives programmatic focus for announcement, not tab navigation.
  outline: 'none',
  fontSize: 24,
  lineHeight: 1.4,
  fontWeight: 600,
  margin: '0 0 16px',
});
export const description = style({
  color: cssVarV2('text/secondary'),
  fontSize: 15,
  lineHeight: 1.7,
  marginBottom: 24,
});
export const actions = style({ display: 'flex', flexWrap: 'wrap', gap: 12 });
export const copyStatus = style({
  minHeight: 24,
  fontSize: 13,
  color: cssVarV2('text/secondary'),
  marginBlock: 12,
});
export const recovery = style({
  fontSize: 14,
  lineHeight: 1.7,
  color: cssVarV2('text/secondary'),
});
export const recoverySummary = style({ cursor: 'pointer' });
