#!/usr/bin/env python3
"""
Autonomous Dual-Track Daily Updater for 东东设计万物 (15 works/day total).

Track A — AI Works (10/day default):
  Discovers fresh AI web / design / game / product / app works from VibeFather,
  Awesome Fable 5.2 Showcase, MadeWithLovable, GitHub Trending, and Show HN,
  balanced across all 5 categories and both Claude & other model families.

Track B — World Design & Product 3D Boards (5/day default):
  Discovers 1 work each across 建筑 (ArchDaily RSS + Sketchfab), 工业设计,
  美术, 3D 渲染, and 商品 3D 展板 (rotating iPhone / Car / CNC Machine /
  Industrial Robot / Camera / Mechanical Watch 3D models).

Every ingested work has verified local optimized images in assets/refs/ and
automatically routes into matching views inside data/daily-feed.json.

Usage:
  python scripts/update-data.py
  python scripts/update-data.py --ai-quota 10 --design-quota 5
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

AI_CATEGORIES = ("design", "game", "web", "product", "app")
DESIGN_CATEGORIES = ("architecture", "industrial", "art", "render", "product3d")

CATEGORY_META = {
    "architecture": "建筑",
    "industrial": "工业设计",
    "art": "美术",
    "render": "3D 渲染",
    "spatial": "空间展陈",
    "product3d": "商品 3D 展板",
    "design": "设计",
    "game": "游戏",
    "web": "网页",
    "product": "产品",
    "app": "App",
}

AI_SOURCE_PRIORITY = {
    "VibeFather": 0,
    "Fable5.2-Showcase": 1,
    "MadeWithLovable": 2,
    "GitHub Trending": 3,
    "Show HN": 4,
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
            time.sleep(0.5)
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
        "dailyQuota": 15,
        "aiQuota": 10,
        "designQuota": 5,
        "maxImagesPerWork": 6,
        "lastUpdatedAt": None,
        "lastRunSummary": "每日 09:00 自动更新 15 部（AI 精选 10 部 + 建筑/工业/美术/3D 渲染/商品 3D 展板 5 部）",
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


def clean_plain_text(raw, limit=220):
    txt = html.unescape(re.sub(r"<[^>]+>", " ", raw or ""))
    txt = txt.replace("\xa0", " ")
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt[:limit]


def clean_model_display(raw):
    txt = clean_plain_text(raw, 120)
    txt = re.sub(r"\s*[·|]\s*(Live demo|Prompt|DESIGN\.md).*$", "", txt, flags=re.I)
    txt = txt.strip(" ·,|")
    if len(txt) > 42:
        parts = [p.strip() for p in re.split(r"[,·/|]", txt) if p.strip()]
        txt = " / ".join(parts[:2])[:42]
    return txt


def guess_ai_category(text):
    t = text.lower()
    if any(k in t for k in ("game", "kart", "shooter", "fps", "rpg", "brawler", "minecraft", "voxel", "party", "dungeon", "simulator", "arcade", "puzzle", "ski", "flight", "racing", "chess", "playable")):
        return "game"
    if any(k in t for k in ("design", "typography", "font", "ui kit", "icon", "canvas", "figma", "color", "palette", "poster", "gallery", "museum", "art", "editorial", "portfolio", "fashion", "lookbook", "3d scene", "motion")):
        return "design"
    if any(k in t for k in ("ios", "android", "macos", "desktop", "mobile app", "electron", "tauri", "cli", "editor", "studio", "workspace", "dashboard", "tracker", "calendar", "notes", "player", "os ")):
        return "app"
    if any(k in t for k in ("saas", "startup", "launch", "tool", "platform", "crm", "analytics", "billing", "assistant", "agent", "marketplace", "hardware", "watch", "headphones", "device", "commerce", "pricing", "product")):
        return "product"
    return "web"


def infer_model_info(model_name, model_family, blob):
    explicit_name = clean_model_display(model_name)
    explicit_family = (model_family or "").strip().lower()
    if not explicit_name:
        patterns = [
            (r"claude\s*fable\s*5\.2|fable\s*5\.2", "Claude Fable 5.2"),
            (r"claude\s*opus\s*5\.5|opus\s*5\.5", "Claude Opus 5.5"),
            (r"claude\s*sonnet\s*[0-9.]+", None),
            (r"claude\s*code", "Claude Code"),
            (r"gemini\s*[0-9.]+\s*[a-z]*", None),
            (r"gpt-[0-9.]+\s*[a-z]*", None),
            (r"kimi\s*k[0-9.]+\s*[a-z]*", None),
            (r"deepseek\s*v[0-9.]+\s*[a-z]*", None),
            (r"glm-[0-9.]+", None),
            (r"lovable", "Lovable"),
        ]
        for pat, fixed in patterns:
            m = re.search(pat, blob, flags=re.I)
            if m:
                explicit_name = fixed or m.group(0).strip()
                break
        if not explicit_name:
            explicit_name = "Claude Fable 5.2" if explicit_family == "claude" else "Multi-Model AI"
    if explicit_family not in ("claude", "other"):
        explicit_family = "claude" if re.search(r"claude|fable|opus|sonnet", explicit_name + " " + blob, flags=re.I) else "other"
    return explicit_family, explicit_name


def compute_ai_routed_views(cat, model_family):
    views = ["daily"]
    if cat in ("web", "design"):
        views.append("aiweb")
    elif cat == "game":
        views.append("games")
    elif cat in ("product", "app"):
        views.append("products")
    views.append("fable" if model_family == "claude" else "othermodel")
    return views


# ==================== TRACK A: AI WORKS (10/day) ====================
def discover_ai_candidates(seen_urls, seen_titles):
    candidates = []
    added = set()

    def push(c):
        u = (c.get("url") or "").split("?")[0].rstrip("/").lower()
        t = (c.get("title") or "").strip().lower()
        if not u or u in seen_urls or u in added or t in seen_titles:
            return
        added.add(u)
        candidates.append(c)

    # 1. VibeFather featured HTML cards (real animated WebP + DESIGN.md)
    vf_md = fetch_text("https://raw.githubusercontent.com/liyupi/awesome-vibe-coding-websites/main/README.md")
    if vf_md:
        for card in re.findall(r"<td[^>]*>.*?</td>", vf_md, flags=re.S):
            m_t = re.search(r"<b>(?:<a[^>]*>)?([^<]+)", card)
            m_u = re.search(r'href="(https://vibefather\.ai/templates/[^"?]+)', card)
            m_img = re.search(r'src="(https://media\.vibefather\.ai/[^"]+\.webp)"', card)
            subs = [clean_plain_text(s, 180) for s in re.findall(r"<sub>(.*?)</sub>", card)]
            if not (m_t and m_u and m_img):
                continue
            url = m_u.group(1).rstrip("/")
            title = html.unescape(m_t.group(1).strip())
            desc = subs[0] if subs else ""
            models = clean_model_display(subs[1]) if len(subs) > 1 else ""
            fam, mname = infer_model_info(models, "", f"{title} {desc} {models}")
            push({
                "track": "ai",
                "source": "VibeFather",
                "title": title,
                "url": url,
                "slug": url.rsplit("/", 1)[-1],
                "animatedWebp": m_img.group(1),
                "modelFamily": fam,
                "modelName": models or mname,
                "category": guess_ai_category(f"{title} {desc}"),
                "description": desc,
            })

    # 2. Awesome Fable 5.2 Showcase (182+ Claude Fable 5.2 games/3D/motion/apps)
    f52_md = fetch_text("https://raw.githubusercontent.com/yihui-dev/awesome-fable5-2-videos/main/README.md")
    if f52_md:
        cur_sec = "design"
        for line in f52_md.splitlines():
            if line.startswith("## "):
                sec = line[3:].strip().lower()
                cur_sec = "game" if "game" in sec else "product" if "launch" in sec else "web" if "explainer" in sec else "design"
            if "<td" not in line:
                continue
            for card in re.findall(r"<td[^>]*>.*?</td>", line):
                m_u = re.search(r'href="(https://skillry\.dev/ai-videos/fable5-2/[^"?]+)', card)
                m_img = re.search(r'src="(https://media\.skillry\.dev/fable-5-2/[^"]+\.webp)"', card)
                m_b = re.search(r"<b>([^<]+)</b>", card)
                m_author = re.search(r"(@[A-Za-z0-9_]+)", card)
                if not (m_u and m_img and m_b):
                    continue
                title = html.unescape(m_b.group(1).strip())
                author = m_author.group(1) if m_author else ""
                push({
                    "track": "ai",
                    "source": "Fable5.2-Showcase",
                    "title": title,
                    "url": m_u.group(1).rstrip("/"),
                    "animatedWebp": m_img.group(1),
                    "modelFamily": "claude",
                    "modelName": "Claude Fable 5.2",
                    "category": cur_sec if cur_sec in AI_CATEGORIES else guess_ai_category(title),
                    "description": f"Claude Fable 5.2 社区高赞实机作品（{author}）。".strip(),
                })

    # 3. Made with Lovable
    mwl_html = fetch_text("https://madewithlovable.com/")
    if mwl_html:
        txt = html.unescape(mwl_html.replace("\\u0026", "&").replace("\\/", "/"))
        imgs = sorted(set(re.findall(r"https://madewithlovable\.com/storage/glide/containers/s3/projects/[^\"'\s)>]+?\.(?:jpg|jpeg|png|webp)", txt)))
        for img_u in imgs[:24]:
            slug = re.sub(r"-\d{14}-[A-Za-z0-9]+.*$", "", img_u.rsplit("/", 1)[-1]).replace("-", " ").strip()
            push({
                "track": "ai",
                "source": "MadeWithLovable",
                "title": slug.title(),
                "url": f"https://madewithlovable.com/?project={urllib.parse.quote(slug)}",
                "previewImg": img_u,
                "modelFamily": "other",
                "modelName": "Lovable",
                "category": guess_ai_category(slug + " product app"),
                "description": f"Lovable 社区上线 AI 产品与 Web 应用：{slug}。",
            })

    # 4. GitHub Trending Daily (filtered to real repos, never /sponsors/)
    gh_html = fetch_text("https://github.com/trending?since=daily")
    if gh_html:
        for art in re.findall(r"<article class=\"Box-row\">(.*?)</article>", gh_html, flags=re.S)[:25]:
            m_h2 = re.search(r"<h2[^>]*>(.*?)</h2>", art, flags=re.S)
            m_repo = re.search(r'href="(/[^/"]+/[^/"]+)"', m_h2.group(1)) if m_h2 else None
            m_desc = re.search(r"<p class=\"col-9[^\"]*\">(.*?)</p>", art, flags=re.S)
            if not m_repo:
                continue
            repo_path = m_repo.group(1).strip()
            if repo_path.startswith("/sponsors/"):
                continue
            desc = clean_plain_text(m_desc.group(1), 200) if m_desc else ""
            blob = f"{repo_path} {desc}"
            if any(k in blob.lower() for k in ("ai", "agent", "llm", "claude", "web", "ui", "design", "game", "3d", "app", "video", "canvas")):
                fam, mname = infer_model_info("", "", blob)
                push({
                    "track": "ai",
                    "source": "GitHub Trending",
                    "title": repo_path.lstrip("/"),
                    "url": f"https://github.com{repo_path}",
                    "previewImg": f"https://opengraph.githubassets.com/1{repo_path}",
                    "modelFamily": fam,
                    "modelName": mname,
                    "category": guess_ai_category(blob),
                    "description": desc or f"GitHub Trending 热门 AI 开源项目：{repo_path.lstrip('/')}。",
                })

    # 5. Show HN (Algolia public API)
    hn_data = fetch_json("https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=40")
    for hit in hn_data.get("hits", []):
        title = (hit.get("title") or "").strip()
        url = (hit.get("url") or "").strip()
        pts = hit.get("points") or 0
        if not url or pts < 3:
            continue
        if any(k in title.lower() for k in ("ai", "llm", "claude", "gpt", "gemini", "agent", "3d", "webgl", "design", "ui", "game", "app", "web", "canvas")):
            fam, mname = infer_model_info("", "", f"{title} {url}")
            push({
                "track": "ai",
                "source": "Show HN",
                "title": title.replace("Show HN: ", ""),
                "url": url,
                "points": pts,
                "modelFamily": fam,
                "modelName": mname,
                "category": guess_ai_category(title),
                "description": f"Show HN ({pts} pts) · https://news.ycombinator.com/item?id={hit.get('objectID', '')}",
            })

    return candidates


def select_balanced_ai(candidates, quota):
    def rank_key(c):
        has_media = 0 if (c.get("animatedWebp") or c.get("previewImg")) else 1
        src_rank = AI_SOURCE_PRIORITY.get(c.get("source", ""), 9)
        return (has_media, src_rank, -(c.get("points") or 0))

    buckets = {cat: [] for cat in AI_CATEGORIES}
    for c in sorted(candidates, key=rank_key):
        cat = c.get("category", "web")
        buckets[cat if cat in buckets else "web"].append(c)

    selected = []
    want_claude = True
    while len(selected) < quota * 2:
        progressed = False
        for cat in AI_CATEGORIES:
            if len(selected) >= quota * 2:
                break
            pool = buckets[cat]
            pick_idx = next((i for i, x in enumerate(pool) if x.get("modelFamily") == ("claude" if want_claude else "other")), None)
            if pick_idx is None and pool:
                pick_idx = 0
            if pick_idx is not None:
                selected.append(pool.pop(pick_idx))
                want_claude = not want_claude
                progressed = True
        if not progressed:
            break
    return selected


# ==================== TRACK B: WORLD DESIGN & PRODUCT 3D (5/day) ====================
def best_sketchfab_thumb(model):
    imgs = model.get("thumbnails", {}).get("images", [])
    if not imgs:
        return ""
    imgs = sorted(imgs, key=lambda x: -(x.get("width") or 0))
    for im in imgs:
        if 720 <= (im.get("width") or 0) <= 1920:
            return im.get("url", "")
    return imgs[0].get("url", "")


def discover_design_3d_candidates(seen_urls, seen_titles):
    buckets = {k: [] for k in DESIGN_CATEGORIES}
    added = set()

    def push(cat, c):
        u = (c.get("url") or "").split("?")[0].rstrip("/").lower()
        t = (c.get("title") or "").strip().lower()
        if not u or not c.get("previewImg") or u in seen_urls or u in added or t in seen_titles:
            return
        added.add(u)
        buckets[cat].append(c)

    # 1. ArchDaily RSS — global architecture
    rss_xml = fetch_text("https://www.archdaily.com/rss")
    if rss_xml:
        try:
            root = ET.fromstring(rss_xml)
            for item in root.findall(".//item")[:20]:
                title = clean_plain_text(item.findtext("title"), 120)
                link = (item.findtext("link") or "").strip()
                desc_raw = item.findtext("description") or ""
                if re.match(r"^(open call|call for|competition|subscribe|podcast)", title, re.I):
                    continue
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
                if title and link and img:
                    push("architecture", {
                        "track": "design",
                        "category": "architecture",
                        "source": "ArchDaily",
                        "title": title,
                        "url": link,
                        "previewImg": img,
                        "author": "ArchDaily Featured",
                        "description": desc or f"ArchDaily 全球建筑精选：{title}",
                        "tags": ["建筑", "ArchDaily", "国际建筑"],
                    })
        except Exception as e:
            print(f"[WARN] ArchDaily RSS parse failed: {e}", file=sys.stderr, flush=True)

    # 2. Sketchfab Staff Picks & Product 3D Queries
    sf_queries = [
        ("architecture", "https://api.sketchfab.com/v3/models?staffpicked=true&categories=architecture&sort_by=-publishedAt&count=10", "Sketchfab Architecture", ""),
        ("industrial", "https://api.sketchfab.com/v3/models?staffpicked=true&categories=science-technology&sort_by=-publishedAt&count=12", "Sketchfab Industrial", ""),
        ("art", "https://api.sketchfab.com/v3/models?staffpicked=true&categories=art-abstract&sort_by=-publishedAt&count=12", "Sketchfab Fine Art", ""),
        ("render", "https://api.sketchfab.com/v3/models?staffpicked=true&sort_by=-publishedAt&count=16", "Sketchfab Staff Pick", ""),
    ]

    day_idx = datetime.datetime.now(TZ_CN).timetuple().tm_yday
    for offset in range(3):
        sub_kind, q_str, cn_kind = PRODUCT3D_QUERIES[(day_idx + offset) % len(PRODUCT3D_QUERIES)]
        q_url = "https://api.sketchfab.com/v3/search?" + urllib.parse.urlencode({
            "type": "models", "q": q_str, "sort_by": "-likeCount", "count": 8,
        })
        sf_queries.append(("product3d", q_url, f"Sketchfab 3D · {cn_kind}", sub_kind))

    for cat, url, source_label, sub_kind in sf_queries:
        d = fetch_json(url)
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
            if re.search(r"\$\d+|for sale|buy now", name, re.I) and likes < 300:
                continue
            push(cat, {
                "track": "design",
                "category": cat,
                "source": source_label,
                "title": name,
                "url": vurl,
                "previewImg": img,
                "author": author,
                "likes": likes,
                "views": views,
                "subKind": sub_kind,
                "description": desc or f"{author} 创作的高赞 3D 展示作品（{likes} 赞 · {views} 浏览），点击来源可 360° 交互查看。",
                "tags": [CATEGORY_META[cat], source_label.split("·")[0].strip(), f"{likes} Likes"],
            })
        time.sleep(0.4)

    return buckets


def select_balanced_design(buckets, quota):
    pools = {k: list(buckets.get(k, [])) for k in DESIGN_CATEGORIES}
    picked = []
    while len(picked) < quota * 2:
        progressed = False
        for cat in DESIGN_CATEGORIES:
            if len(picked) >= quota * 2:
                break
            if pools[cat]:
                picked.append(pools[cat].pop(0))
                progressed = True
        if not progressed:
            break
    return picked


# ==================== IMAGE EXTRACTION & INGESTION ====================
def fetch_og_image_url(page_url):
    html_text = fetch_text(page_url, timeout=10)
    if not html_text:
        return ""
    for pat in (
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)["\']',
        r'<meta[^>]+content=["\'](https?://[^"\']+)["\'][^>]+property=["\']og:image["\']',
        r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\'](https?://[^"\']+)["\']',
    ):
        m = re.search(pat, html_text, flags=re.I)
        if m:
            return m.group(1).strip()
    return ""


def save_media_refs(prefix, cand, max_ai_images=4, max_webp_kb=500):
    title = cand.get("title", "精选作品")
    source = cand.get("source", "Upstream")
    animated_url = (cand.get("animatedWebp") or "").strip()
    preview_url = (cand.get("previewImg") or "").strip()

    if not animated_url and not preview_url and cand.get("url"):
        preview_url = fetch_og_image_url(cand["url"])

    built = []
    if animated_url:
        raw = fetch_bytes(animated_url, timeout=22)
        with Image.open(io.BytesIO(raw)) as im:
            n_frames = getattr(im, "n_frames", 1)
            keep_webp = n_frames > 1 and (len(raw) / 1024.0) <= max_webp_kb
            captions = [
                ("动态实机录屏" if keep_webp else "首屏主视觉", "动态录屏" if keep_webp else "实机截帧", "完整首屏构图与核心交互表现。"),
                ("核心界面层次", "实机截帧", "主内容区排印、色彩对比与组件结构。"),
                ("交互细节态", "实机截帧", "交互切换、栅格节奏与动效过渡。"),
                ("收口结构与闭环", "实机截帧", "底部收尾、CTA 或完整玩法闭环。"),
            ]
            slot = 1
            if keep_webp:
                dest = REFS_DIR / f"{prefix}-{slot}.webp"
                dest.write_bytes(raw)
                built.append({"title": f"{title} · {captions[0][0]}", "tag": captions[0][1], "src": f"./assets/refs/{dest.name}", "caption": captions[0][2]})
                slot += 1
                pcts = [0.22, 0.55, 0.86][: max(0, max_ai_images - 1)]
            else:
                count = min(max_ai_images, max(1, n_frames))
                pcts = [0.0] if count == 1 else [i / max(count - 1, 1) * 0.90 for i in range(count)]

            used_f = set()
            for pct in pcts:
                if slot > max_ai_images:
                    break
                fi = min(n_frames - 1, max(0, int((n_frames - 1) * pct)))
                if fi in used_f and n_frames > 1:
                    continue
                used_f.add(fi)
                im.seek(fi)
                fr = im.convert("RGB")
                w, ht = fr.size
                if w > 960:
                    fr = fr.resize((960, max(1, int(ht * 960 / w))), Image.Resampling.LANCZOS)
                elif w < 560:
                    sc = min(2.0, 720 / max(w, 1))
                    fr = fr.resize((int(w * sc), max(1, int(ht * sc))), Image.Resampling.LANCZOS)
                dest = REFS_DIR / f"{prefix}-{slot}.jpg"
                fr.save(dest, quality=80, optimize=True)
                ci = min(slot - 1, len(captions) - 1)
                built.append({"title": f"{title} · {captions[ci][0]}", "tag": captions[ci][1], "src": f"./assets/refs/{dest.name}", "caption": captions[ci][2]})
                slot += 1
        return built

    if preview_url:
        raw = fetch_bytes(preview_url, timeout=20)
        with Image.open(io.BytesIO(raw)) as im:
            fr = im.convert("RGB")
            w, ht = fr.size
            if w < 240 or ht < 140:
                raise ValueError(f"Image too small: {w}x{ht}")
            if w > 960:
                fr = fr.resize((960, max(1, int(ht * 960 / w))), Image.Resampling.LANCZOS)
            dest = REFS_DIR / f"{prefix}-1.jpg"
            fr.save(dest, quality=82, optimize=True)
            tag = "3D 展板" if "Sketchfab" in source else ("实景精选" if cand.get("track") == "design" else "实机预览")
            built.append({
                "title": f"{title} · 主视觉预览",
                "tag": tag,
                "src": f"./assets/refs/{dest.name}",
                "caption": (cand.get("description") or f"来自 {source} 的每日自动采集高清主视觉。")[:140],
            })
        return built

    return []


def cleanup_prefix(prefix):
    for fp in REFS_DIR.glob(f"{prefix}-*"):
        try:
            fp.unlink()
        except OSError:
            pass


def build_item(cand, key, item_id, date_str, now_ms, idx, refs):
    cat = cand["category"]
    cat_cn = CATEGORY_META.get(cat, "设计")
    source = cand.get("source", "Upstream")

    if cand.get("track") == "design":
        routed_views = ["daily", "product3d"] if cat == "product3d" else ["daily", "awards"]
        author = cand.get("author") or source
        likes = cand.get("likes")
        metrics = f"{likes} Likes / {cand.get('views', 0)} Views" if likes is not None else "ArchDaily Editorial Pick"
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
            "labels": list(dict.fromkeys([cat_cn, *(cand.get("tags") or [])]))[:4],
            "essence": cand.get("description") or f"来自 {source} 的每日精选{cat_cn}作品。",
            "dna": [
                ["来源渠道", source],
                ["作者 / 机构", author],
                ["自动归属", f"{cat_cn}（自动同步至 {' / '.join(routed_views)}）"],
                ["社区热度", metrics],
            ],
            "notes": [
                f"GitHub Actions 每日 09:00 自动采集入库（来源：{source}）。",
                "点击底部「打开来源 ↗」可查看高清原站或 360° 交互检视 3D 模型。",
            ],
            "notesLabel": "自动采集说明",
            "sourceUrl": cand["url"],
            "updatedAt": now_ms - idx * 1000,
            "refs": refs,
        }
        if cand.get("subKind"):
            item["subKind"] = cand["subKind"]
        return item

    # Track A: AI work
    mf = cand.get("modelFamily", "other")
    mn = cand.get("modelName", "Multi-Model AI")
    routed_views = compute_ai_routed_views(cat, mf)
    return {
        "id": item_id,
        "key": key,
        "type": "daily",
        "category": cat,
        "modelFamily": mf,
        "modelName": mn,
        "routedViews": routed_views,
        "discoveredDate": date_str,
        "title": cand["title"],
        "domain": f"每日精选 / {cat_cn} · {source}",
        "status": "backlog",
        "priority": 2,
        "starred": False,
        "labels": list(dict.fromkeys([cat_cn, mn, source]))[:4],
        "essence": cand.get("description") or f"来自 {source} 的 AI 生成{cat_cn}精选作品，由 {mn} 驱动构建。",
        "dna": [
            ["来源渠道", source],
            ["模型家族", f"{mn}（{'Claude 系列' if mf == 'claude' else '其他模型'}）"],
            ["自动归属", f"{cat_cn} · {' / '.join(routed_views)}"],
        ],
        "notes": [
            f"GitHub Actions 每日 09:00 自动采集入库（来源：{source}），点击底部「打开来源 ↗」可体验原站。",
            "复刻时请重点拆解其布局节奏、信息密度与动效反馈，避免生搬装饰元素。",
        ],
        "notesLabel": "自动化采集备注",
        "sourceUrl": cand["url"],
        "updatedAt": now_ms - idx * 1000,
        "refs": refs,
    }


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
        print(f"[PRUNE] Trimmed {len(dropped)} old items and removed {removed} orphaned daily refs.")


def main():
    parser = argparse.ArgumentParser(description="Daily 15-item updater for 东东设计万物 (10 AI + 5 World Design/3D)")
    parser.add_argument("--ai-quota", type=int, default=int(os.environ.get("AI_QUOTA", "10")), help="AI works per run (default: 10)")
    parser.add_argument("--design-quota", type=int, default=int(os.environ.get("DESIGN_QUOTA", "5")), help="World design & Product 3D works per run (default: 5)")
    parser.add_argument("--max-ai-images", type=int, default=int(os.environ.get("MAX_AI_IMAGES", "4")), help="Max images saved per AI work (default: 4)")
    parser.add_argument("--max-items", type=int, default=int(os.environ.get("MAX_FEED_ITEMS", "180")), help="Rolling daily archive cap (default: 180)")
    parser.add_argument("--dry-run", action="store_true", help="Discover and print selected 15 works without modifying files")
    args = parser.parse_args()

    ai_quota = max(0, min(args.ai_quota, 20))
    design_quota = max(0, min(args.design_quota, 15))
    total_target = ai_quota + design_quota

    seen_urls, seen_titles = existing_urls_and_titles()

    print(f"[1/3] Discovering Track A (AI target={ai_quota}) & Track B (Design/3D target={design_quota})...", flush=True)
    ai_raw = discover_ai_candidates(seen_urls, seen_titles) if ai_quota > 0 else []
    design_buckets = discover_design_3d_candidates(seen_urls, seen_titles) if design_quota > 0 else {}
    print(f"  Track A pool: {len(ai_raw)} AI candidates", flush=True)
    print(f"  Track B pool: { {k: len(v) for k, v in design_buckets.items()} }", flush=True)

    ai_ranked = select_balanced_ai(ai_raw, ai_quota) if ai_quota > 0 else []
    design_ranked = select_balanced_design(design_buckets, design_quota) if design_quota > 0 else []

    if args.dry_run:
        print(f"[2/3] Dry-run preview (target={total_target}: {ai_quota} AI + {design_quota} Design/3D):")
        print("  --- Track B: 建筑/工业/美术/3D渲染/商品3D展板 ---")
        for i, c in enumerate(design_ranked[:design_quota], 1):
            print(f"  D{i:02d}. [{c['category']}] ({c['source']}) {c['title']} -> {c['url']}")
        print("  --- Track A: AI 精选作品 ---")
        for i, c in enumerate(ai_ranked[:ai_quota], 1):
            print(f"  A{i:02d}. [{c['category']}/{c['modelFamily']}] ({c['source']}) {c['title']} -> {c['url']}")
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

    def ingest_track(pool, quota, label):
        added = []
        for cand in pool:
            if len(added) >= quota:
                break
            u = (cand.get("url") or "").split("?")[0].rstrip("/").lower()
            t = (cand.get("title") or "").strip().lower()
            if not u or u in seen_urls or t in seen_titles:
                continue
            key = f"DY-{next_num + len(added)}"
            item_id = f"dy-{date_tag}-{next_num + len(added)}"
            prefix = f"daily-{date_tag}-{next_num + len(added)}"
            try:
                refs = save_media_refs(prefix, cand, max_ai_images=args.max_ai_images)
            except Exception as e:
                print(f"  [SKIP/{label}] {cand.get('title')}: {e}", file=sys.stderr, flush=True)
                cleanup_prefix(prefix)
                continue
            refs = [r for r in refs if (ROOT / r["src"].lstrip("./")).exists()]
            if not refs:
                cleanup_prefix(prefix)
                continue
            item = build_item(cand, key, item_id, date_str, now_ms, len(added) + 1, refs)
            added.append(item)
            seen_urls.add(u)
            seen_titles.add(t)
            print(f"  [OK/{label}] {key} [{item['category']}] {item['title']} ({len(refs)} imgs)", flush=True)
        return added

    print(f"[2/3] Ingesting Track B ({design_quota} world design / 3D boards)...", flush=True)
    design_ingested = ingest_track(design_ranked, design_quota, "DESIGN")
    next_num += len(design_ingested)

    print(f"[3/3] Ingesting Track A ({ai_quota} AI works)...", flush=True)
    ai_ingested = ingest_track(ai_ranked, ai_quota, "AI")

    ingested = design_ingested + ai_ingested
    if not ingested:
        print("[WARN] Zero new items could be ingested this run; daily-feed.json left unchanged.")
        return

    feed["schemaVersion"] = 2
    feed["schedule"] = "GitHub Actions Daily 09:00 Asia/Shanghai (01:00 UTC)"
    feed["dailyQuota"] = total_target
    feed["aiQuota"] = ai_quota
    feed["designQuota"] = design_quota
    feed["items"] = ingested + feed.get("items", [])
    prune_old_daily_items(feed, args.max_items)
    feed["lastUpdatedAt"] = now_iso()
    total_imgs = sum(len(i["refs"]) for i in ingested)
    feed["lastRunSummary"] = (
        f"{date_str} 自动新增 {len(ingested)} 部（AI 精选 {len(ai_ingested)} 部 + "
        f"建筑/工业/美术/渲染/商品3D展板 {len(design_ingested)} 部），共 {total_imgs} 张图并自动归类"
    )
    save_feed(feed)
    print(f"DONE: Added {len(ingested)} works ({len(ai_ingested)} AI + {len(design_ingested)} Design/3D, {total_imgs} imgs). Total daily items: {len(feed['items'])}.")


if __name__ == "__main__":
    main()
