---
name: stripe-editorial-dx
version: "2.0.0"
benchmark: "02 · Stripe (Web / Docs / Press)"
category: "Complex Systems / Interactive Web / Developer Experience"
compatible_agents: ["Antigravity", "Claude Code", "Cursor", "Google Stitch", "v0"]
wcag_target: "AA (AAA on primary body text)"
---

# DESIGN.md — 02 · Stripe (Web / Docs / Press) Design System

> **Core Thesis:** Turn dense technical infrastructure, prompts, and complex workflows into calm, luminous editorial artifacts. Pair crisp light-mode editorial readability (Stripe Web & Press) with deep-navy precision code consoles (Stripe Docs), unified by architectural vertical grid rails, subtle diagonal section geometry, and progressive disclosure.

---

## 1. Visual Theme & Atmosphere

- **Surface Polarity:** Light-first editorial canvas (`#FFFFFF` alternating with cool architectural slate `#F6F9FC`), punctuated by intentional Deep Ink Navy (`#0A2540`) sections for technical anatomy, interactive code blocks, and high-focus developer consoles.
- **Signature Geometry:**
  - **Architectural Guide Rails:** Subtle 4-column hairline structural grid (`1px` dashed/solid vertical rails at `rgba(10, 37, 64, 0.06)`) anchoring content alignment across full-bleed bands.
  - **Diagonal Section Slants:** Subtle `-4deg` to `-6deg` diagonal band transitions separating the living Hero Mesh from white content and separating Light Editorial from Deep Ink Technical zones.
  - **Living Chromatic Mesh (Hero Only):** Smooth, organic multi-stop animated mesh gradient (`#635BFF` Blurple, `#00D4FF` Cyan, `#FF5A5F` Coral, `#FFCB57` Solar Amber) strictly confined to the Hero backdrop—never bleeding into reading content.
- **Density:** Calm, authoritative, high-clarity technical editorial. Never cramped like a trading terminal, never airy-empty like a perfume ad.

---

## 2. Color Palette & Semantic Roles

| Role | Token | Value | Usage Rule |
| :--- | :--- | :--- | :--- |
| **Primary Ink** | `--color-ink-primary` | `#0A2540` | Headlines, primary UI text, deep technical surfaces. **Never use pure `#000000`.** |
| **Body Ink** | `--color-ink-secondary` | `#425466` | Paragraphs, descriptions, editorial prose (Contrast > 7.5:1 on white). |
| **Muted Ink** | `--color-ink-muted` | `#697386` | Metadata, timestamps, axis labels, subtle hints. |
| **Canvas Light** | `--color-surface-canvas` | `#FFFFFF` | Default reading canvas, cards, modals. |
| **Canvas Subtle** | `--color-surface-subtle` | `#F6F9FC` | Alternating section bands, recessed metadata trays, search bars. |
| **Code Canvas** | `--color-surface-code` | `#0A2540` | Interactive API/Prompt consoles, deep technical walkthrough band. |
| **Code Elevated** | `--color-surface-code-elevated` | `#0E2E4E` | Active code panels, console headers, tab surfaces inside dark bands. |
| **Brand Accent** | `--color-accent-primary` | `#635BFF` | Interactive links, primary actions, active tabs, focus indicators. |
| **Brand Accent Hover** | `--color-accent-hover` | `#4B43E6` | Hover state for primary interactive elements. |
| **Technical Cyan** | `--color-accent-cyan` | `#00D4FF` | Syntax highlights, active markers, telemetry values **strictly on dark navy surfaces**. |
| **Verified Emerald** | `--color-status-success` | `#00A67E` | Verified builds, passing status, single-prompt badges. |
| **Press Amber** | `--color-status-amber` | `#E07A00` | Effort warnings, experimental/long-horizon callouts. |
| **Hairline Border** | `--color-border-hairline` | `rgba(10, 37, 64, 0.09)` | Card outlines, dividers, table rows, guide rails. |

---

## 3. Typography & Hierarchy

- **UI & Display Font:** `"Inter", -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif`
- **Technical Monospace:** `"JetBrains Mono", "SFMono-Regular", Menlo, Consolas, monospace`
- **Editorial Accent (Stripe Press):** `"Newsreader", "Georgia", "Songti SC", serif` (sparingly for Press monograph badges / pull quotes)

| Level | Size (`clamp`) | Weight | Tracking | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display H1** | `clamp(2.5rem, 5vw, 4.125rem)` | `700` | `-0.038em` | `1.06` | Hero primary statement |
| **Section H2** | `clamp(1.75rem, 3vw, 2.5rem)` | `700` | `-0.03em` | `1.15` | Major band headings |
| **Card / Doc H3** | `1.1875rem` (19px) | `650` | `-0.018em` | `1.32` | Artifact titles, inspector headers |
| **Body Lead** | `1.125rem` (18px) | `400` | `-0.005em` | `1.65` | Hero subhead, editorial lead |
| **Body Base** | `0.9375rem` (15px) | `400` | `0` | `1.65` | Descriptions, documentation prose |
| **Code / Spec** | `0.8125rem` (13px) | `450` | `0` | `1.62` | Prompts, JSON, MCP config, tokens |
| **Eyebrow / Kicker** | `0.8125rem` (13px) | `650` | `0.02em` | `1.3` | Colored category eyebrows above H2 |

---

## 4. Layout, Spacing & Elevation

- **Max Content Width:** `1160px` (`72.5rem`) with generous responsive horizontal gutters (`clamp(1.25rem, 4vw, 2.5rem)`).
- **Spacing Grid:** Strict `4px` base unit (`4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`).
- **Border Radius:** Crisp technical curvature—**NOT puffy pill-blobs**:
  - Inputs, tags, inline code: `6px`
  - Cards, consoles, buttons: `8px` – `10px`
  - Dialogs, hero preview frames: `12px` – `14px`
- **Stripe Dual-Layer Crisp Shadows:** Combine one tight ambient hairline shadow (`rgba(50, 50, 93, 0.08)`) with one soft directional float shadow (`rgba(0, 0, 0, 0.06)`). Never use blurry colored neon glow shadows.

---

## 5. Signature Interaction Patterns (Progressive Disclosure)

1. **Three-Level Progressive Disclosure:**
   - **L0 (Scan):** Clean card with crisp schematic visual, 1-line essence, category & model-effort pill.
   - **L1 (Quick Peek):** Native `<details>` inline disclosure right on the card revealing core Prompt strategy & breakthrough—zero page jump, browser find-in-page searchable.
   - **L2 (Deep Technical Inspector):** Native `<dialog closedby="any">` two-column Stripe Docs drawer/modal pairing editorial analysis (left) with sticky copyable Prompt / MCP JSON / Repro Checklist (right).
2. **Coupled Narrative ↔ Code Walkthrough:**
   - Selecting any conceptual step on the left immediately morphs the deep-navy code & telemetry console on the right with highlighted lines and live metadata.
3. **Interactive Micro-Feedback:**
   - Arrows (`→`) shift `3px` right on link hover.
   - Copy buttons switch cleanly to `Copied ✓` with an emerald indicator without shifting button width.
   - All motion respects `@media (prefers-reduced-motion: reduce)`.

---

## 6. Hard Guardrails (Do's & Don'ts — Anti-AI-Slop Rules)

### DO
- **DO** anchor light sections with `#0A2540` ink and crisp `1px` borders—let typography and spacing create authority.
- **DO** use real technical artifacts (prompts, JSON schemas, architecture schematics, token tables) as first-class visual elements.
- **DO** keep interactive dialogs/accordions built on native HTML (`<dialog>`, `<details>`, `<search>`, `<figure>`) with CSS `@layer` cascade discipline.
- **DO** reserve `#00D4FF` cyan strictly for dark navy code surfaces so text contrast never fails WCAG AA.

### DON'T (Zero-Tolerance Blacklist)
- **DON'T** put purple-to-pink glowing gradients on cards, buttons, or headings ("generic AI landing page slop").
- **DON'T** use heavy `24px+` puffy border-radius on content cards or chunky neon drop-shadows.
- **DON'T** dump 800 words of prompt text directly onto a gallery card—always layer it behind L1/L2 progressive disclosure.
- **DON'T** use pure `#000000` black backgrounds or pure `#000000` body text.
- **DON'T** exceed 2 font families per view (1 Sans + 1 Mono; Press Serif only for dedicated monograph covers).
