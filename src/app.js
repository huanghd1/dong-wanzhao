import {
  INITIAL_WORKS,
  CATEGORY_META,
  EFFORT_META,
  HERO_PRESETS,
  ANATOMY_LAYERS,
  PRESS_INDEX,
} from "./data/works.js";
import { initStripeMesh } from "./components/mesh-canvas.js";
import { renderSchematic } from "./components/schematics.js";
import { enhanceModalDialog, closeDialogSmoothly } from "./components/dialog-helpers.js";

const STORAGE_WORKS_KEY = "fable_stripe_vault_custom_works_v1";
const STORAGE_BOOKMARKS_KEY = "fable_stripe_vault_bookmarks_v1";

const state = {
  customWorks: loadJson(STORAGE_WORKS_KEY, []),
  bookmarks: new Set(loadJson(STORAGE_BOOKMARKS_KEY, ["saltline-fps", "blender-mcp-6h-film"])),
  category: "all",
  effort: "all",
  onlyBookmarked: false,
  query: "",
  heroTabId: HERO_PRESETS[0].id,
  anatomyId: ANATOMY_LAYERS[0].id,
  activeWorkId: null,
  inspectorTab: "prompt",
  designMdRaw: "",
};

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_WORKS_KEY, JSON.stringify(state.customWorks));
    localStorage.setItem(STORAGE_BOOKMARKS_KEY, JSON.stringify([...state.bookmarks]));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

function getAllWorks() {
  return [...state.customWorks, ...INITIAL_WORKS];
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInlineCode(str) {
  return escapeHtml(str).replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
}

// ---------- Toast Feedback ----------
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("live-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

async function copyText(text, label = "内容") {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`已复制${label}`);
  } catch {
    showToast(`复制失败，请手动选中复制`);
  }
}

// ---------- Hero Live Console ----------
function renderHeroConsole() {
  const preset = HERO_PRESETS.find((p) => p.id === state.heroTabId) || HERO_PRESETS[0];
  const tabsEl = document.getElementById("hero-console-tabs");
  const endpointEl = document.getElementById("hero-console-endpoint");
  const metricsEl = document.getElementById("hero-console-metrics");
  const codeEl = document.getElementById("hero-console-code");
  const badgeEl = document.getElementById("hero-console-badge");

  tabsEl.innerHTML = HERO_PRESETS.map(
    (p) => `
      <button
        type="button"
        class="console-tab"
        role="tab"
        aria-selected="${p.id === preset.id}"
        data-hero-tab="${p.id}"
      >${escapeHtml(p.tab)}</button>
    `
  ).join("");

  endpointEl.textContent = preset.endpoint;
  badgeEl.textContent = `● ${preset.badge}`;
  metricsEl.innerHTML = preset.metrics
    .map(
      (m) => `
      <div class="console-metric">
        <span class="console-metric-label">${escapeHtml(m.label)}</span>
        <span class="console-metric-value">${escapeHtml(m.value)}</span>
      </div>
    `
    )
    .join("");
  codeEl.innerHTML = preset.code;
}

// ---------- Filter & Works Grid ----------
function getFilteredWorks() {
  const q = state.query.trim().toLowerCase();
  return getAllWorks().filter((w) => {
    if (state.category !== "all" && w.category !== state.category) return false;
    if (state.effort !== "all" && w.effort !== state.effort) return false;
    if (state.onlyBookmarked && !state.bookmarks.has(w.id)) return false;
    if (!q) return true;
    const haystack = [
      w.title,
      w.subtitle,
      w.creator,
      w.summary,
      w.horizon,
      ...(w.tags || []),
      w.quickPeek?.promptCore,
      w.quickPeek?.breakthrough,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function renderCategoryPills() {
  const wrap = document.getElementById("category-pills");
  wrap.innerHTML = Object.entries(CATEGORY_META)
    .map(
      ([id, meta]) => `
      <button
        type="button"
        class="filter-pill"
        aria-pressed="${state.category === id}"
        data-category="${id}"
      >${escapeHtml(meta.label)}</button>
    `
    )
    .join("");
}

function renderWorksGrid() {
  const grid = document.getElementById("works-grid");
  const countEl = document.getElementById("works-count");
  const works = getFilteredWorks();
  const total = getAllWorks().length;

  countEl.textContent = `显示 ${works.length} / ${total} 件收录作品`;

  if (works.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>当前筛选条件下暂无作品</h3>
        <p>试试清空关键词、切换分类，或点击右上角“+ 收录新作品”添入你的私藏案例。</p>
        <button type="button" class="btn btn-subtle" id="reset-filters-btn">重置全部筛选</button>
      </div>
    `;
    document.getElementById("reset-filters-btn")?.addEventListener("click", () => {
      state.category = "all";
      state.effort = "all";
      state.onlyBookmarked = false;
      state.query = "";
      document.getElementById("works-search").value = "";
      document.getElementById("effort-select").value = "all";
      document.getElementById("bookmark-filter-btn").setAttribute("aria-pressed", "false");
      renderCategoryPills();
      renderWorksGrid();
    });
    return;
  }

  grid.innerHTML = works
    .map((work) => {
      const cat = CATEGORY_META[work.category] || { label: "自定义收录", short: "CUSTOM" };
      const eff = EFFORT_META[work.effort] || EFFORT_META.high;
      const isSaved = state.bookmarks.has(work.id);

      return `
        <article class="work-card reveal-on-scroll" data-work-id="${escapeHtml(work.id)}">
          <div class="card-schematic">
            ${renderSchematic(work.schematic, work.title)}
            <div class="card-badges">
              <span class="badge badge-effort-${escapeHtml(work.effort)}">${escapeHtml(eff.label)}</span>
              <span class="badge badge-horizon">${escapeHtml(work.horizon)}</span>
            </div>
          </div>

          <header class="card-header">
            <div>
              <p class="card-kicker">${escapeHtml(cat.short)} · ${escapeHtml(work.verifiedDate)}</p>
              <h3 class="card-title">${escapeHtml(work.title)}</h3>
            </div>
            <button
              type="button"
              class="bookmark-btn"
              data-bookmark="${escapeHtml(work.id)}"
              aria-pressed="${isSaved}"
              aria-label="${isSaved ? "取消收藏" : "收藏"} ${escapeHtml(work.title)}"
            >${isSaved ? "★" : "☆"}</button>
          </header>

          <div class="card-content">
            <p class="card-summary">${escapeHtml(work.summary)}</p>

            <ul class="tag-list" aria-label="技术栈标签">
              ${(work.tags || []).map((t) => `<li class="tag">${escapeHtml(t)}</li>`).join("")}
            </ul>

            <details class="peek-details">
              <summary>L1 速览：Prompt 策略与核心突破</summary>
              <div class="peek-body">
                <p><strong>Prompt 精要：</strong>${escapeHtml(work.quickPeek?.promptCore)}</p>
                <p><strong>为什么强：</strong>${escapeHtml(work.quickPeek?.breakthrough)}</p>
              </div>
            </details>
          </div>

          <footer class="card-footer">
            <span class="card-creator">${escapeHtml(work.creator)}</span>
            <button
              type="button"
              class="inspect-trigger"
              data-inspect="${escapeHtml(work.id)}"
            >
              L2 深度技术拆解 <span class="arrow-shift" aria-hidden="true">→</span>
            </button>
          </footer>
        </article>
      `;
    })
    .join("");
}

// ---------- L2 Stripe Docs Deep Inspector Modal ----------
function openWorkInspector(workId) {
  const work = getAllWorks().find((w) => w.id === workId);
  if (!work) return;
  state.activeWorkId = work.id;
  state.inspectorTab = "prompt";

  const dialog = document.getElementById("work-dialog");
  document.getElementById("work-dialog-title").textContent = work.title;
  document.getElementById("work-dialog-subtitle").textContent =
    `${work.creator} · ${work.horizon} · ${EFFORT_META[work.effort]?.label || "Effort: High"}`;

  const narrativeEl = document.getElementById("inspector-narrative");
  const stages = work.deepDive?.stages || [];
  const takeaways = work.deepDive?.takeaways || [];
  const sourceLinkHtml = work.sourceUrl
    ? `<a class="inline-link" href="${escapeHtml(work.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看原始仓库 / 来源（${escapeHtml(work.sourceLabel || "外部链接")}）<span class="arrow-shift" aria-hidden="true">→</span></a>`
    : "";

  narrativeEl.innerHTML = `
    <div>
      <p class="eyebrow">WHY IT MATTERS</p>
      <p>${escapeHtml(work.deepDive?.whyItMatters || work.summary)}</p>
    </div>

    <div>
      <p class="eyebrow">渐进式拆解（表层 → 策略 → 架构）</p>
      <div class="stage-list">
        ${stages
          .map(
            (s) => `
          <div class="stage-card">
            <span class="stage-step">${escapeHtml(s.step)}</span>
            <h4>${escapeHtml(s.title)}</h4>
            <p>${escapeHtml(s.detail)}</p>
          </div>
        `
          )
          .join("")}
      </div>
    </div>

    <div>
      <p class="eyebrow">可迁移到你项目里的工程要点</p>
      <ul class="takeaway-list">
        ${takeaways.map((t) => `<li>${formatInlineCode(t)}</li>`).join("")}
      </ul>
    </div>

    ${sourceLinkHtml}
  `;

  renderInspectorCodeTab();
  dialog.showModal();
}

function renderInspectorCodeTab() {
  const work = getAllWorks().find((w) => w.id === state.activeWorkId);
  if (!work) return;

  document.querySelectorAll("[data-inspector-tab]").forEach((btn) => {
    btn.setAttribute("aria-selected", String(btn.dataset.inspectorTab === state.inspectorTab));
  });

  const container = document.getElementById("inspector-code-body");
  const dd = work.deepDive || {};

  if (state.inspectorTab === "prompt") {
    container.innerHTML = `<pre class="inspector-pre" role="region" aria-label="Prompt 规范代码" tabindex="0"><code>${escapeHtml(dd.promptSpec || work.quickPeek?.promptCore || "")}</code></pre>`;
  } else if (state.inspectorTab === "mcp") {
    container.innerHTML = `<pre class="inspector-pre" role="region" aria-label="MCP 与模型配置 JSON" tabindex="0"><code>${escapeHtml(dd.mcpConfig || "{}")}</code></pre>`;
  } else {
    const items = dd.reproChecklist || ["在 Prompt 顶部写明边界约束与目标输出形式"];
    container.innerHTML = `
      <ul class="checklist-ul">
        ${items.map((item, idx) => `<li><span class="check-mark">0${idx + 1}</span><span>${escapeHtml(item)}</span></li>`).join("")}
      </ul>
    `;
  }
}

// ---------- Split-Scroll Technical Anatomy Band ----------
function renderAnatomyBand() {
  const stepsEl = document.getElementById("anatomy-steps");
  const active = ANATOMY_LAYERS.find((l) => l.id === state.anatomyId) || ANATOMY_LAYERS[0];

  stepsEl.innerHTML = ANATOMY_LAYERS.map(
    (layer) => `
      <button
        type="button"
        class="anatomy-step-btn"
        role="tab"
        aria-selected="${layer.id === active.id}"
        data-anatomy-id="${layer.id}"
      >
        <div class="anatomy-step-top">
          <span class="anatomy-step-eyebrow">${layer.step} · ${escapeHtml(layer.eyebrow)}</span>
          <span class="anatomy-step-impact">${escapeHtml(layer.impact)}</span>
        </div>
        <span class="anatomy-step-title">${escapeHtml(layer.title)}</span>
        <span class="anatomy-step-summary">${formatInlineCode(layer.summary)}</span>
      </button>
    `
  ).join("");

  document.getElementById("anatomy-filename").textContent = active.filename;
  document.getElementById("anatomy-code").innerHTML = active.code;
}

// ---------- Stripe Press Index ----------
function renderPressIndex() {
  const grid = document.getElementById("press-grid");
  grid.innerHTML = PRESS_INDEX.map((item) => {
    const isInternal = item.url.startsWith("#");
    return `
      <article class="press-card" style="--press-accent: ${escapeHtml(item.accent)};">
        <span class="press-vol">${escapeHtml(item.volume)}</span>
        <h3 class="press-title">${escapeHtml(item.title)}</h3>
        <span class="press-author">${escapeHtml(item.author)}</span>
        <p class="press-note">${escapeHtml(item.note)}</p>
        <a
          class="inline-link"
          href="${escapeHtml(item.url)}"
          ${isInternal ? "" : 'target="_blank" rel="noopener noreferrer"'}
        >
          ${isInternal ? "直接查看本地母本" : "前往生态源站"} <span class="arrow-shift" aria-hidden="true">→</span>
        </a>
      </article>
    `;
  }).join("");
}

// ---------- Built-in Live Design Vault Inspector ----------
const VAULT_SWATCHES = [
  { name: "Ink Navy", token: "--color-ink-primary", hex: "#0A2540" },
  { name: "Body Slate", token: "--color-ink-secondary", hex: "#425466" },
  { name: "Surface Ice", token: "--color-surface-subtle", hex: "#F6F9FC" },
  { name: "Stripe Blurple", token: "--color-accent-primary", hex: "#635BFF" },
  { name: "Docs Cyan", token: "--color-accent-cyan", hex: "#00D4FF" },
  { name: "Verified Green", token: "--color-status-success", hex: "#00A67E" },
];

async function initDesignVaultInspector() {
  const swatchEl = document.getElementById("vault-swatches");
  swatchEl.innerHTML = VAULT_SWATCHES.map(
    (s) => `
      <button type="button" class="swatch-btn" data-copy-token="${s.token}" data-copy-hex="${s.hex}">
        <span class="swatch-chip" style="background:${s.hex};"></span>
        <span class="swatch-name">${s.name}</span>
        <span class="swatch-hex">${s.hex}</span>
      </button>
    `
  ).join("");

  const preEl = document.getElementById("vault-design-md-preview");
  try {
    const res = await fetch("./design-vault/stripe-02/DESIGN.md");
    if (!res.ok) throw new Error("fetch failed");
    state.designMdRaw = await res.text();
  } catch {
    state.designMdRaw =
      "# DESIGN.md — 02 · Stripe (Web / Docs / Press)\n请通过本地 HTTP 服务打开本目录以直接读取 ./design-vault/stripe-02/DESIGN.md 完整原文。";
  }
  preEl.textContent = state.designMdRaw;
}

// ---------- Add New Work Dialog & JSON Backup ----------
function handleAddWorkSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const fd = new FormData(form);

  const title = String(fd.get("title") || "").trim();
  const summary = String(fd.get("summary") || "").trim();
  if (!title || !summary) return;

  const tagsRaw = String(fd.get("tags") || "");
  const tags = tagsRaw
    .split(/[,，\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);

  const promptCore = String(fd.get("promptCore") || "").trim() || "通过结构化边界约束与分阶段自检生成。";
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const newWork = {
    id: `custom-${Date.now()}`,
    title,
    subtitle: summary,
    creator: String(fd.get("creator") || "").trim() || "个人私藏收录",
    sourceLabel: String(fd.get("sourceUrl") || "").trim() || "个人本地收录",
    sourceUrl: String(fd.get("sourceUrl") || "").trim(),
    category: String(fd.get("category") || "3d-games"),
    effort: String(fd.get("effort") || "high"),
    horizon: String(fd.get("horizon") || "").trim() || "个人实测收录",
    verifiedDate: ym,
    featured: false,
    schematic: "custom",
    tags: tags.length ? tags : ["Claude Fable 5.2", "Personal"],
    summary,
    quickPeek: {
      promptCore,
      breakthrough: "已收录至你的个人 Fable 5.2 作品库，支持随时导出 JSON 跨设备同步。",
    },
    deepDive: {
      whyItMatters: summary,
      stages: [
        { step: "01 · 核心观察", title: "亮点与适用场景", detail: summary },
        { step: "02 · 关键 Prompt 策略", title: "可复用指令结构", detail: promptCore },
      ],
      takeaways: [
        "可将该作品的核心约束沉淀进你自己的 `DESIGN.md` 或 MCP 配置。",
      ],
      promptSpec: promptCore,
      mcpConfig: JSON.stringify(
        {
          model: "claude-fable-5-2",
          effort: String(fd.get("effort") || "high"),
          source: String(fd.get("sourceUrl") || "local-vault"),
        },
        null,
        2
      ),
      reproChecklist: [
        "确认复现所需的工具权限（MCP / 本地运行环境）",
        "记录最终生效的 effort 参数与验证方式",
      ],
    },
  };

  state.customWorks.unshift(newWork);
  state.bookmarks.add(newWork.id);
  saveState();
  renderWorksGrid();
  form.reset();
  closeDialogSmoothly(document.getElementById("add-work-dialog"));
  showToast(`已收录「${title}」到你的个人作品库`);
}

function downloadFile(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Wire Everything Up ----------
function bindEvents() {
  const workDialog = document.getElementById("work-dialog");
  const addDialog = document.getElementById("add-work-dialog");
  enhanceModalDialog(workDialog);
  enhanceModalDialog(addDialog);

  // Hero console tabs & actions
  document.getElementById("hero-console-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-hero-tab]");
    if (!btn) return;
    state.heroTabId = btn.dataset.heroTab;
    renderHeroConsole();
  });

  document.getElementById("hero-copy-btn").addEventListener("click", () => {
    const codeText = document.getElementById("hero-console-code").textContent;
    copyText(codeText, "示例代码");
  });

  document.getElementById("hero-inspect-btn").addEventListener("click", () => {
    const preset = HERO_PRESETS.find((p) => p.id === state.heroTabId) || HERO_PRESETS[0];
    openWorkInspector(preset.workId);
  });

  // Search & Filters
  document.getElementById("works-search").addEventListener("input", (e) => {
    state.query = e.target.value;
    renderWorksGrid();
  });

  document.getElementById("effort-select").addEventListener("change", (e) => {
    state.effort = e.target.value;
    renderWorksGrid();
  });

  document.getElementById("bookmark-filter-btn").addEventListener("click", (e) => {
    state.onlyBookmarked = !state.onlyBookmarked;
    e.currentTarget.setAttribute("aria-pressed", String(state.onlyBookmarked));
    renderWorksGrid();
  });

  document.getElementById("category-pills").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-category]");
    if (!btn) return;
    state.category = btn.dataset.category;
    renderCategoryPills();
    renderWorksGrid();
  });

  // Works Grid actions (delegated)
  document.getElementById("works-grid").addEventListener("click", (e) => {
    const bookmarkBtn = e.target.closest("[data-bookmark]");
    if (bookmarkBtn) {
      const id = bookmarkBtn.dataset.bookmark;
      if (state.bookmarks.has(id)) {
        state.bookmarks.delete(id);
        showToast("已取消收藏");
      } else {
        state.bookmarks.add(id);
        showToast("已加入个人收藏");
      }
      saveState();
      renderWorksGrid();
      return;
    }

    const inspectBtn = e.target.closest("[data-inspect]");
    if (inspectBtn) {
      openWorkInspector(inspectBtn.dataset.inspect);
    }
  });

  // Inspector Modal Tabs & Controls
  document.querySelectorAll("[data-inspector-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.inspectorTab = btn.dataset.inspectorTab;
      renderInspectorCodeTab();
    });
  });

  document.getElementById("inspector-copy-btn").addEventListener("click", () => {
    const text = document.getElementById("inspector-code-body").textContent.trim();
    copyText(text, "当前面板内容");
  });

  document.getElementById("work-dialog-close").addEventListener("click", () => {
    closeDialogSmoothly(workDialog);
  });

  // Anatomy Split-Scroll Band
  document.getElementById("anatomy-steps").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-anatomy-id]");
    if (!btn) return;
    state.anatomyId = btn.dataset.anatomyId;
    renderAnatomyBand();
  });

  document.getElementById("anatomy-copy-btn").addEventListener("click", () => {
    const text = document.getElementById("anatomy-code").textContent;
    copyText(text, "工程代码片段");
  });

  // Design Vault Swatches & Actions
  document.getElementById("vault-swatches").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-copy-token]");
    if (!btn) return;
    copyText(`var(${btn.dataset.copyToken}) /* ${btn.dataset.copyHex} */`, `Token ${btn.dataset.copyHex}`);
  });

  document.getElementById("copy-design-md-btn").addEventListener("click", () => {
    copyText(state.designMdRaw, "完整 DESIGN.md");
  });

  document.getElementById("download-design-md-btn").addEventListener("click", () => {
    downloadFile("DESIGN.md", state.designMdRaw, "text/markdown;charset=utf-8");
    showToast("已导出 DESIGN.md");
  });

  document.getElementById("toggle-grid-btn").addEventListener("click", (e) => {
    const active = document.body.classList.toggle("show-grid");
    e.currentTarget.setAttribute("aria-pressed", String(active));
    showToast(active ? "已开启 Stripe 4 列网格参考线" : "已关闭网格参考线");
  });

  // Add Work Dialog triggers
  document.querySelectorAll("[data-open-add-dialog]").forEach((btn) => {
    btn.addEventListener("click", () => addDialog.showModal());
  });

  document.getElementById("add-dialog-close").addEventListener("click", () => {
    closeDialogSmoothly(addDialog);
  });
  document.getElementById("add-dialog-cancel").addEventListener("click", () => {
    closeDialogSmoothly(addDialog);
  });
  document.getElementById("add-work-form").addEventListener("submit", handleAddWorkSubmit);

  // Export / Import JSON Personal Vault
  document.getElementById("export-json-btn").addEventListener("click", () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      designVault: "02 · Stripe (Web / Docs / Press)",
      bookmarks: [...state.bookmarks],
      customWorks: state.customWorks,
    };
    downloadFile("fable-5.2-collection-backup.json", JSON.stringify(payload, null, 2), "application/json");
    showToast("已导出个人作品库 JSON 备份");
  });

  document.getElementById("import-json-input").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (Array.isArray(parsed.customWorks)) state.customWorks = parsed.customWorks;
      if (Array.isArray(parsed.bookmarks)) state.bookmarks = new Set(parsed.bookmarks);
      saveState();
      renderWorksGrid();
      showToast("已恢复个人作品库备份");
    } catch {
      showToast("JSON 文件格式无效");
    }
    e.target.value = "";
  });

  // Keyboard shortcut `/` to focus search
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      document.getElementById("works-search")?.focus();
    }
  });
}

// ---------- Boot ----------
initStripeMesh(document.getElementById("stripe-mesh-canvas"));
renderHeroConsole();
renderCategoryPills();
renderWorksGrid();
renderAnatomyBand();
renderPressIndex();
initDesignVaultInspector();
bindEvents();
