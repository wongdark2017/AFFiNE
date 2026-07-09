# @affine/templates

管理 AFFiNE 中使用的模板文件。目前仅支持 onboarding 模板。

## 如何更新

在提供更好方案之前，更新 onboarding 模板：

1. 本地运行 AFFiNE core（dev 模式）
2. 将 `ZipTransformer` 暴露到 window。例如：`import {ZipTransformer} from '@blocksuite/affine/blocks/root'; window.ZipTransformer = ZipTransformer;`
3. 运行下列脚本导出并替换模板资源（详见原流程中的 ZipTransformer.export 步骤）

更多细节见包内脚本与现有模板资源目录。
