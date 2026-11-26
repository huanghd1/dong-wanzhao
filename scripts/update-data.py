#!/usr/bin/env python3
"""
Autonomous Daily Updater for 东东设计万物 (Design Vault) — GitHub Actions & Local.

Fetches 5 fresh world design & 3D product showcase works daily across:
  1. 建筑 (architecture)   — ArchDaily RSS + Sketchfab Architecture Staff Picks
  2. 工业 (industrial)     — Sketchfab Industrial / Science-Tech Staff Picks
  3. 美术 (art)            — Sketchfab Art & Cultural Heritage Staff Picks
  4. 渲染 (render)         — Sketchfab Global Staff Picks PBR 3D Renders
  5. 商品 3D 展板 (product3d) — Rotating iPhone / Car / CNC Machine / Robot / Camera / Watch 3D models

Every ingested work has a verified local JPEG preview image saved in assets/refs/,
and automatically routes into 「每日精选」 + 「世界设计大奖」 or 「商品 3D 展板」.

Usage:
  python scripts/update-data.py
  python scripts/update-data.py --quota 5
  python scripts/update-data.py --dry-run
"""
import argparse
import datetime
import html
import io
import json
import os
import re
import ssl
import subprocess
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
REFS_DIR = ROOT / "assets" / "refs"
FEED_PATH = DATA_DIR / "daily-feed.json"
SEED_DATA_JS = ROOT / "src" / "linear" / "data.js"

DATA_DIR.mkdir(parents=True, exist_ok=True)
REFS_DIR.mkdir(parents=True, exist_ok=True)

UA = "DongDongDesignVault/1.0 (https://github.com/huanghd1/dong-wanzhao)"
CTX = ssl._create_unverified_context()
TZ_CN = datetime.timezone(datetime.timedelta(hours=8))

CATEGORY_META = {
    "architecture": "建筑",
    "industrial": "工业设计",
    "art": "美术",
    "render": "3D 渲染",
    "spatial": "空间展陈",
    "product3d": "商品 3D 展板",
}

PRODUCT3D_QUERIES = [
    ("phone", "iphone pro", "手机数码"),
    ("car", "porsche 911", "汽车出行"),
    ("cnc", "cnc lathe", "工业机床"),
    ("robot", "industrial robot arm", "工业装备"),
    ("watch", "mechanical watch", "精密腕表"),
    ("car", "supercar ferrari", "汽车出行"),
    ("cnc", "milling machine", "工业机床"),
    ("watch", "leica camera", "精密影像"),
    ("phone", "headphones studio", "声学数码"),
    ("robot", "jet engine turbine", "工业装备"),
]


def now_iso():
    return datetime.datetime.now(TZ_CN).isoformat(timespec="seconds")


def today_compact():
    return datetime.datetime.now(TZ_CN).strftime("%Y%m%d")


def today_dash():
    return datetime.datetime.now(TZ_CN).strftime("%Y-%m-%d")


def fetch_bytes(url, timeout=18, retries=2):
    last_err = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
                data = resp.read()
                if data:
                    return data
        except Exception as e:
            last_err = e
        # Fallback to curl (handles Windows proxy TLS smoothly)
        try:
            curl_bin = "curl.exe" if os.name == "nt" else "curl"
            r = subprocess.run(
                [curl_bin, "-sL", "--max-time", str(timeout), "-H", f"User-Agent: {UA}", url],
                capture_output=True,
            )
            if r.returncode == 0 and r.stdout:
                return r.stdout
        except Exception as e:
            last_err = e
        if attempt < retries:
            time.sleep(0.6)
    raise RuntimeError(f"Failed to fetch {url[:80]}: {last_err}")


def fetch_text(url, timeout=15):
    try:
        return fetch_bytes(url, timeout=timeout, retries=1).decode("utf-8", "ignore")
    except Exception as e:
        print(f"[WARN] fetch failed: {url[:75]} -> {e}", file=sys.stderr, flush=True)
        return ""


def fetch_json(url, timeout=15):
    txt = fetch_text(url, timeout=timeout)
    if not txt.strip():
        return {}
    try:
        return json.loads(txt)
    except Exception as e:
        print(f"[WARN] json parse failed: {url[:75]} -> {e}", file=sys.stderr, flush=True)
        return {}


def load_feed():
    if FEED_PATH.exists():
        try:
            data = json.loads(FEED_PATH.read_text(encoding="utf-8"))
            data.setdefault("schemaVersion", 2)
            return data
        except Exception:
            pass
    return {
        "schemaVersion": 2,
        "schedule": "GitHub Actions Daily 09:00 Asia/Shanghai (01:00 UTC)",
        "dailyQuota": 5,
        "maxImagesPerWork": 6,
        "lastUpdatedAt": None,
        "lastRunSummary": "等待每日自动抓取（每日 5 部世界设计大奖与商品 3D 展板）",
        "categories": list(CATEGORY_META.keys()),
        "items": [],
    }


def save_feed(feed):
    tmp = FEED_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(feed, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(FEED_PATH)


def existing_urls_and_titles():
    seen_urls, seen_titles = set(), set()
    feed = load_feed()
    for it in feed.get("items", []):
        if it.get("sourceUrl"):
            seen_urls.add(it["sourceUrl"].split("?")[0].rstrip("/").lower())
        if it.get("title"):
            seen_titles.add(it["title"].strip().lower())
    if SEED_DATA_JS.exists():
        txt = SEED_DATA_JS.read_text(encoding="utf-8", errors="ignore")
        for u in re.findall(r'sourceUrl:\s*"([^"]+)"', txt):
            seen_urls.add(u.split("?")[0].rstrip("/").lower())
    return seen_urls, seen_titles


def best_sketchfab_thumb(model):
    imgs = model.get("thumbnails", {}).get("images", [])
    if not imgs:
        return ""
    imgs = sorted(imgs, key=lambda x: -(x.get("width") or 0))
    for im in imgs:
        if 720 <= (im.get("width") or 0) <= 1920:
            return im.get("url", "")
    return imgs[0].get("url", "")


def clean_plain_text(raw, limit=220):
    txt = html.unescape(re.sub(r"<[^>]+>", " ", raw or ""))
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt[:limit]


def discover_world_and_3d_candidates():
    """Fetch fresh candidates across Architecture, Industrial, Art, 3D Render, and Product 3D Boards."""
    seen_urls, seen_titles = existing_urls_and_titles()
    buckets = {k: [] for k in ("architecture", "industrial", "art", "render", "product3d")}
    added = set()

    def push(cat, cand):
        u = (cand.get("url") or "").split("?")[0].rstrip("/").lower()
        t = (cand.get("title") or "").strip().lower()
        if not u or not cand.get("img") or u in seen_urls or u in added or t in seen_titles:
            return
        added.add(u)
        buckets[cat].append(cand)

    # 1. ArchDaily RSS — fresh global architecture masterpieces
    rss_xml = fetch_text("https://www.archdaily.com/rss", timeout=15)
    if rss_xml:
        try:
            root = ET.fromstring(rss_xml)
            for item in root.findall(".//item")[:20]:
                title = clean_plain_text(item.findtext("title"), 120)
                link = (item.findtext("link") or "").strip()
                desc_raw = item.findtext("description") or ""
                img = ""
                for enc in item.findall("enclosure"):
                    if enc.attrib.get("url"):
                        img = enc.attrib["url"]
                        break
                if not img:
                    m_img = re.search(r'<img[^>]+src=["\'](https?://[^"\']+)["\']', desc_raw, re.I)
                    if m_img:
                        img = m_img.group(1)
                if not img:
                    for el in item:
                        if el.tag.endswith("content") and el.attrib.get("url"):
                            img = el.attrib["url"]
                            break
                desc = clean_plain_text(desc_raw, 200)
                if re.match(r"^(open call|call for|competition|subscribe|podcast)", title, re.I):
                    continue
                if title and link and img:
                    push("architecture", {
                        "source": "ArchDaily",
                        "title": title,
                        "url": link,
                        "img": img,
                        "author": "ArchDaily Featured",
                        "description": desc or f"ArchDaily 全球建筑精选：{title}",
                        "tags": ["建筑", "ArchDaily", "国际建筑"],
                    })
        except Exception as e:
            print(f"[WARN] ArchDaily RSS parse failed: {e}", file=sys.stderr, flush=True)

    # 2. Sketchfab Staff Picks & Curated Discipline Searches
    sf_queries = [
        ("architecture", "https://api.sketchfab.com/v3/models?staffpicked=true&categories=architecture&sort_by=-publishedAt&count=12", "Sketchfab Architecture", None),
        ("industrial", "https://api.sketchfab.com/v3/models?staffpicked=true&categories=science-technology&sort_by=-publishedAt&count=12", "Sketchfab Industrial", None),
        ("art", "https://api.sketchfab.com/v3/models?staffpicked=true&categories=art-abstract&sort_by=-publishedAt&count=12", "Sketchfab Fine Art", None),
        ("render", "https://api.sketchfab.com/v3/models?staffpicked=true&sort_by=-publishedAt&count=16", "Sketchfab Staff Pick", None),
    ]

    # Rotate 3 product 3D showcase queries per day based on day-of-year
    day_idx = datetime.datetime.now(TZ_CN).timetuple().tm_yday
    for offset in range(3):
        sub_kind, q_str, cn_kind = PRODUCT3D_QUERIES[(day_idx + offset) % len(PRODUCT3D_QUERIES)]
        q_url = "https://api.sketchfab.com/v3/search?" + urllib.parse.urlencode({
            "type": "models", "q": q_str, "sort_by": "-likeCount", "count": 8,
        })
        sf_queries.append(("product3d", q_url, f"Sketchfab 3D · {cn_kind}", sub_kind))

    for cat, url, source_label, sub_kind in sf_queries:
        d = fetch_json(url, timeout=15)
        for m in d.get("results", []):
            name = (m.get("name") or "").strip()
            vurl = (m.get("viewerUrl") or "").strip()
            img = best_sketchfab_thumb(m)
            likes = m.get("likeCount") or 0
            views = m.get("viewCount") or 0
            author = (m.get("user") or {}).get("displayName") or "3D Artist"
            desc = clean_plain_text(m.get("description") or "", 190)
            if not name or not vurl or not img:
                continue
            # Filter out obvious low-quality or spam names
            if re.search(r"\$\d+|for sale|buy now", name, re.I) and likes < 300:
                continue
            push(cat, {
                "source": source_label,
                "title": name,
                "url": vurl,
                "img": img,
                "author": author,
                "likes": likes,
                "views": views,
                "subKind": sub_kind or "",
                "description": desc or f"{author} 创作的高赞 3D 展示作品（{likes} 赞 · {views} 浏览），点击来源支持 360° 实时交互。",
                "tags": [CATEGORY_META[cat], source_label.split("·")[0].strip(), f"{likes} Likes"],
            })
        time.sleep(0.45)

    return buckets


def save_preview_image(prefix, img_url, title, source):
    raw = fetch_bytes(img_url, timeout=20, retries=2)
    with Image.open(io.BytesIO(raw)) as im:
        fr = im.convert("RGB")
        w, ht = fr.size
        if w < 260 or ht < 160:
            raise ValueError(f"Image too small: {w}x{ht}")
        if w > 960:
            fr = fr.resize((960, max(1, int(ht * 960 / w))), Image.Resampling.LANCZOS)
        dest = REFS_DIR / f"{prefix}-1.jpg"
        fr.save(dest, quality=82, optimize=True)
        return [{
            "title": f"{title} · 主视觉预览",
            "tag": "3D 展板" if "Sketchfab" in source else "实景精选",
            "src": f"./assets/refs/{dest.name}",
            "caption": f"来自 {source} 的每日自动采集高清主视觉，点击「打开来源」可查看完整作品或 360° 3D 交互。",
        }]


def select_daily_candidates(buckets, quota):
    """Round-robin across 5 target pillars: architecture, industrial, art, render, product3d."""
    order = ["architecture", "industrial", "art", "render", "product3d"]
    pools = {k: list(buckets.get(k, [])) for k in order}
    picked = []
    # Keep 2x buffer in case an image download fails
    while len(picked) < quota * 2:
        progressed = False
        for cat in order:
            if len(picked) >= quota * 2:
                break
            if pools[cat]:
                picked.append((cat, pools[cat].pop(0)))
                progressed = True
        if not progressed:
            break
    return picked


def build_daily_item(cat, cand, key, item_id, date_str, now_ms, idx, refs):
    cat_cn = CATEGORY_META.get(cat, "设计")
    routed_views = ["daily", "product3d"] if cat == "product3d" else ["daily", "awards"]
    source = cand.get("source") or "Design Feed"
    author = cand.get("author") or source
    likes = cand.get("likes")
    metrics = f"{likes} Likes / {cand.get('views', 0)} Views" if likes is not None else "ArchDaily Editorial Pick"

    dna = [
        ["来源渠道", source],
        ["作者 / 机构", author],
        ["自动归属", f"{cat_cn}（自动同步至 {' / '.join(routed_views)}）"],
        ["社区热度", metrics],
    ]
    notes = [
        f"GitHub Actions 每日 09:00 自动采集入库（来源：{source}）。",
        "点击详情底部「打开来源 ↗」可浏览高清原文或直接 360° 交互检视 3D 模型。" if "Sketchfab" in source else "点击详情底部「打开来源 ↗」可查看完整图纸、剖面与高分辨率实景摄影。",
    ]
    labels = list(dict.fromkeys([cat_cn, *(cand.get("tags") or [])]))[:4]

    item = {
        "id": item_id,
        "key": key,
        "type": "daily",
        "category": cat,
        "routedViews": routed_views,
        "discoveredDate": date_str,
        "title": cand["title"],
        "domain": f"每日精选 / {cat_cn} · {source}",
        "status": "backlog",
        "priority": 2,
        "starred": False,
        "labels": labels,
        "essence": cand.get("description") or f"来自 {source} 的每日精选{cat_cn}作品。",
        "dna": dna,
        "notes": notes,
        "notesLabel": "自动采集说明",
        "sourceUrl": cand["url"],
        "updatedAt": now_ms - idx * 1000,
        "refs": refs,
    }
    if cand.get("subKind"):
        item["subKind"] = cand["subKind"]
    return item


def prune_old_daily_items(feed, max_items):
    items = feed.get("items", [])
    if max_items <= 0 or len(items) <= max_items:
        return
    kept = items[:max_items]
    dropped = items[max_items:]
    feed["items"] = kept
    still_used = {r["src"].lstrip("./") for it in kept for r in it.get("refs", []) if r.get("src")}
    removed = 0
    for it in dropped:
        for r in it.get("refs", []):
            src = (r.get("src") or "").lstrip("./")
            if src.startswith("assets/refs/daily-") and src not in still_used:
                fp = ROOT / src
                if fp.exists():
                    fp.unlink()
                    removed += 1
    if removed:
        print(f"[PRUNE] Trimmed {len(dropped)} old items and removed {removed} orphaned daily images.")


def main():
    parser = argparse.ArgumentParser(description="Daily 5-item updater for 东东设计万物 (World Design & Product 3D)")
    parser.add_argument("--quota", type=int, default=int(os.environ.get("DAILY_QUOTA", "5")), help="Works to add per run (default: 5)")
    parser.add_argument("--max-items", type=int, default=int(os.environ.get("MAX_FEED_ITEMS", "120")), help="Rolling window cap (default: 120)")
    parser.add_argument("--dry-run", action="store_true", help="Discover and print selected items without writing files")
    args = parser.parse_args()

    quota = max(1, min(args.quota, 16))
    print(f"[1/3] Discovering world design & 3D showcase candidates (target={quota}/day)...", flush=True)
    buckets = discover_world_and_3d_candidates()
    print("  Pool counts:", {k: len(v) for k, v in buckets.items()}, flush=True)

    candidates = select_daily_candidates(buckets, quota)
    if not candidates:
        print("[WARN] No unseen candidates found; keeping existing daily-feed.json untouched.")
        return

    print(f"[2/3] Ranked {len(candidates)} balanced candidates.", flush=True)
    if args.dry_run:
        for i, (cat, c) in enumerate(candidates[:quota], 1):
            print(f"  {i:02d}. [{cat}] ({c['source']}) {c['title']} -> {c['url']}")
        print("[DRY-RUN] No files modified.")
        return

    feed = load_feed()
    existing_nums = [
        int(m.group(1))
        for it in feed.get("items", [])
        for m in [re.match(r"DY-(\d+)", it.get("key", ""))]
        if m
    ]
    next_num = max(existing_nums, default=0) + 1
    date_tag = today_compact()
    date_str = today_dash()
    now_ms = int(time.time() * 1000)

    print(f"[3/3] Ingesting up to {quota} verified works...", flush=True)
    ingested = []
    for cat, cand in candidates:
        if len(ingested) >= quota:
            break
        key = f"DY-{next_num}"
        item_id = f"dy-{date_tag}-{next_num}"
        prefix = f"daily-{date_tag}-{next_num}"
        try:
            refs = save_preview_image(prefix, cand["img"], cand["title"], cand["source"])
        except Exception as e:
            print(f"  [SKIP] {cand['title']}: {e}", file=sys.stderr, flush=True)
            continue

        item = build_daily_item(cat, cand, key, item_id, date_str, now_ms, len(ingested) + 1, refs)
        ingested.append(item)
        next_num += 1
        print(f"  [OK] {key} [{cat}] {item['title']} -> {refs[0]['src']}", flush=True)

    if not ingested:
        print("[WARN] Zero items ingested after download attempts; feed unchanged.")
        return

    feed["schemaVersion"] = 2
    feed["schedule"] = "GitHub Actions Daily 09:00 Asia/Shanghai (01:00 UTC)"
    feed["dailyQuota"] = quota
    feed["items"] = ingested + feed.get("items", [])
    prune_old_daily_items(feed, args.max_items)
    feed["lastUpdatedAt"] = now_iso()
    cats_hit = " / ".join(sorted({CATEGORY_META.get(i["category"], i["category"]) for i in ingested}))
    feed["lastRunSummary"] = f"{date_str} 自动新增 {len(ingested)} 部（{cats_hit}），并自动归入世界设计大奖与商品 3D 展板"
    save_feed(feed)
    print(f"DONE: Added {len(ingested)} works. Total daily feed items: {len(feed['items'])}.")


if __name__ == "__main__":
    main()
