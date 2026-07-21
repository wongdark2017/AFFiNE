# i18n

## 用法

- 将缺失翻译更新到基础资源，即 `src/resources/en.json`
- 用翻译键替换字面文案

```tsx
import { useI18n, LOCALES } from '@affine/i18n';
// src/resources/en.json
// {
//     'Text': 'some text',
//     'Switch to language': 'Switch to {{language}}', // <- 可用花括号插值
// };

const App = () => {
  const i18n = useI18n();
  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <div>
      <div>{i18n['Workspace Settings']()}</div>
      <>
        {LOCALES.map(option => {
          return (
            <button
              key={option.name}
              onClick={() => {
                changeLanguage(option.tag);
              }}
            >
              {option.originalName}
            </button>
          );
        })}
      </>
    </div>
  );
};
```

> 详细 API 与资源文件结构见包内源码与 `en.json`。
