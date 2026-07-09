# 自定义 @lit/react 包装

官方 @lit/react 的 createComponent 在 lit 的 `connectedCallback` 生命周期中访问属性时存在问题。
