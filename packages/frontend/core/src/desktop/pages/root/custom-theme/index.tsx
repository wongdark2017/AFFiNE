import { EditorSettingService } from '@affine/core/modules/editor-setting';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { ThemeEditorService } from '@affine/core/modules/theme-editor';
import type {
  CustomTheme,
  EditorThemeMode,
} from '@affine/core/modules/theme-editor/types';
import { useLiveData, useServices } from '@toeverything/infra';
import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

const editorOverrideRules = `
.page-editor-container[data-theme='light'] {}
.page-editor-container[data-theme='dark'] {}
`;

const emptyCustomTheme: CustomTheme = { light: {}, dark: {} };

const getEditorOverrideRule = (
  styleElement: HTMLStyleElement,
  mode: EditorThemeMode
) => {
  const sheet = styleElement.sheet;
  const ruleIndex = mode === 'light' ? 0 : 1;
  const rule = sheet?.cssRules.item(ruleIndex);
  return rule instanceof CSSStyleRule ? rule : null;
};

const updateEditorOverrideRules = (
  styleElement: HTMLStyleElement,
  customTheme: CustomTheme
) => {
  (['light', 'dark'] as const).forEach(mode => {
    const rule = getEditorOverrideRule(styleElement, mode);
    if (!rule) return;

    Array.from(rule.style).forEach(property =>
      rule.style.removeProperty(property)
    );
    Object.entries(customTheme[mode]).forEach(([property, value]) => {
      if (property.startsWith('--') && value) {
        rule.style.setProperty(property, value);
      }
    });
  });
};

export const CustomThemeModifier = () => {
  const { themeEditorService, featureFlagService, editorSettingService } =
    useServices({
      ThemeEditorService,
      FeatureFlagService,
      EditorSettingService,
    });
  const enableThemeEditor = useLiveData(
    featureFlagService.flags.enable_theme_editor.$
  );
  const customTheme =
    useLiveData(themeEditorService.customTheme$) ?? emptyCustomTheme;
  const importedThemeCss = useLiveData(themeEditorService.importedThemeCss$);
  const settings = useLiveData(editorSettingService.editorSetting.settings$);
  const overrideStyleRef = useRef<HTMLStyleElement>(null);
  const appliedVariableKeysRef = useRef(new Set<string>());
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const rootStyle = document.documentElement.style;
    const appliedVariableKeys = appliedVariableKeysRef.current;

    appliedVariableKeys.forEach(property => rootStyle.removeProperty(property));
    appliedVariableKeys.clear();

    if (!enableThemeEditor) return;

    const mode = resolvedTheme === 'dark' ? 'dark' : 'light';
    Object.entries(customTheme[mode]).forEach(([property, value]) => {
      if (!value) return;
      rootStyle.setProperty(property, value);
      appliedVariableKeys.add(property);
    });

    return () => {
      appliedVariableKeys.forEach(property =>
        rootStyle.removeProperty(property)
      );
      appliedVariableKeys.clear();
    };
  }, [customTheme, enableThemeEditor, resolvedTheme]);

  useEffect(() => {
    const styleElement = overrideStyleRef.current;
    if (!enableThemeEditor || !styleElement) return;
    updateEditorOverrideRules(styleElement, customTheme);
  }, [customTheme, enableThemeEditor]);

  // Apply font size CSS variable when settings change
  useEffect(() => {
    if (settings.fontSize) {
      document.documentElement.style.setProperty(
        '--affine-font-base',
        `${settings.fontSize}px`
      );
    }
  }, [settings.fontSize]);

  if (!enableThemeEditor) return null;

  const importedCss = [
    importedThemeCss.light?.enabled ? importedThemeCss.light.sanitizedCss : '',
    importedThemeCss.dark?.enabled ? importedThemeCss.dark.sanitizedCss : '',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <>
      <style data-affine-editor-theme-import>{importedCss}</style>
      <style data-affine-editor-theme-overrides ref={overrideStyleRef}>
        {editorOverrideRules}
      </style>
    </>
  );
};
