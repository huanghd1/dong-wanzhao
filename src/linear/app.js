import { STATUSES, PRIORITIES, VIEWS, DAILY_CATEGORIES, DAILY_MODELS, CATEGORY_LABELS, buildSeedItems } from "./data.js?v=7";
import { ITEM_REFS } from "./references.js?v=7";
import { enhanceModalDialog } from "../components/dialog-helpers.js";

const STORAGE_KEY = "linear_design_vault_items_v1";
const DAILY_REFS_CACHE_KEY = "linear_design_vault_daily_refs_v1";
const AIWEB_SEED_VERSION_KEY = "linear_design_vault_aiweb_seed_v2";
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = IS_MAC ? "⌘" : "Ctrl";

const LABEL_COLORS = ["#5e6ad2", "#4cb782", "#e2b04a", "#4ea7fc", "#eb5757", "#b18cf2"];

// Runtime reference map: static ITEM_REFS + cached daily refs (dual-persisted in data/daily-feed.json & localStorage)
function loadCachedDailyRefs() {
  try {
    const raw = localStorage.getItem(DAILY_REFS_CACHE_KEY);
    if (raw) return JSON.parse(raw) || {};
  } catch {}
  return {};
}
const refsMap = { ...ITEM_REFS, ...loadCachedDailyRefs() };

const state = {
  items: loadItems(),
  view: "all",
  subCategory: "all",
  subModel: "all",
  dailyMeta: {
    lastUpdatedAt: null,
    dailyQuota: 16,
    lastRunSummary: "每日 09:00 自动更新 16 部（涵盖设计 / 游戏 / 网页 / 产品 / App，并自动归入对应分类与模型列表）",
  },
  filter: "",
  selectedId: null,
  inspectorOpen: false,
  undoStack: [],
  visible: [],
  pendingG: false,
  gTimer: null,
};

// ---------------- Persistence (async, never blocks the frame) ----------------
function loadItems() {
  const seeds = buildSeedItems();
  const seedById = new Map(seeds.map((s) => [s.id, s]));
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      let parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        // One-time refresh of seed ai-1..ai-10 to real AI-built websites while keeping all other user edits intact
        if (localStorage.getItem(AIWEB_SEED_VERSION_KEY) !== "1") {
          const seedAiIds = new Set(seeds.filter((s) => s.type === "aiweb").map((s) => s.id));
          parsed = parsed.filter((i) => !seedAiIds.has(i.id));
          localStorage.setItem(AIWEB_SEED_VERSION_KEY, "1");
        }
        let metaChanged = false;
        for (const it of parsed) {
          const s = seedById.get(it.id);
          if (!s) continue;
          if (!it.category && s.category) { it.category = s.category; metaChanged = true; }
          if (!it.modelFamily && s.modelFamily) { it.modelFamily = s.modelFamily; metaChanged = true; }
          if (!it.modelName && s.modelName) { it.modelName = s.modelName; metaChanged = true; }
        }
        const existingIds = new Set(parsed.map((i) => i.id));
        const missingSeeds = seeds.filter((s) => !existingIds.has(s.id));
        const merged = missingSeeds.length ? [...parsed, ...missingSeeds] : parsed;
        if (missingSeeds.length || metaChanged) localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
    localStorage.setItem(AIWEB_SEED_VERSION_KEY, "1");
  } catch {}
  return seeds;
}

let persistQueued = false;
function persist() {
  if (persistQueued) return;
  persistQueued = true;
  setTimeout(() => {
    persistQueued = false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {}
  }, 0);
}

// ---------------- Helpers ----------------
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const statusById = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];
const priorityById = (id) => PRIORITIES.find((p) => p.id === id) || PRIORITIES[0];
const getItem = (id) => state.items.find((i) => i.id === id);

function labelColor(label) {
  let h = 0;
  for (const ch of label) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return LABEL_COLORS[h % LABEL_COLORS.length];
}

function isTypingTarget(el) {
  return el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

function openDialog() {
  return document.querySelector("dialog[open]");
}

// ---------------- Auto-routing & Model/Category helpers ----------------
function inferModelFamily(it) {
  if (it.modelFamily === "claude" || it.modelFamily === "other") return it.modelFamily;
  if (it.type === "fable") return "claude";
  if (it.type === "othermodel") return "other";
  if (it.type === "benchmark" || it.type === "theory") return "";
  const blob = `${it.modelName || ""} ${(it.labels || []).join(" ")} ${it.title || ""}`;
  return /claude|fable|opus|sonnet/i.test(blob) ? "claude" : "other";
}

function matchesModelFilter(it, filterId) {
  if (!filterId || filterId === "all") return true;
  const fam = inferModelFamily(it);
  if (filterId === "claude") return fam === "claude";
  if (filterId === "fable52") return /fable\s*5\.2/i.test(it.modelName || "");
  if (filterId === "other") return fam === "other";
  return true;
}

function matchesView(it, viewId) {
  switch (viewId) {
    case "all":
      return true;
    case "daily":
      return it.type === "daily";
    case "benchmark":
      return it.type === "benchmark";
    case "theory":
      return it.type === "theory";
    case "aiweb":
      return it.type === "aiweb" || (it.type === "daily" && (it.category === "web" || it.category === "design"));
    case "games":
      return it.category === "game";
    case "products":
      return it.category === "product" || it.category === "app";
    case "fable":
      return it.type === "fable" || (it.type === "daily" && inferModelFamily(it) === "claude");
    case "othermodel":
      return it.type === "othermodel" || (it.type === "daily" && inferModelFamily(it) === "other");
    case "starred":
      return Boolean(it.starred);
    default:
      return true;
  }
}

function getRoutedViews(it) {
  return VIEWS.filter((v) => v.id !== "all" && v.id !== "starred" && matchesView(it, v.id));
}

function rowChips(it) {
  const chips = [];
  if (it.category && CATEGORY_LABELS[it.category]) {
    chips.push({ text: CATEGORY_LABELS[it.category], dot: it.category === "game" ? "#eb5757" : it.category === "app" ? "#4cb782" : it.category === "product" ? "#e2b04a" : it.category === "design" ? "#b18cf2" : "#4ea7fc" });
  }
  if (it.modelName) {
    const fam = inferModelFamily(it);
    chips.push({ text: it.modelName, dot: fam === "claude" ? "#e29b4a" : "#4ea7fc" });
  }
  if (chips.length) return chips.slice(0, 2);
  return (it.labels || []).slice(0, 2).map((l) => ({ text: l, dot: labelColor(l) }));
}

// ---------------- Daily auto-feed sync (dual-persisted: data/daily-feed.json + localStorage) ----------------
let lastAutoSyncAt = 0;
async function syncDailyFeed(manual = false) {
  lastAutoSyncAt = Date.now();
  try {
    const res = await fetch(`./data/daily-feed.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const feed = await res.json();
    state.dailyMeta = {
      lastUpdatedAt: feed.lastUpdatedAt || null,
      dailyQuota: feed.dailyQuota || 16,
      lastRunSummary: feed.lastRunSummary || "每日 09:00 自动更新 16 部（每部最多 6 张图）",
    };

    const incoming = Array.isArray(feed.items) ? feed.items : [];
    const existingById = new Map(state.items.map((it) => [it.id, it]));
    const dailyRefsCache = loadCachedDailyRefs();
    let added = 0;
    let metaUpdated = 0;

    for (const raw of incoming) {
      if (!raw?.id) continue;
      if (Array.isArray(raw.refs) && raw.refs.length) {
        const sliced = raw.refs.slice(0, 6);
        refsMap[raw.id] = sliced;
        dailyRefsCache[raw.id] = sliced;
      }
      const prev = existingById.get(raw.id);
      if (!prev) {
        const { refs: _omit, ...itemData } = raw;
        state.items.unshift(itemData);
        existingById.set(raw.id, itemData);
        added++;
      } else {
        // Keep user status/priority/starred edits, refresh category/model metadata for auto-routing
        if (raw.category && prev.category !== raw.category) { prev.category = raw.category; metaUpdated++; }
        if (raw.modelFamily && prev.modelFamily !== raw.modelFamily) { prev.modelFamily = raw.modelFamily; metaUpdated++; }
        if (raw.modelName && prev.modelName !== raw.modelName) { prev.modelName = raw.modelName; metaUpdated++; }
        if (raw.discoveredDate && !prev.discoveredDate) { prev.discoveredDate = raw.discoveredDate; metaUpdated++; }
      }
    }

    try {
      localStorage.setItem(DAILY_REFS_CACHE_KEY, JSON.stringify(dailyRefsCache));
    } catch {}
    if (added > 0 || metaUpdated > 0) persist();
    render();
    if (manual) {
      toast(added > 0 ? `已同步 ${added} 部最新 AI 作品并自动归类入库` : `已是最新抓取列表（共 ${incoming.length} 部已持久化并自动归类）`, false);
    } else if (added > 0) {
      toast(`自动同步 ${added} 部新作品并已自动归类至对应标题`, false);
    }
  } catch {
    if (manual) toast("暂无最新抓取数据（已保留本地缓存条目）", false);
  }
}

// Auto-sync when returning to an open browser tab (throttled to >= 15s)
function maybeAutoSyncOnFocus() {
  if (document.visibilityState === "visible" && Date.now() - lastAutoSyncAt > 15_000) {
    syncDailyFeed(false);
  }
}

// ---------------- Derived data ----------------
function computeVisible() {
  const q = state.filter.trim().toLowerCase();
  const list = state.items.filter((it) => {
    if (!matchesView(it, state.view)) return false;
    if (["daily", "fable", "othermodel"].includes(state.view) && state.subCategory !== "all") {
      if (it.category !== state.subCategory) return false;
    }
    if (["daily", "aiweb", "games", "products", "fable"].includes(state.view) && state.subModel !== "all") {
      if (!matchesModelFilter(it, state.subModel)) return false;
    }
    if (!q) return true;
    return [
      it.key,
      it.title,
      it.domain,
      it.essence,
      it.discoveredDate,
      it.modelName,
      CATEGORY_LABELS[it.category],
      ...(it.labels || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const order = STATUSES.map((s) => s.id);
  list.sort((a, b) => {
    const s = order.indexOf(a.status) - order.indexOf(b.status);
    if (s) return s;
    const pa = a.priority || 9;
    const pb = b.priority || 9;
    if (pa !== pb) return pa - pb;
    return a.key.localeCompare(b.key, "en", { numeric: true });
  });
  return list;
}

// ---------------- Rendering ----------------
function render() {
  const t0 = performance.now();

  state.visible = computeVisible();
  if (!state.visible.some((i) => i.id === state.selectedId)) {
    state.selectedId = state.visible[0]?.id ?? null;
    if (!state.selectedId) state.inspectorOpen = false;
  }

  renderNav();
  renderDailyBar();
  renderList();
  renderInspector();

  const ms = performance.now() - t0;
  $("latency-hud").textContent = `⚡ ${ms.toFixed(1)} ms`;
}

function renderNav() {
  const counts = Object.fromEntries(
    VIEWS.map((v) => [v.id, state.items.filter((it) => matchesView(it, v.id)).length])
  );
  $("view-nav").innerHTML = VIEWS.map(
    (v) => `
    <li>
      <button type="button" class="nav-item" data-view="${v.id}" ${state.view === v.id ? 'aria-current="page"' : ""}>
        <span class="nav-icon" aria-hidden="true">${v.icon}</span>
        <span>${esc(v.label)}</span>
        <span class="nav-count">${counts[v.id]}</span>
        <span class="nav-go" aria-hidden="true"><kbd class="kbd">G</kbd><kbd class="kbd">${v.go}</kbd></span>
      </button>
    </li>`
  ).join("");

  const view = VIEWS.find((v) => v.id === state.view);
  $("view-title").textContent = view.label;
  $("view-count").textContent = String(state.visible.length);
  document.title = `${view.label} · Design Vault · 01 Linear`;
}

function renderDailyBar() {
  const bar = $("daily-bar");
  if (!bar) return;
  const subBarViews = ["daily", "aiweb", "games", "products", "fable", "othermodel"];
  if (!subBarViews.includes(state.view)) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  const viewPool = state.items.filter((i) => matchesView(i, state.view));
  const showCats = ["daily", "fable", "othermodel"].includes(state.view);
  const showModels = ["daily", "aiweb", "games", "products", "fable"].includes(state.view);

  const modelChoices =
    state.view === "fable"
      ? [
          { id: "all", label: "全部 Claude" },
          { id: "fable52", label: "Claude Fable 5.2" },
        ]
      : DAILY_MODELS;

  const catHtml = showCats
    ? `<div class="daily-cats" role="group" aria-label="按品类筛选">
        ${DAILY_CATEGORIES.map((c) => {
          const n =
            c.id === "all"
              ? viewPool.filter((i) => matchesModelFilter(i, state.subModel)).length
              : viewPool.filter((i) => i.category === c.id && matchesModelFilter(i, state.subModel)).length;
          return `<button type="button" class="cat-pill" data-daily-cat="${c.id}" aria-pressed="${state.subCategory === c.id}">${esc(c.label)} <span class="cat-pill-n">${n}</span></button>`;
        }).join("")}
      </div>`
    : "";

  const modelHtml = showModels
    ? `<div class="daily-cats" role="group" aria-label="按模型筛选">
        ${modelChoices.map((m) => {
          const n = viewPool.filter(
            (i) => (state.subCategory === "all" || !showCats || i.category === state.subCategory) && matchesModelFilter(i, m.id)
          ).length;
          return `<button type="button" class="cat-pill" data-daily-model="${m.id}" aria-pressed="${state.subModel === m.id}">${esc(m.label)} <span class="cat-pill-n">${n}</span></button>`;
        }).join("")}
      </div>`
    : "";

  const stamp = state.dailyMeta.lastUpdatedAt
    ? state.dailyMeta.lastUpdatedAt.replace("T", " ").slice(0, 16)
    : "待首次执行";
  const quota = state.dailyMeta.dailyQuota || 16;
  const dailyRoutedCount = viewPool.filter((i) => i.type === "daily").length;

  const rightMeta =
    state.view === "daily"
      ? `<div class="daily-meta">
          <span class="daily-dot" aria-hidden="true"></span>
          <span>已存网页 · 每日 09:00 更新 ${quota} 部（自动归类）· 上次：${esc(stamp)}</span>
          <button type="button" class="ghost-btn" data-action="refresh-daily">刷新列表</button>
        </div>`
      : `<div class="daily-meta">
          <span class="daily-dot" aria-hidden="true"></span>
          <span>已自动同步 ${dailyRoutedCount} 部每日抓取作品 · 每日 ${quota} 部自动归入对应标题</span>
        </div>`;

  bar.innerHTML = `
    <div class="daily-filters">
      ${catHtml}
      ${catHtml && modelHtml ? '<span class="daily-sep" aria-hidden="true"></span>' : ""}
      ${modelHtml}
    </div>
    ${rightMeta}`;
}

function renderList() {
  const listEl = $("item-list");
  if (!state.visible.length) {
    listEl.removeAttribute("aria-activedescendant");
    listEl.innerHTML = `
      <div class="empty">
        <strong>没有匹配的条目</strong>
        <span>换个关键词，或按 <kbd class="kbd">C</kbd> 新建一个</span>
      </div>`;
    return;
  }

  let html = "";
  for (const status of STATUSES) {
    const group = state.visible.filter((i) => i.status === status.id);
    if (!group.length) continue;
    html += `
      <div class="group-header" role="presentation">
        <span class="status-icon" data-s="${status.id}" aria-hidden="true">${status.icon}</span>
        <span>${esc(status.label)}</span>
        <span class="group-count">${group.length}</span>
      </div>`;
    for (const it of group) {
      const p = priorityById(it.priority);
      html += `
        <div
          class="row"
          id="row-${esc(it.id)}"
          role="option"
          data-id="${esc(it.id)}"
          data-status="${esc(it.status)}"
          aria-selected="${it.id === state.selectedId}"
          aria-label="${esc(it.key)} ${esc(it.title)}，${esc(status.label)}${it.starred ? "，已加星" : ""}"
        >
          <span class="row-priority" data-p="${p.id}" title="${esc(p.label)}" aria-hidden="true">${p.icon}</span>
          <span class="row-key">${esc(it.key)}</span>
          <span class="status-icon" data-s="${esc(it.status)}" title="${esc(status.label)}" aria-hidden="true">${status.icon}</span>
          <span class="row-title">${esc(it.title)}</span>
          <span class="row-labels">${rowChips(it)
            .map((c) => `<span class="label-chip" style="--chip-dot:${c.dot}">${esc(c.text)}</span>`)
            .join("")}</span>
          <span class="row-domain">${esc(it.domain)}</span>
          <span class="row-star" data-on="${Boolean(it.starred)}" aria-hidden="true">★</span>
        </div>`;
    }
  }
  listEl.innerHTML = html;
  if (state.selectedId) listEl.setAttribute("aria-activedescendant", `row-${state.selectedId}`);
}

function renderInspector() {
  const el = $("inspector");
  const shell = $("app-shell");
  const it = state.inspectorOpen ? getItem(state.selectedId) : null;

  if (!it) {
    el.hidden = true;
    shell.classList.remove("inspector-open");
    return;
  }

  el.hidden = false;
  shell.classList.add("inspector-open");
  const p = priorityById(it.priority);

  const typeLabel =
    it.type === "benchmark"
      ? "设计母本"
      : it.type === "daily"
      ? "每日 AI 精选"
      : it.type === "theory"
      ? "经典理念"
      : it.type === "aiweb"
      ? "AI 实战网页"
      : it.type === "othermodel"
      ? "其他模型作品"
      : "Claude 作品";

  const itemRefs = refsMap[it.id] || [];

  el.innerHTML = `
    <div class="insp-head">
      <span class="insp-breadcrumb">${typeLabel} › ${esc(it.key)}${it.discoveredDate ? ` · ${esc(it.discoveredDate)}` : ""}</span>
      <button type="button" class="ghost-btn" data-action="close-inspector">关闭 <kbd class="kbd">Esc</kbd></button>
    </div>
    <div class="insp-body">
      <div>
        <h2 class="insp-title">${esc(it.title)}</h2>
      </div>
      <p class="insp-essence">${esc(it.essence)}</p>

      ${
        itemRefs.length
          ? `<section aria-labelledby="refs-h">
              <h3 id="refs-h" class="insp-section-title">原版视觉参考图（共 ${itemRefs.length} 张 · 点击放大，直观判断该不该取）</h3>
              <div class="ref-grid">
                ${itemRefs
                  .slice(0, 6)
                  .map(
                    (ref, idx) => `
                  <button
                    type="button"
                    class="ref-thumb"
                    data-open-ref="${idx}"
                    aria-label="放大查看参考图 ${idx + 1}：${esc(ref.title)}"
                  >
                    <span class="ref-thumb-frame">
                      <img src="${esc(ref.src)}" alt="${esc(ref.title)}" loading="lazy">
                      <span class="ref-thumb-badge" aria-hidden="true">${esc(ref.tag)}</span>
                    </span>
                    <span class="ref-thumb-label">${esc(ref.title)}</span>
                  </button>`
                  )
                  .join("")}
              </div>
            </section>`
          : ""
      }

      <dl class="prop-grid">
        <dt>状态</dt>
        <dd>
          <div class="status-picker" role="group" aria-label="设置状态">
            ${STATUSES.map(
              (s) => `
              <button type="button" class="status-opt" data-set-status="${s.id}" aria-pressed="${it.status === s.id}">
                <span class="status-icon" data-s="${s.id}" aria-hidden="true">${s.icon}</span>${esc(s.label)}
                <kbd class="kbd">${s.key}</kbd>
              </button>`
            ).join("")}
          </div>
        </dd>
        <dt>优先级</dt>
        <dd><span class="row-priority" data-p="${p.id}" aria-hidden="true">${p.icon}</span> ${esc(p.label)}</dd>
        ${
          it.modelName
            ? `<dt>所属模型</dt>
               <dd>${esc(it.modelName)}<span class="model-family-tag" data-family="${esc(inferModelFamily(it))}">${inferModelFamily(it) === "claude" ? "Claude 系列" : "其他模型"}</span></dd>`
            : ""
        }
        ${
          it.category && CATEGORY_LABELS[it.category]
            ? `<dt>作品品类</dt>
               <dd>${esc(CATEGORY_LABELS[it.category])}</dd>`
            : ""
        }
        <dt>归属列表</dt>
        <dd class="route-pills">${getRoutedViews(it)
          .map((v) => `<button type="button" class="route-pill" data-jump-view="${v.id}">${v.icon} ${esc(v.label)}</button>`)
          .join("") || "—"}</dd>
        <dt>领域</dt>
        <dd>${esc(it.domain)}</dd>
        <dt>标签</dt>
        <dd class="row-labels" style="flex-wrap:wrap">${(it.labels || [])
          .map((l) => `<span class="label-chip" style="--chip-dot:${labelColor(l)}">${esc(l)}</span>`)
          .join("") || "—"}</dd>
      </dl>

      ${
        it.dna?.length
          ? `<section aria-labelledby="dna-h">
              <h3 id="dna-h" class="insp-section-title">设计 DNA（可直接喂给 Agent）</h3>
              <div class="dna-table">
                ${it.dna
                  .map(([k, v]) => `<div class="dna-row"><span class="dna-key">${esc(k)}</span><span class="dna-val">${esc(v)}</span></div>`)
                  .join("")}
              </div>
            </section>`
          : ""
      }

      ${
        it.notes?.length
          ? `<section aria-labelledby="notes-h">
              <h3 id="notes-h" class="insp-section-title">${esc(it.notesLabel || "备注")}</h3>
              <ul class="note-list">${it.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
            </section>`
          : ""
      }

      <div class="insp-actions">
        <button type="button" class="primary-btn" data-action="copy-prompt">复制 Agent 提示词</button>
        <button type="button" class="ghost-btn" data-action="toggle-star">${it.starred ? "取消加星" : "加星"} <kbd class="kbd">S</kbd></button>
        ${it.sourceUrl ? `<a class="ghost-btn" href="${esc(it.sourceUrl)}" target="_blank" rel="noopener noreferrer">打开来源 ↗</a>` : ""}
      </div>
    </div>`;
}

// ---------------- Mutations (optimistic + undo) ----------------
function mutate(id, patch, message) {
  const it = getItem(id);
  if (!it) return;
  const before = {};
  for (const k of Object.keys(patch)) before[k] = it[k];
  Object.assign(it, patch, { updatedAt: Date.now() });
  state.undoStack.push({ kind: "patch", id, before });
  if (state.undoStack.length > 50) state.undoStack.shift();
  render();
  persist();
  if (message) toast(message, true);
}

function setStatus(id, statusId) {
  const it = getItem(id);
  if (!it || it.status === statusId) return;
  mutate(id, { status: statusId }, `${it.key} → ${statusById(statusId).label}`);
  scrollSelectedIntoView();
}

function toggleStar(id) {
  const it = getItem(id);
  if (!it) return;
  mutate(id, { starred: !it.starred }, `${it.key} ${it.starred ? "已取消加星" : "已加星"}`);
}

function createItem({ title, type, status, domain, essence, category, modelName }) {
  const prefix =
    type === "fable"
      ? "FB"
      : type === "othermodel"
      ? "OM"
      : type === "daily"
      ? "DY"
      : type === "theory"
      ? "TH"
      : type === "aiweb"
      ? "AI"
      : "DV";
  const nums = state.items
    .filter((i) => i.key.startsWith(prefix + "-"))
    .map((i) => Number(i.key.split("-")[1]) || 0);
  const key = `${prefix}-${Math.max(0, ...nums) + 1}`;
  const cleanModel = (modelName || "").trim();
  const inferredFamily =
    type === "fable" || /claude|fable|opus|sonnet/i.test(cleanModel)
      ? "claude"
      : type === "othermodel" || cleanModel
      ? "other"
      : "";
  const item = {
    id: `${key.toLowerCase()}-${Date.now().toString(36)}`,
    key,
    type,
    category: category || (type === "aiweb" ? "web" : ""),
    modelFamily: inferredFamily,
    modelName: cleanModel || (type === "fable" ? "Claude Fable 5.2" : ""),
    title,
    domain:
      domain ||
      (type === "fable"
        ? "Claude 优秀作品"
        : type === "othermodel"
        ? "其他模型优秀作品"
        : type === "daily"
        ? "每日 AI 精选"
        : type === "theory"
        ? "设计理念与著作"
        : type === "aiweb"
        ? "AI 网页与设计"
        : "未分类"),
    status,
    priority: 0,
    starred: false,
    labels: [CATEGORY_LABELS[category], cleanModel].filter(Boolean),
    essence: essence || "（待补充本质描述）",
    dna: [],
    notes: [],
    notesLabel: type === "fable" ? "可迁移要点" : "红线 DON'T",
    sourceUrl: "",
    updatedAt: Date.now(),
  };
  state.items.unshift(item);
  state.undoStack.push({ kind: "create", id: item.id });
  if (!matchesView(item, state.view)) state.view = "all";
  state.filter = "";
  $("filter-input").value = "";
  state.selectedId = item.id;
  state.inspectorOpen = true;
  render();
  persist();
  scrollSelectedIntoView();
  toast(`已创建 ${key}`, true);
}

function undo() {
  const entry = state.undoStack.pop();
  if (!entry) {
    toast("没有可撤销的操作", false);
    return;
  }
  if (entry.kind === "create") {
    state.items = state.items.filter((i) => i.id !== entry.id);
  } else {
    const it = getItem(entry.id);
    if (it) Object.assign(it, entry.before);
    state.selectedId = entry.id;
  }
  render();
  persist();
  scrollSelectedIntoView();
  toast("已撤销", false);
}

// ---------------- Selection & navigation ----------------
function moveSelection(delta) {
  if (!state.visible.length) return;
  const idx = state.visible.findIndex((i) => i.id === state.selectedId);
  const next = Math.min(state.visible.length - 1, Math.max(0, idx + delta));
  select(state.visible[next].id);
}

function select(id) {
  if (state.selectedId === id) return;
  const prevRow = document.getElementById(`row-${state.selectedId}`);
  prevRow?.setAttribute("aria-selected", "false");
  state.selectedId = id;
  const row = document.getElementById(`row-${id}`);
  row?.setAttribute("aria-selected", "true");
  $("item-list").setAttribute("aria-activedescendant", `row-${id}`);
  scrollSelectedIntoView();
  if (state.inspectorOpen) renderInspector();
}

function scrollSelectedIntoView() {
  document.getElementById(`row-${state.selectedId}`)?.scrollIntoView({ block: "nearest" });
}

function setView(view) {
  state.view = view;
  state.subCategory = "all";
  state.subModel = "all";
  state.selectedId = null;
  render();
}

function openInspector() {
  if (!state.selectedId) return;
  state.inspectorOpen = true;
  renderInspector();
}

function closeInspector() {
  state.inspectorOpen = false;
  renderInspector();
  $("item-list").focus();
}

// ---------------- Toast ----------------
let toastTimer = null;
function toast(text, undoable) {
  $("toast-text").textContent = text;
  $("toast-undo").hidden = !undoable;
  $("toast").classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("is-visible"), 2600);
}

// ---------------- Agent prompt copy ----------------
function buildAgentPrompt(it) {
  const lines = [
    `# 设计参考：${it.key} · ${it.title}`,
    `领域：${it.domain}`,
    ...(it.category && CATEGORY_LABELS[it.category] ? [`品类：${CATEGORY_LABELS[it.category]}`] : []),
    ...(it.modelName ? [`原作品模型：${it.modelName}`] : []),
    `本质：${it.essence}`,
  ];
  if (it.vault) lines.push(`请先完整阅读 design-vault/${it.vault}/DESIGN.md 并引入同目录 tokens.css。`);
  if (it.dna?.length) {
    lines.push("", "## 必须遵守的设计 DNA");
    for (const [k, v] of it.dna) lines.push(`- ${k}：${v}`);
  }
  if (it.notes?.length) {
    lines.push("", `## ${it.notesLabel || "备注"}`);
    for (const n of it.notes) lines.push(`- ${n}`);
  }
  lines.push("", "完成后请在浏览器截图自检，对照以上条目逐条验收。");
  return lines.join("\n");
}

async function copyPrompt(id) {
  const it = getItem(id);
  if (!it) return;
  try {
    await navigator.clipboard.writeText(buildAgentPrompt(it));
    toast(`已复制 ${it.key} 的 Agent 提示词`, false);
  } catch {
    toast("复制失败，请检查剪贴板权限", false);
  }
}

// ---------------- Command palette ----------------
const palette = { results: [], active: 0 };

function buildCommands() {
  const sel = getItem(state.selectedId);
  const cmds = [];

  for (const v of VIEWS) {
    cmds.push({ group: "跳转", icon: v.icon, label: `前往：${v.label}`, meta: `G ${v.go}`, run: () => setView(v.id) });
  }
  cmds.push({ group: "操作", icon: "+", label: "新建设计条目", meta: "C", run: openCreate });
  if (sel) {
    for (const s of STATUSES) {
      cmds.push({
        group: "操作",
        icon: s.icon,
        label: `将 ${sel.key} 状态设为：${s.label}`,
        meta: s.key,
        run: () => setStatus(sel.id, s.id),
      });
    }
    cmds.push({ group: "操作", icon: "★", label: `${sel.starred ? "取消加星" : "加星"}：${sel.key}`, meta: "S", run: () => toggleStar(sel.id) });
    cmds.push({ group: "操作", icon: "⧉", label: `复制 ${sel.key} 的 Agent 提示词`, meta: "", run: () => copyPrompt(sel.id) });
  }
  cmds.push({ group: "操作", icon: "↶", label: "撤销上一步", meta: `${MOD} Z`, run: undo });
  cmds.push({ group: "帮助", icon: "?", label: "查看键盘快捷键", meta: "?", run: openShortcuts });

  for (const it of state.items) {
    cmds.push({
      group: "条目",
      icon: statusById(it.status).icon,
      label: `${it.title}`,
      meta: it.key,
      search: `${it.key} ${it.title} ${it.domain} ${(it.labels || []).join(" ")}`,
      run: () => {
        if (!state.visible.some((v) => v.id === it.id)) {
          state.view = "all";
          state.filter = "";
          $("filter-input").value = "";
        }
        state.selectedId = it.id;
        state.inspectorOpen = true;
        render();
        scrollSelectedIntoView();
      },
    });
  }
  return cmds;
}

function renderPalette() {
  const q = $("palette-input").value.trim().toLowerCase();
  const all = buildCommands();
  palette.results = q
    ? all.filter((c) => (c.search || c.label + " " + c.meta).toLowerCase().includes(q))
    : all.filter((c) => c.group !== "条目").concat(all.filter((c) => c.group === "条目").slice(0, 6));
  palette.active = Math.min(palette.active, Math.max(0, palette.results.length - 1));

  const listEl = $("palette-list");
  if (!palette.results.length) {
    listEl.innerHTML = `<li class="palette-group" role="presentation">没有匹配的命令</li>`;
    $("palette-input").removeAttribute("aria-activedescendant");
    return;
  }

  let html = "";
  let lastGroup = "";
  palette.results.forEach((c, idx) => {
    if (c.group !== lastGroup) {
      html += `<li class="palette-group" role="presentation">${esc(c.group)}</li>`;
      lastGroup = c.group;
    }
    html += `
      <li class="palette-opt" id="pal-${idx}" role="option" data-idx="${idx}" aria-selected="${idx === palette.active}">
        <span class="palette-opt-icon" aria-hidden="true">${esc(c.icon)}</span>
        <span class="palette-opt-label">${esc(c.label)}</span>
        ${c.meta ? `<span class="palette-opt-meta">${esc(c.meta)}</span>` : ""}
      </li>`;
  });
  listEl.innerHTML = html;
  $("palette-input").setAttribute("aria-activedescendant", `pal-${palette.active}`);
  document.getElementById(`pal-${palette.active}`)?.scrollIntoView({ block: "nearest" });
}

function setPaletteActive(idx) {
  if (!palette.results.length) return;
  document.getElementById(`pal-${palette.active}`)?.setAttribute("aria-selected", "false");
  palette.active = (idx + palette.results.length) % palette.results.length;
  const el = document.getElementById(`pal-${palette.active}`);
  el?.setAttribute("aria-selected", "true");
  el?.scrollIntoView({ block: "nearest" });
  $("palette-input").setAttribute("aria-activedescendant", `pal-${palette.active}`);
}

function runPaletteCommand(idx) {
  const cmd = palette.results[idx];
  if (!cmd) return;
  $("palette").close();
  // Run after the dialog closes so focus/return happens first
  queueMicrotask(cmd.run);
}

function openPalette() {
  const dlg = $("palette");
  if (dlg.open) return;
  const sel = getItem(state.selectedId);
  $("palette-context").textContent = sel ? `${sel.key} · ${sel.title}` : "Design Vault";
  $("palette-input").value = "";
  palette.active = 0;
  renderPalette();
  dlg.showModal();
  $("palette-input").focus();
}

// ---------------- Create & shortcuts dialogs ----------------
function openCreate() {
  const dlg = $("create-dialog");
  if (dlg.open) return;
  $("create-form").reset();
  dlg.showModal();
}

const SHORTCUTS = [
  ["打开命令面板", [MOD, "K"]],
  ["下移 / 上移", ["J", "K"]],
  ["打开详情", ["↵"]],
  ["关闭当前层", ["Esc"]],
  ["新建条目", ["C"]],
  ["聚焦筛选", ["/"]],
  ["加星 / 取消", ["S"]],
  ["设置状态（待研究 → 已归档）", ["1", "–", "5"]],
  ["前往全部 / 每日精选 / 母本 / 理念 / 网页设计 / 游戏 / 产品App / Claude / 其他模型 / 加星", ["G", "A·D·B·T·W·G·P·F·M·S"]],
  ["撤销", [MOD, "Z"]],
  ["快捷键速查", ["?"]],
];

function openShortcuts() {
  $("shortcut-grid").innerHTML = SHORTCUTS.map(
    ([label, keys]) => `<dt>${esc(label)}</dt><dd>${keys.map((k) => (k === "–" ? "–" : `<kbd class="kbd">${esc(k)}</kbd>`)).join("")}</dd>`
  ).join("");
  $("shortcuts-dialog").showModal();
}

// ---------------- Reference image lightbox ----------------
const lightboxState = { itemId: null, index: 0 };

function renderLightbox() {
  const refs = (refsMap[lightboxState.itemId] || []).slice(0, 6);
  const ref = refs[lightboxState.index];
  if (!ref) return;
  const it = getItem(lightboxState.itemId);
  $("lightbox-counter").textContent = `${lightboxState.index + 1} / ${refs.length}`;
  $("lightbox-title").textContent = `${it ? it.key + " · " : ""}${ref.title}`;
  $("lightbox-stage").innerHTML = `<img src="${esc(ref.src)}" alt="${esc(ref.title)}">`;
  $("lightbox-tag").textContent = ref.tag;
  $("lightbox-caption").textContent = ref.caption;

  const strip = $("lightbox-strip");
  if (strip) {
    if (refs.length > 1) {
      strip.hidden = false;
      strip.innerHTML = refs
        .map(
          (r, i) => `
          <button
            type="button"
            class="lightbox-strip-btn"
            data-lightbox-idx="${i}"
            aria-current="${i === lightboxState.index ? "true" : "false"}"
            aria-label="切换到第 ${i + 1} 张：${esc(r.title)}"
          >
            <img src="${esc(r.src)}" alt="">
          </button>`
        )
        .join("");
    } else {
      strip.hidden = true;
    }
  }
}

function openLightbox(itemId, index = 0) {
  const refs = (refsMap[itemId] || []).slice(0, 6);
  if (!refs.length) return;
  lightboxState.itemId = itemId;
  lightboxState.index = (index + refs.length) % refs.length;
  renderLightbox();
  const dlg = $("lightbox");
  if (!dlg.open) dlg.showModal();
}

function stepLightbox(delta) {
  const refs = (refsMap[lightboxState.itemId] || []).slice(0, 6);
  if (!refs.length) return;
  lightboxState.index = (lightboxState.index + delta + refs.length) % refs.length;
  renderLightbox();
}

// Guard against browser/CDP char-event leaking hotkey text into newly focused inputs
let suppressedHotkey = null;
function armHotkeyCharGuard(ch) {
  suppressedHotkey = { ch, until: performance.now() + 150 };
}

document.addEventListener(
  "beforeinput",
  (e) => {
    if (!suppressedHotkey) return;
    if (performance.now() <= suppressedHotkey.until && e.data === suppressedHotkey.ch) {
      e.preventDefault();
    }
    suppressedHotkey = null;
  },
  true
);

// ---------------- Mobile navigation drawer (popover="manual" + scroll-snap) ----------------
const mobileDrawerMql = window.matchMedia("(max-width: 760px)");
let restoreDrawerFocus = true;
let drawerState = "closed"; // "closed" | "opening" | "open" | "closing"
let drawerCloseTimer = null;
let drawerOpenTimer = null;

function isDrawerOpen() {
  return drawerState !== "closed";
}

function forceCloseDrawer(restoreFocus = false) {
  clearTimeout(drawerCloseTimer);
  clearTimeout(drawerOpenTimer);
  drawerState = "closed";
  const drawer = $("sidebar-drawer");
  if (!drawer) return;
  if (drawer.matches(":popover-open")) drawer.hidePopover();
  $("main-content").inert = false;
  $("inspector").inert = false;
  drawer.removeAttribute("aria-modal");
  $("mobile-menu-btn")?.setAttribute("aria-expanded", "false");
  if (restoreFocus) $("mobile-menu-btn")?.focus();
}

function setupMobileDrawer() {
  const drawer = $("sidebar-drawer");
  const scroller = $("drawer-scroller");
  const sheet = $("drawer-sheet");
  const openBtn = $("mobile-menu-btn");
  const closeBtn = $("drawer-close-btn");
  const mainEl = $("main-content");
  const inspectorEl = $("inspector");
  if (!drawer || !scroller || !sheet || !openBtn || !closeBtn) return { closeDrawer: () => {} };

  function syncRole() {
    if (mobileDrawerMql.matches) {
      drawer.setAttribute("role", "dialog");
    } else {
      drawer.removeAttribute("role");
      if (isDrawerOpen() || drawer.matches(":popover-open")) forceCloseDrawer(false);
    }
  }
  syncRole();
  mobileDrawerMql.addEventListener("change", syncRole);

  async function openDrawer() {
    if (!mobileDrawerMql.matches || isDrawerOpen()) return;
    clearTimeout(drawerCloseTimer);
    clearTimeout(drawerOpenTimer);
    restoreDrawerFocus = true;
    drawerState = "opening";
    drawer.showPopover();
    mainEl.inert = true;
    inspectorEl.inert = true;
    drawer.setAttribute("aria-modal", "true");

    if (!CSS.supports("scroll-initial-target", "nearest")) {
      scroller.scrollTo({ left: scroller.offsetWidth, behavior: "instant" });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    } else {
      await new Promise((r) => requestAnimationFrame(r));
    }

    if (drawerState !== "opening") return;
    scroller.scrollTo({ left: 0, behavior: "auto" });

    drawerOpenTimer = setTimeout(() => {
      if (drawerState === "opening") {
        drawerState = "open";
        openBtn.setAttribute("aria-expanded", "true");
      }
    }, 320);
  }

  function closeDrawer(restoreFocus = true) {
    if (!isDrawerOpen()) return;
    clearTimeout(drawerOpenTimer);
    clearTimeout(drawerCloseTimer);
    drawerState = "closing";
    restoreDrawerFocus = restoreFocus;
    scroller.scrollTo({ left: scroller.offsetWidth, behavior: "auto" });
    drawerCloseTimer = setTimeout(() => {
      if (drawerState === "closing") {
        forceCloseDrawer(restoreDrawerFocus);
        restoreDrawerFocus = true;
      }
    }, 360);
  }

  function onDrawerOpened() {
    if (drawerState !== "opening" && drawerState !== "open") return;
    clearTimeout(drawerOpenTimer);
    drawerState = "open";
    openBtn.setAttribute("aria-expanded", "true");
  }

  function onDrawerClosed() {
    // Ignore initial off-screen intersection while opening or when already closed
    if (drawerState !== "open" && drawerState !== "closing") return;
    forceCloseDrawer(restoreDrawerFocus);
    restoreDrawerFocus = true;
  }

  const visibleThreshold = 0.02;
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries.at(-1);
      if (!entry) return;
      if (entry.intersectionRatio < visibleThreshold) onDrawerClosed();
      if (entry.intersectionRatio >= 0.95) onDrawerOpened();
    },
    { root: drawer, threshold: [0, visibleThreshold, 0.95, 1] }
  );
  observer.observe(sheet);

  if (!CSS.supports("animation-timeline: scroll()")) {
    scroller.addEventListener("scroll", () => {
      const w = sheet.offsetWidth || 1;
      const ratio = Math.max(0, Math.min(1, 1 - scroller.scrollLeft / w));
      drawer.style.setProperty("--drawer-backdrop", String(ratio));
    });
  }

  openBtn.addEventListener("click", openDrawer);
  closeBtn.addEventListener("click", () => closeDrawer(true));
  drawer.addEventListener("click", (e) => {
    if (isDrawerOpen() && !sheet.contains(e.target)) closeDrawer(true);
  });

  return { closeDrawer };
}

// ---------------- Event wiring ----------------
function bind() {
  const { closeDrawer } = setupMobileDrawer();
  const modLabel = MOD === "⌘" ? "⌘" : "Ctrl ";
  $("mod-key-hint").textContent = `${modLabel}K`;
  document.querySelectorAll(".list-hint .kbd, #toast-undo .kbd").forEach((el) => {
    if (el.textContent === "⌘Z") el.textContent = `${modLabel}Z`;
  });
  $("create-status").innerHTML = STATUSES.map((s) => `<option value="${s.id}">${s.icon} ${s.label}</option>`).join("");

  ["palette", "create-dialog", "shortcuts-dialog", "lightbox"].forEach((id) => enhanceModalDialog($(id)));

  $("open-palette-btn").addEventListener("click", () => {
    if (isDrawerOpen()) forceCloseDrawer(false);
    openPalette();
  });
  $("open-shortcuts-btn").addEventListener("click", () => {
    if (isDrawerOpen()) forceCloseDrawer(false);
    openShortcuts();
  });
  $("create-btn").addEventListener("click", openCreate);
  $("create-close").addEventListener("click", () => $("create-dialog").close());
  $("create-cancel").addEventListener("click", () => $("create-dialog").close());
  $("shortcuts-close").addEventListener("click", () => $("shortcuts-dialog").close());
  $("lightbox-close").addEventListener("click", () => $("lightbox").close());
  $("lightbox-prev").addEventListener("click", () => stepLightbox(-1));
  $("lightbox-next").addEventListener("click", () => stepLightbox(1));
  $("lightbox").addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      stepLightbox(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      stepLightbox(1);
    } else if (/^[1-6]$/.test(e.key)) {
      const refs = (refsMap[lightboxState.itemId] || []).slice(0, 6);
      const idx = Number(e.key) - 1;
      if (idx < refs.length) {
        e.preventDefault();
        lightboxState.index = idx;
        renderLightbox();
      }
    }
  });
  $("lightbox-strip")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-lightbox-idx]");
    if (btn) {
      lightboxState.index = Number(btn.dataset.lightboxIdx);
      renderLightbox();
    }
  });
  $("daily-bar")?.addEventListener("click", (e) => {
    const catBtn = e.target.closest("[data-daily-cat]");
    if (catBtn) {
      state.subCategory = catBtn.dataset.dailyCat;
      state.selectedId = null;
      render();
      return;
    }
    const modelBtn = e.target.closest("[data-daily-model]");
    if (modelBtn) {
      state.subModel = modelBtn.dataset.dailyModel;
      state.selectedId = null;
      render();
      return;
    }
    if (e.target.closest('[data-action="refresh-daily"]')) {
      syncDailyFeed(true);
    }
  });
  $("toast-undo").addEventListener("click", undo);

  // Native <form method="dialog"> submit (IME-safe: no custom Enter handler)
  $("create-form").addEventListener("submit", (e) => {
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") || "").trim();
    if (!title) {
      e.preventDefault();
      return;
    }
    createItem({
      title,
      type: String(fd.get("type")),
      status: String(fd.get("status")),
      category: String(fd.get("category") || "").trim(),
      modelName: String(fd.get("modelName") || "").trim(),
      domain: String(fd.get("domain") || "").trim(),
      essence: String(fd.get("essence") || "").trim(),
    });
  });

  $("view-nav").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-view]");
    if (btn) {
      setView(btn.dataset.view);
      if (isDrawerOpen()) closeDrawer(false);
    }
  });

  $("filter-input").addEventListener("input", (e) => {
    state.filter = e.target.value;
    render();
  });

  $("filter-input").addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (e.target.value) {
        e.target.value = "";
        state.filter = "";
        render();
      }
      $("item-list").focus();
    } else if (e.key === "ArrowDown" || (e.key === "Enter" && !e.isComposing && e.keyCode !== 229)) {
      e.preventDefault();
      $("item-list").focus();
    }
  });

  // Row click: select + open (instant, no animation)
  $("item-list").addEventListener("click", (e) => {
    const row = e.target.closest(".row");
    if (!row) return;
    select(row.dataset.id);
    openInspector();
  });

  // Inspector actions (delegated)
  $("inspector").addEventListener("click", (e) => {
    const refBtn = e.target.closest("[data-open-ref]");
    if (refBtn) return openLightbox(state.selectedId, Number(refBtn.dataset.openRef));
    const statusBtn = e.target.closest("[data-set-status]");
    if (statusBtn) return setStatus(state.selectedId, statusBtn.dataset.setStatus);
    const jumpBtn = e.target.closest("[data-jump-view]");
    if (jumpBtn) {
      const keepId = state.selectedId;
      state.view = jumpBtn.dataset.jumpView;
      state.subCategory = "all";
      state.subModel = "all";
      state.selectedId = keepId;
      render();
      scrollSelectedIntoView();
      return;
    }
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "close-inspector") closeInspector();
    else if (action === "toggle-star") toggleStar(state.selectedId);
    else if (action === "copy-prompt") copyPrompt(state.selectedId);
  });

  // Palette keyboard (IME-safe Enter)
  $("palette-input").addEventListener("input", () => {
    palette.active = 0;
    renderPalette();
  });
  $("palette-input").addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
      e.preventDefault();
      setPaletteActive(palette.active + 1);
    } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
      e.preventDefault();
      setPaletteActive(palette.active - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.isComposing || e.keyCode === 229) return;
      runPaletteCommand(palette.active);
    }
  });
  $("palette-list").addEventListener("pointermove", (e) => {
    const opt = e.target.closest(".palette-opt");
    if (opt && Number(opt.dataset.idx) !== palette.active) setPaletteActive(Number(opt.dataset.idx));
  });
  $("palette-list").addEventListener("click", (e) => {
    const opt = e.target.closest(".palette-opt");
    if (opt) runPaletteCommand(Number(opt.dataset.idx));
  });

  // Global keyboard contract
  document.addEventListener("keydown", (e) => {
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key;

    if (mod && key.toLowerCase() === "k") {
      e.preventDefault();
      if (!openDialog()) openPalette();
      return;
    }
    if (openDialog()) return; // dialogs own their keys (Esc handled natively)

    const typing = isTypingTarget(e.target);

    if (mod && key.toLowerCase() === "z" && !typing) {
      e.preventDefault();
      undo();
      return;
    }

    if (key === "Escape") {
      if (isDrawerOpen()) {
        e.preventDefault();
        closeDrawer(true);
        return;
      }
      if (!typing && state.inspectorOpen) {
        e.preventDefault();
        closeInspector();
      }
      return;
    }

    if (typing || mod || e.altKey) return;

    // Let native buttons/links handle Enter/Space themselves
    const onControl = e.target instanceof HTMLElement && e.target.closest("button, a, summary");
    if (onControl && (key === "Enter" || key === " ")) return;

    if (state.pendingG) {
      state.pendingG = false;
      clearTimeout(state.gTimer);
      const view = VIEWS.find((v) => v.go.toLowerCase() === key.toLowerCase());
      if (view) {
        e.preventDefault();
        setView(view.id);
      }
      return;
    }

    if (key === "?") {
      e.preventDefault();
      openShortcuts();
      return;
    }

    const status = STATUSES.find((s) => s.key === key);
    if (status && state.selectedId) {
      e.preventDefault();
      setStatus(state.selectedId, status.id);
      return;
    }

    switch (key.toLowerCase()) {
      case "j":
      case "arrowdown":
        e.preventDefault();
        moveSelection(1);
        break;
      case "k":
      case "arrowup":
        e.preventDefault();
        moveSelection(-1);
        break;
      case "enter":
      case " ":
        e.preventDefault();
        openInspector();
        break;
      case "c":
        e.preventDefault();
        armHotkeyCharGuard(key);
        openCreate();
        break;
      case "/":
        e.preventDefault();
        armHotkeyCharGuard(key);
        $("filter-input").focus();
        $("filter-input").select();
        break;
      case "s":
        if (state.selectedId) {
          e.preventDefault();
          toggleStar(state.selectedId);
        }
        break;
      case "g":
        e.preventDefault();
        state.pendingG = true;
        clearTimeout(state.gTimer);
        state.gTimer = setTimeout(() => (state.pendingG = false), 900);
        break;
    }
  });
}

bind();
render();
syncDailyFeed(false);
window.addEventListener("focus", maybeAutoSyncOnFocus);
document.addEventListener("visibilitychange", maybeAutoSyncOnFocus);
$("item-list").focus({ preventScroll: true });
