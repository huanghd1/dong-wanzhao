---
name: linear-precision-dark
version: "1.0.0"
benchmark: "01 · Linear"
category: "Digital Software / Precision UI"
compatible_agents: ["Antigravity", "Claude Code", "Cursor", "Google Stitch", "v0"]
wcag_target: "AA (primary text AAA)"
color_space: "LCH / OKLCH (perceptually uniform)"
---

# DESIGN.md — 01 · Linear Precision Dark

> **Core Thesis:** Software should feel like a precision instrument. Zero perceived latency, near-black LCH-tuned surfaces separated by hairlines rather than shadows, extreme information density without visual noise, and every action reachable from the keyboard in ≤ 2 keystrokes.

---

## 1. Visual Theme & Atmosphere

- **Polarity:** Dark-first. Base canvas is near-black with a faint cool tint (`lch(4% 1 270)` ≈ `#08090A`), never pure `#000`.
- **Depth model:** Layers are separated by **lightness steps of ~2–3 L\*** and **1px hairline borders** (`rgb(255 255 255 / 0.06–0.10)`), not by drop shadows. Shadows appear only on floating overlays (command palette, menus).
- **Density:** High. Row height `34px`, base UI text `13px`. Information-dense like an IDE, calm like a notebook.
- **Accent discipline:** One brand accent (Linear Indigo `lch(48% 59 288)` ≈ `#5E6AD2`) used only for focus, selection, and the primary action. Status colors are muted and always paired with a shape icon.
- **Light leak:** At most ONE subtle radial highlight (≤ 8% opacity) at the top of the app shell. No gradients on components.

## 2. Color Palette (LCH-tuned) & Semantic Roles

| Role | Token | LCH | Approx Hex | Rule |
| :--- | :--- | :--- | :--- | :--- |
| Canvas | `--bg-canvas` | `lch(3.5% 1 270)` | `#08090A` | App background |
| Panel | `--bg-panel` | `lch(6% 1.5 270)` | `#0F1011` | Sidebar, list body |
| Elevated | `--bg-elevated` | `lch(9% 2 270)` | `#161718` | Inspector, hovered row, inputs |
| Overlay | `--bg-overlay` | `lch(12% 2.5 270)` | `#1C1D1F` | Palette, menus, dialogs |
| Text Primary | `--text-primary` | `lch(97% 0.5 270)` | `#F7F8F8` | Titles, active labels |
| Text Secondary | `--text-secondary` | `lch(72% 3 270)` | `#B4B8BF` | Body copy |
| Text Muted | `--text-muted` | `lch(59% 4 270)` | `#8A8F98` | Metadata, IDs, hints (≥ 4.5:1 on Panel) |
| Accent | `--accent` | `lch(48% 59 288)` | `#5E6AD2` | Focus ring, selected row bar, primary button |
| Accent Text | `--accent-text` | `lch(70% 40 288)` | `#9EA6F5` | Accent-colored text on dark (contrast-safe) |
| Hairline | `--border-subtle` | `rgb(255 255 255 / 0.06)` | — | Row separators |
| Border | `--border-default` | `rgb(255 255 255 / 0.10)` | — | Panels, cards |
| Border Strong | `--border-strong` | `rgb(255 255 255 / 0.18)` | — | Inputs, kbd hints (≥ 3:1 component boundary) |

**Status (always icon + color, never color alone):**
Backlog `◌` gray · Studying `◐` amber `lch(75% 60 75)` · Extracting `◑` indigo · In Vault `●` green `lch(70% 50 150)` · Archived `⊘` muted.

## 3. Typography

- **UI Font:** `"Inter Variable", "Inter", -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif` with `font-feature-settings: "cv01", "ss03"`.
- **Mono:** `"JetBrains Mono", "Berkeley Mono", "Cascadia Code", monospace` for IDs, keys, tokens.

| Level | Size | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- |
| Page title | `15px` | 600 | `-0.01em` | View header |
| Inspector title | `20px` | 600 | `-0.02em` | Detail panel heading |
| UI base | `13px` | 450–500 | `0` | Rows, sidebar, buttons |
| Meta | `12px` | 450 | `0` | Labels, IDs, timestamps |
| Kbd | `11px` | 500 | `0.02em` | Shortcut hints |

## 4. Layout, Spacing, Shape

- **Shell:** `Sidebar 232px | List (fluid) | Inspector 420px` (Inspector collapses to overlay < 1100px).
- **Grid:** 4px base. Row padding `0 16px`, list row height `34px`, sidebar item `28px`.
- **Radius:** `4px` controls/kbd · `6px` buttons/rows · `8px` panels · `12px` palette/dialog. Never > 12px.
- **Elevation:** Only overlays: `0 0 0 1px border-default, 0 16px 48px rgb(0 0 0 / 0.5)`.

## 5. Motion & "Zero-Latency" Feel

- **Optimistic UI:** Every mutation applies to local state and repaints in the same frame (< 16ms). Persistence is async; failure shows a toast with **Undo (⌘Z)**.
- **Durations:** Hover/selection `0ms` (instant), overlays `120–160ms` `cubic-bezier(0.25, 0.1, 0.25, 1)`, never > 200ms.
- **No spinners for local actions.** Skeletons are forbidden for in-memory data.
- Respect `prefers-reduced-motion: reduce` → fades only, ≤ 100ms.

## 6. Keyboard-First Interaction Contract

| Key | Action |
| :--- | :--- |
| `⌘K` / `Ctrl K` | Command palette (search + every action) |
| `J` / `K` or `↓` / `↑` | Move selection |
| `Enter` / `Space` | Open inspector for selected item |
| `Esc` | Close the top-most layer (palette → inspector → filter) |
| `C` | Create new item |
| `/` | Focus filter |
| `S` | Toggle star |
| `1`–`5` | Set status (Backlog / Studying / Extracting / In Vault / Archived) |
| `G` then `A` / `B` / `F` / `S` | Go to All / Benchmarks / Fable works / Starred |
| `⌘Z` / `Ctrl Z` | Undo last change |
| `?` | Shortcut cheat sheet |

- Every shortcut also has a visible clickable path and is discoverable via `⌘K` with its `kbd` hint shown on the right.
- Single-letter shortcuts are ignored while focus is in a text field.
- Enter handlers in text fields MUST be IME-safe (`event.isComposing || event.keyCode === 229`).

## 7. Hard Guardrails

### DO
- **DO** separate layers with lightness steps + hairlines; let alignment create order.
- **DO** show a `kbd` hint next to every action in menus and the palette.
- **DO** keep the selected row visible with a 2px accent bar + elevated background (not color alone).
- **DO** use `color-mix(in oklab, …)` for hover/pressed tints of the accent.

### DON'T
- **DON'T** use pure `#000000` or pure `#FFFFFF` surfaces.
- **DON'T** use glowing neon gradients, glassmorphism on content, or drop shadows on rows/cards.
- **DON'T** add loading spinners or fake delays to local actions.
- **DON'T** exceed one accent hue; status hues stay muted (chroma ≤ 60).
- **DON'T** make any feature mouse-only.
