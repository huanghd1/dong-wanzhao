#!/usr/bin/env python3
"""
Autonomous Daily Data Updater for Design Vault (GitHub Actions & Local).

Fetches fresh AI web/design/game/product/app works from public upstream feeds,
selects a balanced batch across categories & model families, extracts optimized
local reference images (keeping repository & mobile payloads lean), and updates
data/daily-feed.json atomically.

Usage:
  python scripts/update-data.py
  python scripts/update-data.py --quota 8 --max-images 6
  python scripts/update-data.py --dry-run
"""
import argparse
import io
import json
import os
import re
import sys
import time
from pathlib import Path
from PIL import Image

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import daily_ai_harvest as h

ROOT = h.ROOT
REFS_DIR = h.REFS_DIR
FEED_PATH = h.FEED_PATH
CANDIDATES_PATH = h.CANDIDATES_PATH

CATEGORIES = ("design", "game", "web", "product", "app")
SOURCE_PRIORITY = {
    "VibeFather": 0,
    "Fable5.2-Showcase": 1,
    "MadeWithLovable": 2,
    "GitHub Trending": 3,
    "VibeFather-Index": 4,
    "Show HN": 5,
}


def clean_model_display(raw):
    txt = re.sub(r"<[^>]+>", " ", raw or "")
    txt = txt.replace("\xa0", " ")
    txt = re.sub(r"\s*[·|]\s*(Live demo|Prompt|DESIGN\.md).*$", "", txt, flags=re.I)
    txt = re.sub(r"\s+", " ", txt).strip(" ·,|")
    if len(txt) > 42:
        parts = [p.strip() for p in re.split(r"[,·/|]", txt) if p.strip()]
        txt = " / ".join(parts[:2])[:42]
    return txt


def fetch_design_md_dna(slug):
    """Fetch optional DESIGN.md from awesome-vibe-coding-websites to extract real design DNA."""
    if not slug:
        return []
    url = f"https://raw.githubusercontent.com/liyupi/awesome-vibe-coding-websites/main/templates/{slug}/DESIGN.md"
    txt = h.fetch_text(url, timeout=10)
    if not txt:
        return []

    dna = []
    hex_codes = list(dict.fromkeys(re.findall(r"#[0-9A-Fa-f]{6}\b", txt)))[:5]
    if hex_codes:
        dna.append(["核心色板", " / ".join(hex_codes)])

    fonts = []
    for m in re.finditer(r"(?:font-family|display|heading|body|mono)[^\n:]*[:：]\s*`?([A-Za-z][A-Za-z0-9\s,'\"-]+)`?", txt, re.I):
        val = m.group(1).strip().strip("`'\" ")
        if 2 <= len(val) <= 48 and val not in fonts:
            fonts.append(val)
    if fonts:
        dna.append(["字体体系", " · ".join(fonts[:3])])

    for line in txt.splitlines():
        s = line.strip()
        if s.startswith("> ") and len(s) > 16:
            dna.append(["设计定位", s[2:].strip()[:120]])
            break
    return dna[:4]


def fetch_og_image_url(page_url):
    """Best-effort og:image extraction for Show HN / VibeFather-Index pages."""
    html_text = h.fetch_text(page_url, timeout=10)
    if not html_text:
        return ""
    patterns = [
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)["\']',
        r'<meta[^>]+content=["\'](https?://[^"\']+)["\'][^>]+property=["\']og:image["\']',
        r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\'](https?://[^"\']+)["\']',
    ]
    for pat in patterns:
        m = re.search(pat, html_text, flags=re.I)
        if m:
            return m.group(1).strip()
    return ""


def save_optimized_refs(prefix, cand, max_images=6, max_webp_kb=550):
    """
    Download and save verified local images into assets/refs/.
    - Keeps animated WebP for slot 1 when <= max_webp_kb; otherwise extracts crisp JPG keyframes
      so mobile pages load fast and GitHub Pages stays well below storage limits.
    """
    built_refs = []
    title = cand.get("title", "AI 作品")
    animated_url = (cand.get("animatedWebp") or "").strip()
    preview_url = (cand.get("previewImg") or "").strip()

    if not animated_url and not preview_url and cand.get("url"):
        preview_url = fetch_og_image_url(cand["url"])

    if animated_url:
        raw = h.fetch_bytes(animated_url, timeout=22)
        with Image.open(io.BytesIO(raw)) as im:
            n_frames = getattr(im, "n_frames", 1)
            keep_webp = n_frames > 1 and (len(raw) / 1024.0) <= max_webp_kb

            captions = [
                ("动态实机录屏" if keep_webp else "首屏主视觉", "动态录屏" if keep_webp else "实机截帧", "完整首屏构图与交互状态预览。"),
                ("核心界面层次", "实机截帧", "主内容区排版、视觉对比与组件细节。"),
                ("交互状态（一）", "实机截帧", "关键交互过渡、筛选或切换视图。"),
                ("交互状态（二）", "实机截帧", "信息密度、栅格节奏与动效表现。"),
                ("细节组件特写", "实机截帧", "卡片层级、数据可视化或参数面板。"),
                ("页面收口结构", "实机截帧", "底部收尾、CTA 或完整功能闭环。"),
            ]

            slot = 1
            if keep_webp:
                dest = REFS_DIR / f"{prefix}-{slot}.webp"
                dest.write_bytes(raw)
                built_refs.append({
                    "title": f"{title} · {captions[0][0]}",
                    "tag": captions[0][1],
                    "src": f"./assets/refs/{dest.name}",
                    "caption": captions[0][2],
                })
                slot += 1
                pcts = [0.14, 0.32, 0.50, 0.70, 0.88][: max(0, max_images - 1)]
            else:
                if n_frames == 1:
                    pcts = [0.0]
                else:
                    count = min(max_images, n_frames)
                    pcts = [i / max(count - 1, 1) * 0.92 for i in range(count)]

            used_frames = set()
            for idx, pct in enumerate(pcts):
                if slot > max_images:
                    break
                fi = min(n_frames - 1, max(0, int((n_frames - 1) * pct)))
                if fi in used_frames and n_frames > 1:
                    continue
                used_frames.add(fi)
                im.seek(fi)
                fr = im.convert("RGB")
                w, ht = fr.size
                if w > 960:
                    fr = fr.resize((960, max(1, int(ht * 960 / w))), Image.Resampling.LANCZOS)
                elif w < 560:
                    scale = min(2.0, 720 / max(w, 1))
                    fr = fr.resize((int(w * scale), max(1, int(ht * scale))), Image.Resampling.LANCZOS)
                dest = REFS_DIR / f"{prefix}-{slot}.jpg"
                fr.save(dest, quality=80, optimize=True)
                cap_idx = min(slot - 1, len(captions) - 1)
                built_refs.append({
                    "title": f"{title} · {captions[cap_idx][0]}",
                    "tag": captions[cap_idx][1],
                    "src": f"./assets/refs/{dest.name}",
                    "caption": captions[cap_idx][2],
                })
                slot += 1
        return built_refs

    if preview_url:
        raw = h.fetch_bytes(preview_url, timeout=18)
        with Image.open(io.BytesIO(raw)) as im:
            fr = im.convert("RGB")
            w, ht = fr.size
            if w < 200 or ht < 120:
                return []
            if w > 960:
                fr = fr.resize((960, max(1, int(ht * 960 / w))), Image.Resampling.LANCZOS)
            dest = REFS_DIR / f"{prefix}-1.jpg"
            fr.save(dest, quality=82, optimize=True)
            built_refs.append({
                "title": f"{title} · 实机预览",
                "tag": "实机预览",
                "src": f"./assets/refs/{dest.name}",
                "caption": (cand.get("description") or "上游精选来源自动抓取的视觉预览图。")[:140],
            })
        return built_refs

    return []


def select_balanced_candidates(candidates, quota):
    """
    Pick up to `quota` candidates balanced across all 5 categories and both model families,
    strongly preferring visual-rich sources with verified media URLs.
    """
    def rank_key(c):
        has_media = 0 if (c.get("animatedWebp") or c.get("previewImg")) else 1
        src_rank = SOURCE_PRIORITY.get(c.get("source", ""), 9)
        pts = -(c.get("points") or 0)
        return (has_media, src_rank, pts)

    sorted_pool = sorted(candidates, key=rank_key)
    buckets = {cat: [] for cat in CATEGORIES}
    for c in sorted_pool:
        cat = c.get("categoryHint", "web")
        if cat not in buckets:
            cat = "web"
        buckets[cat].append(c)

    selected = []
    seen_urls = set()

    def try_take(cat, prefer_family=None):
        pool = buckets[cat]
        if prefer_family:
            for i, c in enumerate(pool):
                u = (c.get("url") or "").lower()
                if u in seen_urls:
                    continue
                if c.get("modelFamilyHint") == prefer_family:
                    seen_urls.add(u)
                    return pool.pop(i)
        for i, c in enumerate(pool):
            u = (c.get("url") or "").lower()
            if u in seen_urls:
                continue
            seen_urls.add(u)
            return pool.pop(i)
        return None

    # Round-robin across categories while alternating Claude / other model preference
    want_claude = True
    while len(selected) < quota * 2:  # keep 2x candidate buffer in case a download fails
        progressed = False
        for cat in CATEGORIES:
            if len(selected) >= quota * 2:
                break
            picked = try_take(cat, "claude" if want_claude else "other")
            if picked:
                selected.append(picked)
                want_claude = not want_claude
                progressed = True
        if not progressed:
            break

    return selected


def build_item(cand, key, item_id, date_str, now_ms, idx, refs):
    cat = cand.get("categoryHint", "web")
    if cat not in h.CATEGORY_META:
        cat = "web"
    raw_model = clean_model_display(cand.get("models") or cand.get("modelNameHint") or "")
    model_family, model_name = h.infer_model_info({
        "modelFamily": cand.get("modelFamilyHint", ""),
        "modelName": raw_model,
        "title": cand.get("title", ""),
        "sourceUrl": cand.get("url", ""),
    })
    model_name = clean_model_display(model_name) or ("Claude Fable 5.2" if model_family == "claude" else "Multi-Model AI")
    routed_views = h.compute_routed_views(cat, model_family)

    desc = (cand.get("description") or "").strip()
    source = cand.get("source") or "Upstream"
    cat_cn = h.CATEGORY_META[cat]
    essence = desc if desc else f"来自 {source} 的 AI 生成{cat_cn}精选作品，由 {model_name} 驱动构建。"

    dna = []
    if cand.get("slug") and source.startswith("VibeFather"):
        dna.extend(fetch_design_md_dna(cand["slug"]))
    if not dna:
        dna = [
            ["来源渠道", source],
            ["模型家族", f"{model_name}（{'Claude 系列' if model_family == 'claude' else '其他模型'}）"],
            ["自动归类", f"{cat_cn} · {' / '.join(routed_views)}"],
        ]

    notes = [
        f"GitHub Actions 每日自动采集入库（来源：{source}），点击右上角「打开来源」可体验原站与完整细节。",
        "复刻时请优先提取其布局节奏、对比度层级与交互状态反馈，避免直接照搬装饰元素。",
    ]

    labels = list(dict.fromkeys([cat_cn, model_name, source]))[:4]
    return {
        "id": item_id,
        "key": key,
        "type": "daily",
        "category": cat,
        "modelFamily": model_family,
        "modelName": model_name,
        "routedViews": routed_views,
        "discoveredDate": date_str,
        "title": (cand.get("title") or "Untitled AI Work").strip(),
        "domain": f"每日精选 / {cat_cn} · {source}",
        "status": "backlog",
        "priority": 2,
        "starred": False,
        "labels": labels,
        "essence": essence,
        "dna": dna,
        "notes": notes,
        "notesLabel": "自动化采集备注",
        "sourceUrl": (cand.get("url") or "").strip(),
        "updatedAt": now_ms - idx * 1000,
        "refs": refs,
    }


def prune_old_daily_items(feed, max_items):
    """Keep rolling window of auto-harvested daily items and remove orphaned daily-* images."""
    items = feed.get("items", [])
    if max_items <= 0 or len(items) <= max_items:
        return 0
    kept = items[:max_items]
    dropped = items[max_items:]
    feed["items"] = kept

    still_used = {
        r["src"].lstrip("./")
        for it in kept
        for r in it.get("refs", [])
        if r.get("src")
    }
    removed_files = 0
    for it in dropped:
        for r in it.get("refs", []):
            src = (r.get("src") or "").lstrip("./")
            if src.startswith("assets/refs/daily-") and src not in still_used:
                fp = ROOT / src
                if fp.exists():
                    fp.unlink()
                    removed_files += 1
    if removed_files:
        print(f"[PRUNE] Trimmed {len(dropped)} old items and removed {removed_files} orphaned daily refs.")
    return len(dropped)


def cleanup_prefix(prefix):
    for fp in REFS_DIR.glob(f"{prefix}-*"):
        try:
            fp.unlink()
        except OSError:
            pass


def main():
    parser = argparse.ArgumentParser(description="Autonomous daily AI design vault data updater")
    parser.add_argument("--quota", type=int, default=int(os.environ.get("DAILY_QUOTA", "8")), help="Number of new works to add per run (default: 8)")
    parser.add_argument("--max-images", type=int, default=int(os.environ.get("MAX_IMAGES_PER_WORK", "6")), help="Max images saved per work (default: 6)")
    parser.add_argument("--max-webp-kb", type=int, default=int(os.environ.get("MAX_WEBP_KB", "550")), help="Max KB to keep animated WebP intact (default: 550)")
    parser.add_argument("--max-items", type=int, default=int(os.environ.get("MAX_FEED_ITEMS", "120")), help="Rolling cap of daily feed items (default: 120)")
    parser.add_argument("--dry-run", action="store_true", help="Discover and select candidates without downloading images or modifying daily-feed.json")
    parser.add_argument("--skip-discover", action="store_true", help="Reuse existing data/candidates-latest.json instead of fetching upstream feeds")
    args = parser.parse_args()

    quota = max(1, min(args.quota, 24))
    max_images = max(1, min(args.max_images, 6))

    if not args.skip_discover:
        print("[1/3] Discovering fresh candidates from upstream sources...", flush=True)
        h.cmd_discover()
    elif not CANDIDATES_PATH.exists():
        print("[ERROR] --skip-discover used but data/candidates-latest.json does not exist.", file=sys.stderr)
        sys.exit(1)

    payload = json.loads(CANDIDATES_PATH.read_text(encoding="utf-8"))
    candidates = payload.get("candidates", [])
    if not candidates:
        print("[WARN] Zero fresh candidates discovered; keeping existing data/daily-feed.json unchanged.")
        return

    chosen_pool = select_balanced_candidates(candidates, quota)
    print(f"[2/3] Ranked {len(chosen_pool)} balanced candidates (target quota={quota}).", flush=True)

    if args.dry_run:
        for i, c in enumerate(chosen_pool[:quota], 1):
            print(f"  {i:02d}. [{c.get('categoryHint')}/{c.get('modelFamilyHint')}] ({c.get('source')}) {c.get('title')} -> {c.get('url')}")
        print("[DRY-RUN] No files modified.")
        return

    feed = h.load_feed()
    seen_urls, seen_titles = h.existing_urls_and_keys()
    existing_nums = [
        int(m.group(1))
        for it in feed.get("items", [])
        for m in [re.match(r"DY-(\d+)", it.get("key", ""))]
        if m
    ]
    next_num = max(existing_nums, default=0) + 1
    date_tag = h.today_compact()
    date_str = h.today_dash()
    now_ms = int(time.time() * 1000)

    print(f"[3/3] Ingesting up to {quota} verified works into {FEED_PATH}...", flush=True)
    ingested = []
    for cand in chosen_pool:
        if len(ingested) >= quota:
            break
        src_url = (cand.get("url") or "").split("?")[0].rstrip("/").lower()
        title_key = (cand.get("title") or "").strip().lower()
        if not src_url or src_url in seen_urls or title_key in seen_titles:
            continue

        key = f"DY-{next_num}"
        item_id = f"dy-{date_tag}-{next_num}"
        prefix = f"daily-{date_tag}-{next_num}"

        try:
            refs = save_optimized_refs(prefix, cand, max_images=max_images, max_webp_kb=args.max_webp_kb)
        except Exception as e:
            print(f"  [SKIP] {cand.get('title')} ({cand.get('source')}): media fetch failed -> {e}", file=sys.stderr, flush=True)
            cleanup_prefix(prefix)
            continue

        # Verify all saved files exist on disk
        refs = [r for r in refs if (ROOT / r["src"].lstrip("./")).exists()]
        if not refs:
            print(f"  [SKIP] {cand.get('title')} ({cand.get('source')}): no valid preview image", flush=True)
            cleanup_prefix(prefix)
            continue

        item = build_item(cand, key, item_id, date_str, now_ms, len(ingested) + 1, refs)
        ingested.append(item)
        seen_urls.add(src_url)
        seen_titles.add(title_key)
        next_num += 1
        print(f"  [OK] {key} [{item['category']}/{item['modelFamily']}] {item['title']} ({len(refs)} imgs)", flush=True)

    if not ingested:
        print("[WARN] No new works could be ingested this run; existing feed left untouched.")
        return

    feed["schemaVersion"] = 2
    feed["schedule"] = "GitHub Actions Daily 09:00 Asia/Shanghai (01:00 UTC)"
    feed["dailyQuota"] = quota
    feed["maxImagesPerWork"] = max_images
    feed["items"] = ingested + feed.get("items", [])
    prune_old_daily_items(feed, args.max_items)
    feed["lastUpdatedAt"] = h.now_iso()

    cats_hit = " / ".join(sorted({h.CATEGORY_META[i["category"]] for i in ingested}))
    c_cnt = sum(1 for i in ingested if i["modelFamily"] == "claude")
    o_cnt = len(ingested) - c_cnt
    total_imgs = sum(len(i["refs"]) for i in ingested)
    feed["lastRunSummary"] = (
        f"{date_str} 自动新增 {len(ingested)} 部（{cats_hit} · Claude {c_cnt} / 其他模型 {o_cnt}），"
        f"共 {total_imgs} 张图并自动归类"
    )
    h.save_feed(feed)
    print(f"DONE: Added {len(ingested)} works ({total_imgs} images). Total daily feed items: {len(feed['items'])}.")


if __name__ == "__main__":
    main()
