# 02 · Stripe Design Vault — AI Agent 复用提示词配方

把 `DESIGN.md` 和 `tokens.css` 复制到任意新项目根目录后，直接用下面 3 套配方指挥 AI Agent（Antigravity / Claude Code / Cursor / v0）。

---

## 配方 A：纯血 Stripe 个人网站 / 技术作品库（最稳默认）

```text
请先完整阅读项目中的 `design-vault/stripe-02/DESIGN.md` 并直接引入 `tokens.css`。
我要做一个【填写你的主题】个人网站。要求：
1. 严格遵循 DESIGN.md 的视觉 polarity（浅色编辑正文 #FFFFFF/#F6F9FC + 深海蓝技术代码区 #0A2540）；
2. Hero 区保留流动多色 Mesh 背景与斜切过渡，右侧放一个可切换标签的实时技术预览台；
3. 每个条目采用三层渐进式信息披露：卡片扫读（L0）→ 原生 <details> 展开核心洞察（L1）→ 原生 <dialog> 双栏技术拆解文档（L2）；
4. 严格遵守黑名单：绝不使用紫色发光卡片、绝不使用纯黑 #000000、绝不在卡片里堆砌大段文字。
```

## 配方 B：基因混血（Stripe 信息架构 + Linear 暗黑精密感）

```text
以 `design-vault/stripe-02/DESIGN.md` 的渐进式信息披露架构和交互式文档体验为骨架，
但将主题切换为深色高精度工作台：
- 保留 Stripe 的双栏联动代码面板与三层信息披露；
- 视觉皮肤融合 Linear 的 1px 极细高光边框与全键盘快捷键（⌘K / Esc）；
- 所有样式必须走 CSS 变量（tokens.css），不准写死内联色值。
```

## 配方 C：让 AI 给已有丑网页“换上 Stripe 灵魂”

```text
请读取 `design-vault/stripe-02/DESIGN.md` 作为审查红线，先打开浏览器截屏检查当前页面，
列出所有违反黑名单的“AI 模板味”问题（如乱用渐变、圆角过大、对比度不足、信息平铺无层次），
然后引入 `tokens.css` 重构样式与信息层级，改完后再截屏验收。
```
