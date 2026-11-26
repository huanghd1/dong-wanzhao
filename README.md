# Design Vault · 01 Linear 精密工作台 & Fable Index

本项目包含两份同步落地的核心资产，已配置 GitHub Pages 自动部署与 GitHub Actions 每日数据自动更新，支持桌面端全键盘操作与移动端自适应访问：

1. **主入口应用（`index.html` — 01 · Linear 精密工作台）**
   - 桌面端三栏键盘优先个人设计应用库（`⌘K`/`Ctrl+K` 命令面板、`J/K` 移动、`Enter` 侧栏详情、`1–5` 改状态、`G+A/D/B/T/W/G/P/F/M/S` 跳转、`C` 新建、`⌘Z` 撤销、`?` 速查表）；
   - 移动端自适应抽屉导航与全宽详情面板，方便随时在手机上浏览「每日 AI 精选」与全库参考图；
   - `linear.html` 保留为自动跳转入口，兼容旧书签访问。
2. **副站应用（`stripe.html` — 02 · Stripe 风格个人作品站）**
   - 预置 8 件 Claude Fable 5.2 代表作，支持三层渐进式技术拆解、`+ 收录新作品`、`★ 收藏筛选`、JSON 备份导出/导入与实时 `DESIGN.md` 查看。
3. **可复用设计母本库（`design-vault/`）**
   - `design-vault/linear-01/` 与 `design-vault/stripe-02/`（`DESIGN.md` / `tokens.css` / `PROMPT-STARTER.md`）。

## 自动化更新与部署架构

- **每日自动抓取（`.github/workflows/update-data.yml`）**：每天北京时间 `09:00`（`UTC 01:00`）运行 `scripts/update-data.py`，自动发现并平衡采集五大品类（设计 / 游戏 / 网页 / 产品 / App）及多模型作品，优化压缩参考图至 `assets/refs/` 并更新 `data/daily-feed.json`，随后自动提交并推送到 `main`。同时支持在 GitHub Actions 页面手动触发。
- **GitHub Pages 自动部署（`.github/workflows/deploy-pages.yml`）**：每次推送到 `main` 分支或每日数据更新完成后，自动打包静态资源并发布到 GitHub Pages。

## 本地运行

项目零前端构建依赖，进入目录后任选一条命令启动即可：

```bash
python -m http.server 8008
```

然后打开 `http://localhost:8008/`。

手动测试数据更新脚本：

```bash
pip install -r requirements.txt
python scripts/update-data.py --dry-run
```
