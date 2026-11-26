# 01 · Linear Design Vault — AI Agent 复用提示词配方

把 `DESIGN.md` 与 `tokens.css` 放进新项目根目录后，直接复制下面的配方。

## 配方 A：纯血 Linear 工具型软件（任务台 / 后台 / 个人工作台）

```text
先完整阅读 design-vault/linear-01/DESIGN.md 并引入 tokens.css。
帮我做一个【填写主题】工具型 Web 应用：
1. 三栏骨架：Sidebar 232px | 高密度列表（行高 34px）| 右侧 Inspector 420px；
2. 层级只靠 LCH 亮度阶梯 + 1px hairline 区分，禁止卡片阴影和发光渐变；
3. 完整实现 DESIGN.md 第 6 节键盘契约（⌘K 命令面板、J/K、1–5 改状态、G+字母跳转、⌘Z 撤销、? 速查表）；
4. 所有修改乐观更新、同帧重绘，禁止给本地操作加 loading；
5. 输入框里的 Enter 必须做 IME 防误触（isComposing || keyCode===229）。
```

## 配方 B：基因混血（Linear 骨架 + Stripe 文档拆解）

```text
以 linear-01/DESIGN.md 的暗黑三栏与键盘契约为骨架，
Inspector 详情区借用 stripe-02/DESIGN.md 的“渐进式信息披露 + 代码面板联动”。
两套 Token 不得混用色值：外壳一律走 Linear Token，代码块可用 Stripe 深海蓝。
```

## 配方 C：给现有后台“Linear 化”改造审稿

```text
以 linear-01/DESIGN.md 为审查红线，打开浏览器截图当前页面，
逐条列出：鼠标独占功能、缺少 kbd 提示、阴影/渐变滥用、行高过松、对比度不足、本地操作带 loading 的问题，
然后按 tokens.css 重构并截图复验。
```
