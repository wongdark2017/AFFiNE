import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const panel = style({
  width: 0,
  flex: 1,
  overflowY: 'auto',
  padding: 32,
});

export const panelContent = style({
  width: '100%',
  maxWidth: 840,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
});

export const panelHeader = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
});

export const panelTitle = style({
  margin: 0,
  color: cssVar('textPrimaryColor'),
  fontSize: cssVar('fontH4'),
  lineHeight: 1.3,
});

export const panelDescription = style({
  margin: 0,
  color: cssVar('textSecondaryColor'),
  fontSize: cssVar('fontSm'),
  lineHeight: 1.5,
});

export const cards = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 16,
  alignItems: 'start',
});

export const card = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  minWidth: 0,
  padding: 20,
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: 12,
  background: cssVarV2('layer/background/primary'),
});

export const cardHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
});

export const cardTitle = style({
  margin: 0,
  color: cssVar('textPrimaryColor'),
  fontSize: cssVar('fontBase'),
  fontWeight: 600,
});

export const switchLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: cssVar('textSecondaryColor'),
  fontSize: cssVar('fontSm'),
});

export const fileInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minHeight: 62,
  padding: 12,
  borderRadius: 8,
  background: cssVarV2('layer/background/secondary'),
});

export const fileName = style({
  overflow: 'hidden',
  color: cssVar('textPrimaryColor'),
  fontSize: cssVar('fontSm'),
  fontWeight: 500,
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const fileMetadata = style({
  color: cssVar('textSecondaryColor'),
  fontSize: cssVar('fontXs'),
  lineHeight: 1.5,
});

export const emptyFile = style({
  display: 'flex',
  alignItems: 'center',
  minHeight: 62,
  color: cssVar('textSecondaryColor'),
  fontSize: cssVar('fontSm'),
});

export const actions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
});

export const hiddenInput = style({
  display: 'none',
});

export const report = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  paddingTop: 16,
  borderTop: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const reportTitle = style({
  color: cssVar('textPrimaryColor'),
  fontSize: cssVar('fontSm'),
  fontWeight: 500,
});

export const reportGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
});

export const reportItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  color: cssVar('textSecondaryColor'),
  fontSize: cssVar('fontXs'),
});

export const reportValue = style({
  color: cssVar('textPrimaryColor'),
  fontSize: cssVar('fontSm'),
  fontWeight: 500,
});

export const warningDetails = style({
  color: cssVar('textSecondaryColor'),
  fontSize: cssVar('fontXs'),
});

export const warningSummary = style({
  cursor: 'pointer',
  userSelect: 'none',
});

export const warningList = style({
  maxHeight: 160,
  margin: '8px 0 0',
  paddingLeft: 20,
  overflowY: 'auto',
  lineHeight: 1.5,
});
