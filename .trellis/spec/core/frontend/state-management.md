# 状态管理 — `@affine/core`（最小）

## 观察到的技术栈

| 工具                               | 用途                                                                 |
| ---------------------------------- | -------------------------------------------------------------------- |
| `@toeverything/infra` 的 `Service` | 长生命周期协作者（`GraphQLService`、`AuthService`、`ServerService`） |
| `useService(Token)`                | 在 React 中解析服务                                                  |
| `useLiveData(observable$)`         | 订阅服务状态（如会话状态、服务端配置）                               |
| 本地 `useState`                    | 瞬时表单字段与对话框 UI                                              |

## GraphQL

`modules/cloud/services/graphql.ts` 中的 `GraphQLService.gql` / `rxGql` 是 core 模块访问云端操作的标准类型化客户端路径。

## 场景：版本化的本地编辑器主题 CSS 状态

### 1. Scope / Trigger

- 触发条件：功能把用户导入并净化后的编辑器 CSS 存入 `GlobalState`，且 Web 标签页或 Electron 窗口需要实时观察启用、停用、替换与清除。
- 作用域：设备/浏览器配置级，不属于工作区或云端同步数据；原始 CSS、字体和图片资源不得进入状态。

### 2. Signatures

```ts
type EditorThemeMode = 'light' | 'dark';

type CssImportReport = {
  sourceKind: 'affine' | 'typora' | 'generic';
  appliedRules: number;
  translatedRules: number;
  ignoredRules: number;
  rejectedDeclarations: number;
  warnings: string[];
};

type ImportedEditorStylesheet = {
  fileName: string;
  byteLength: number;
  importedAt: number;
  enabled: boolean;
  sanitizedCss: string;
  report: CssImportReport;
};

type ImportedEditorThemeState = {
  version: 1;
  light?: ImportedEditorStylesheet;
  dark?: ImportedEditorStylesheet;
};

class ThemeEditorService {
  importedThemeCss$: LiveData<ImportedEditorThemeState>;
  activeImportedCss$: LiveData<Partial<Record<EditorThemeMode, string>>>;
  saveImportedCss(mode: EditorThemeMode, stylesheet: ImportedEditorStylesheet): void;
  setImportedCssEnabled(mode: EditorThemeMode, enabled: boolean): void;
  clearImportedCss(mode: EditorThemeMode): void;
}
```

### 3. Contracts

- 固定存储键：`custom-editor-theme-css-v1`；每次写入都必须是完整的 `{ version: 1, light?, dark? }`。
- 文件入口先验证 `.css`、读取 UTF-8，并在调用 Service 前完成净化；Service 只接收和持久化 `sanitizedCss` 与元数据，不保存源 CSS。
- 源文件最大 `512 * 1024` 字节；净化结果最大 `1024 * 1024` 字节。
- `activeImportedCss$` 只投影 `enabled === true` 的槽位；替换一个槽位不得改变另一槽位。
- `GlobalState.watch()` 是 Web/Electron 多窗口同步来源。清除必须对剩余完整状态调用 `GlobalState.set()`；不要使用 `del()`，当前删除路径不能可靠唤醒所有现有 watcher。
- 转换失败时不得调用 `saveImportedCss`；持久化抛错时对外转换为 `persistence-failure`，已有有效状态和运行时样式保持不变。

### 4. Validation & Error Matrix

| 条件                        | 结果                                            |
| --------------------------- | ----------------------------------------------- |
| 扩展名不是 `.css`           | `invalid-extension`；不写状态                   |
| 文件大于 512 KiB            | `oversize`；不写状态                            |
| 不是合法 UTF-8              | `unreadable-text`；不写状态                     |
| CSS 解析失败                | `parse-failure`；保留旧槽位                     |
| 没有可支持的正文规则        | `zero-supported-rules`；保留旧槽位              |
| 净化输出大于 1 MiB          | `oversize`；保留旧槽位                          |
| 持久化失败                  | `persistence-failure`；LiveData 保持旧值        |
| 版本不是 `1` 或槽位结构无效 | 读取时降级为 `{ version: 1 }`，不得执行其中 CSS |

### 5. Good / Base / Bad Cases

- Good：浅色槽已有有效主题时，深色主题验证成功后写入完整双槽状态；两个窗口都收到更新。
- Base：停用槽位只把 `enabled` 改为 `false`，保留文件名、报告和净化 CSS，`activeImportedCss$` 不再返回该模式。
- Bad：新文件解析失败后先清空旧槽位，或把未净化源 CSS 写入 GlobalState；这会破坏原子替换和运行时安全边界。

### 6. Tests Required

- 单元：空存储投影为 `{ version: 1 }`；断言 light/dark 独立保存、替换和启停。
- 单元：无效版本/槽位结构不得出现在 `activeImportedCss$`。
- 单元：解析、大小、零支持规则失败后，断言旧 `fileName` 与 `sanitizedCss` 不变。
- 单元：模拟 `GlobalState.set()` 抛错，断言错误码为 `persistence-failure` 且 LiveData 未变化。
- 集成：清除 light 时 spy `set`/`del`，断言以 `{ version: 1, dark }` 调用 `set`，且从未调用 `del`。
- E2E：两个页面共享同一浏览器配置；在主题编辑器替换、停用或清除后，断言另一个页面无需刷新即可恢复内置主题。

### 7. Wrong vs Correct

#### Wrong

```ts
// 删除键可能不通知已打开的 Web/Electron watcher；源 CSS 也越过了净化边界。
globalState.del('custom-editor-theme-css-v1');
globalState.set('custom-editor-theme-css-v1', { version: 1, light: sourceCss });
```

#### Correct

```ts
// normalizer 已成功，且 stylesheet.sanitizedCss 已通过 1 MiB 上限。
service.saveImportedCss('light', stylesheet);

// 清除仍写完整版本化状态，让所有现有 watcher 收到变更。
globalState.set('custom-editor-theme-css-v1', {
  version: 1,
  dark: previous.dark,
});
```

## 反模式

- 为已适合 infra Services 的功能新建全局 Redux/MobX store。
- 在 scope 内已有 `GraphQLService` 时，从 core 视图直接 `fetch('/graphql')`。
