#!/usr/bin/env python3
"""
Daily AI Design Vault Harvester & Ingestor (16 works/day target)
Covers all 5 categories (design, game, web, product, app), distinguishes model family & exact model name,
auto-routes each work into its matching workbench views, and saves up to 6 verified local images per work.

Usage:
  python scripts/daily_ai_harvest.py discover
  python scripts/daily_ai_harvest.py fetch-design <slug1> [slug2 ...]
  python scripts/daily_ai_harvest.py ingest <curated_batch.json>
  python scripts/daily_ai_harvest.py status
"""
import datetime
import html
import json
import os
import re
import ssl
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
REFS_DIR = ROOT / "assets" / "refs"
FEED_PATH = DATA_DIR / "daily-feed.json"
CANDIDATES_PATH = DATA_DIR / "candidates-latest.json"
AUDIT_SHEET_PATH = DATA_DIR / "last-audit-sheet.jpg"
SEED_DATA_JS = ROOT / "src" / "linear" / "data.js"

DATA_DIR.mkdir(parents=True, exist_ok=True)
REFS_DIR.mkdir(parents=True, exist_ok=True)

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"}
CTX = ssl._create_unverified_context()
TZ_CN = datetime.timezone(datetime.timedelta(hours=8))

DAILY_QUOTA = 16
CATEGORY_META = {
    "design": "设计",
    "game": "游戏",
    "web": "网页",
    "product": "产品",
    "app": "App",
}


def now_iso():
    return datetime.datetime.now(TZ_CN).isoformat(timespec="seconds")


def today_compact():
    return datetime.datetime.now(TZ_CN).strftime("%Y%m%d")


def today_dash():
    return datetime.datetime.now(TZ_CN).strftime("%Y-%m-%d")


def fetch_bytes(url, timeout=16, retries=2):
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
                return resp.read()
        except Exception:
            if attempt == retries:
                raise
            time.sleep(0.5)


def fetch_text(url, timeout=14):
    try:
        return fetch_bytes(url, timeout=timeout).decode("utf-8", "ignore")
    except Exception as e:
        print(f"[WARN] fetch failed: {url[:75]} -> {e}", file=sys.stderr, flush=True)
        return ""


def load_feed():
    if FEED_PATH.exists():
        try:
            data = json.loads(FEED_PATH.read_text(encoding="utf-8"))
            data.setdefault("schemaVersion", 2)
            data.setdefault("dailyQuota", DAILY_QUOTA)
            return data
        except Exception:
            pass
    return {
        "schemaVersion": 2,
        "schedule": "CRON_TZ=Asia/Shanghai 0 9 * * *",
        "dailyQuota": DAILY_QUOTA,
        "maxImagesPerWork": 6,
        "lastUpdatedAt": None,
        "lastRunSummary": "等待首次每日自动抓取（单日目标 16 部）",
        "categories": list(CATEGORY_META.keys()),
        "items": [],
    }


def save_feed(feed):
    tmp = FEED_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(feed, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(FEED_PATH)


def existing_urls_and_keys():
    seen_urls = set()
    seen_titles = set()
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


def guess_category(text):
    t = text.lower()
    if any(k in t for k in ("game", "kart", "shooter", "fps", "rpg", "brawler", "minecraft", "voxel", "party", "dungeon", "simulator", "arcade", "puzzle", "ski", "flight", "racing", "chess", "playable")):
        return "game"
    if any(k in t for k in ("design", "typography", "font", "ui kit", "icon", "canvas", "figma", "color", "palette", "poster", "gallery", "museum", "art", "editorial", "portfolio", "fashion", "lookbook", "3d scene", "motion")):
        return "design"
    if any(k in t for k in ("ios", "android", "macos", "desktop", "mobile app", "electron", "tauri", "cli", "editor", "studio", "workspace", "dashboard", "tracker", "calendar", "notes", "player", "os ", "desktop os")):
        return "app"
    if any(k in t for k in ("saas", "startup", "launch", "tool", "platform", "crm", "analytics", "billing", "assistant", "agent", "marketplace", "hardware", "watch", "headphones", "device", "commerce", "pricing", "product")):
        return "product"
    return "web"


def infer_model_info(entry):
    explicit_name = (entry.get("modelName") or "").strip()
    explicit_family = (entry.get("modelFamily") or "").strip().lower()
    labels = entry.get("labels") or []
    blob = " ".join([explicit_name, *labels, entry.get("title", ""), entry.get("domain", ""), entry.get("sourceUrl", "")])

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


def compute_routed_views(category, model_family):
    views = ["daily"]
    if category in ("web", "design"):
        views.append("aiweb")
    elif category == "game":
        views.append("games")
    elif category in ("product", "app"):
        views.append("products")
    views.append("fable" if model_family == "claude" else "othermodel")
    return views


def cmd_discover():
    seen_urls, _ = existing_urls_and_keys()
    candidates = []
    added_urls = set()

    def push(cand):
        u = (cand.get("url") or "").split("?")[0].rstrip("/").lower()
        if not u or u in seen_urls or u in added_urls:
            return
        added_urls.add(u)
        candidates.append(cand)

    # 1. Show HN (Algolia public JSON API)
    hn_raw = fetch_text("https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=60")
    if hn_raw:
        try:
            for hit in json.loads(hn_raw).get("hits", []):
                title = (hit.get("title") or "").strip()
                url = (hit.get("url") or "").strip()
                pts = hit.get("points") or 0
                if not url:
                    continue
                if any(k in title.lower() for k in ("ai", "llm", "claude", "gpt", "gemini", "cursor", "agent", "3d", "webgl", "design", "ui", "game", "app", "web", "dashboard", "canvas")):
                    fam, mname = infer_model_info({"title": title, "sourceUrl": url})
                    push({
                        "source": "Show HN",
                        "title": title.replace("Show HN: ", ""),
                        "url": url,
                        "points": pts,
                        "categoryHint": guess_category(title),
                        "modelFamilyHint": fam,
                        "modelNameHint": mname,
                        "description": f"HN {pts} pts · https://news.ycombinator.com/item?id={hit.get('objectID', '')}",
                    })
        except Exception as e:
            print("[WARN] HN parse:", e, file=sys.stderr)

    # 2. GitHub Trending Daily (HTML)
    gh_html = fetch_text("https://github.com/trending?since=daily")
    if gh_html:
        articles = re.findall(r"<article class=\"Box-row\">(.*?)</article>", gh_html, flags=re.S)
        for art in articles[:25]:
            m_h2 = re.search(r"<h2[^>]*>(.*?)</h2>", art, flags=re.S)
            m_repo = re.search(r'href="(/[^/"]+/[^/"]+)"', m_h2.group(1)) if m_h2 else None
            m_desc = re.search(r"<p class=\"col-9[^\"]*\">(.*?)</p>", art, flags=re.S)
            if not m_repo:
                continue
            repo_path = m_repo.group(1).strip()
            if repo_path.startswith("/sponsors/"):
                continue
            url = f"https://github.com{repo_path}"
            desc = html.unescape(re.sub(r"<[^>]+>", "", m_desc.group(1)).strip()) if m_desc else ""
            blob = f"{repo_path} {desc}"
            if any(k in blob.lower() for k in ("ai", "agent", "llm", "claude", "web", "ui", "design", "game", "3d", "app", "video", "canvas")):
                fam, mname = infer_model_info({"title": blob, "sourceUrl": url})
                push({
                    "source": "GitHub Trending",
                    "title": repo_path.lstrip("/"),
                    "url": url,
                    "previewImg": f"https://opengraph.githubassets.com/1{repo_path}",
                    "points": 100,
                    "categoryHint": guess_category(blob),
                    "modelFamilyHint": fam,
                    "modelNameHint": mname,
                    "description": desc[:200],
                })

    # 3. VibeFather / awesome-vibe-coding-websites (324+ AI-built websites with animated WebP + DESIGN.md)
    vf_md = fetch_text("https://raw.githubusercontent.com/liyupi/awesome-vibe-coding-websites/main/README.md")
    if vf_md:
        def clean_models_text(raw):
            txt = html.unescape(re.sub(r"<[^>]+>", " ", raw or ""))
            txt = txt.replace("\xa0", " ")
            txt = re.sub(r"\s*[·|]\s*(Live demo|Prompt|DESIGN\.md).*$", "", txt, flags=re.I)
            txt = re.sub(r"\s+", " ", txt).strip(" ·,|")
            return txt

        # 3a. Featured HTML cards
        for card in re.findall(r"<td[^>]*>.*?</td>", vf_md, flags=re.S):
            m_t = re.search(r"<b>(?:<a[^>]*>)?([^<]+)", card)
            m_u = re.search(r'href="(https://vibefather\.ai/templates/[^"?]+)', card)
            m_img = re.search(r'src="(https://media\.vibefather\.ai/[^"]+\.webp)"', card)
            subs = [re.sub(r"<[^>]+>", "", s).strip() for s in re.findall(r"<sub>(.*?)</sub>", card)]
            if not (m_t and m_u):
                continue
            url = m_u.group(1).rstrip("/")
            title = html.unescape(m_t.group(1).strip())
            desc = html.unescape(subs[0]) if subs else ""
            models = clean_models_text(subs[1]) if len(subs) > 1 else ""
            fam, mname = infer_model_info({"modelName": models, "title": title})
            push({
                "source": "VibeFather",
                "title": title,
                "url": url,
                "slug": url.rsplit("/", 1)[-1],
                "animatedWebp": m_img.group(1) if m_img else "",
                "models": models,
                "modelFamilyHint": fam,
                "modelNameHint": models or mname,
                "categoryHint": guess_category(f"{title} {desc}"),
                "description": desc[:200],
            })
        # 3b. Full Markdown table rows (all 300+ templates across every category)
        for line in vf_md.splitlines():
            if "vibefather.ai/templates/" not in line or not line.strip().startswith("|"):
                continue
            m_demo = re.search(r"\((https://vibefather\.ai/templates/([a-z0-9-]+))[^)]*\)", line)
            if not m_demo:
                continue
            url = m_demo.group(1).rstrip("/")
            slug = m_demo.group(2)
            raw_cells = [c.strip() for c in line.strip().strip("|").split("|")]
            m_title = re.search(r"\[([^\]]+)\]\(templates/[^)]+\)", raw_cells[0]) if raw_cells else None
            title = html.unescape(m_title.group(1).strip()) if m_title else slug.replace("-", " ").title()
            desc = html.unescape(re.sub(r"<[^>]+>", "", raw_cells[1]).strip())[:200] if len(raw_cells) > 1 else ""
            models = clean_models_text(raw_cells[2]) if len(raw_cells) > 2 else ""
            fam, mname = infer_model_info({"modelName": models, "title": f"{title} {desc}"})
            push({
                "source": "VibeFather-Index",
                "title": title,
                "url": url,
                "slug": slug,
                "models": models,
                "modelFamilyHint": fam,
                "modelNameHint": models or mname,
                "categoryHint": guess_category(f"{title} {desc} {slug}"),
                "description": desc,
            })

    # 4. Awesome Fable 5.2 Videos (182+ real Claude Fable 5.2 games, 3D worlds, launch films & motion)
    f52_md = fetch_text("https://raw.githubusercontent.com/yihui-dev/awesome-fable5-2-videos/main/README.md")
    if f52_md:
        cur_sec = "design"
        for line in f52_md.splitlines():
            if line.startswith("## "):
                sec = line[3:].strip().lower()
                if "game" in sec:
                    cur_sec = "game"
                elif "launch" in sec:
                    cur_sec = "product"
                elif "explainer" in sec:
                    cur_sec = "web"
                else:
                    cur_sec = "design"
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
                url = m_u.group(1).rstrip("/")
                cat_hint = cur_sec if cur_sec in CATEGORY_META else guess_category(title)
                push({
                    "source": "Fable5.2-Showcase",
                    "title": title,
                    "url": url,
                    "animatedWebp": m_img.group(1),
                    "models": "Claude Fable 5.2",
                    "modelFamilyHint": "claude",
                    "modelNameHint": "Claude Fable 5.2",
                    "categoryHint": cat_hint,
                    "description": f"Claude Fable 5.2 community showcase by {author}".strip(),
                })

    # 5. Made with Lovable (real AI-built products & web apps)
    mwl_html = fetch_text("https://madewithlovable.com/")
    if mwl_html:
        txt = html.unescape(mwl_html.replace("\\u0026", "&").replace("\\/", "/"))
        imgs = sorted(set(re.findall(r"https://madewithlovable\.com/storage/glide/containers/s3/projects/[^\"'\s)>]+?\.(?:jpg|jpeg|png|webp)", txt)))
        for img_u in imgs[:24]:
            slug = re.sub(r"-\d{14}-[A-Za-z0-9]+.*$", "", img_u.rsplit("/", 1)[-1]).replace("-", " ").strip()
            page_u = f"https://madewithlovable.com/?project={urllib.parse.quote(slug)}"
            push({
                "source": "MadeWithLovable",
                "title": slug.title(),
                "url": page_u,
                "previewImg": img_u,
                "modelFamilyHint": "other",
                "modelNameHint": "Lovable",
                "categoryHint": guess_category(slug + " product app"),
                "description": f"Lovable community production launch: {slug}",
            })

    payload = {
        "discoveredAt": now_iso(),
        "dailyQuota": DAILY_QUOTA,
        "totalCandidates": len(candidates),
        "byCategory": {c: sum(1 for x in candidates if x["categoryHint"] == c) for c in CATEGORY_META},
        "byModelFamily": {
            "claude": sum(1 for x in candidates if x.get("modelFamilyHint") == "claude"),
            "other": sum(1 for x in candidates if x.get("modelFamilyHint") != "claude"),
        },
        "candidates": candidates,
    }
    CANDIDATES_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"DISCOVERED {len(candidates)} fresh unseen candidates (quota={DAILY_QUOTA}/day) -> {CANDIDATES_PATH}")
    print("BY CATEGORY:", payload["byCategory"])
    print("BY MODEL:", payload["byModelFamily"])


def process_single_ref(prefix, slot_idx, spec):
    """Download/extract one reference image (supports url, or animatedWebp + frameIndex / keepAnimated)."""
    dest_base = REFS_DIR / f"{prefix}-{slot_idx}"
    for ext in (".jpg", ".png", ".webp", ".gif"):
        p = dest_base.with_suffix(ext)
        if p.exists():
            p.unlink()

    if spec.get("keepAnimated") and spec.get("url"):
        data = fetch_bytes(spec["url"], timeout=22)
        ext = ".gif" if data[:6] in (b"GIF87a", b"GIF89a") else ".webp"
        dest = dest_base.with_suffix(ext)
        dest.write_bytes(data)
        with Image.open(dest) as im:
            w, h = im.size
        return f"./assets/refs/{dest.name}", (w, h)

    if spec.get("fromLocalAnimated") is not None:
        src_path = Path(spec["fromLocalAnimated"])
        with Image.open(src_path) as im:
            n = getattr(im, "n_frames", 1)
            pct = spec.get("framePct")
            fi = spec.get("frameIndex")
            if fi is None:
                fi = min(n - 1, int(n * (pct if pct is not None else 0.0)))
            im.seek(min(n - 1, max(0, fi)))
            fr = im.convert("RGB")
            if fr.size[0] < 640:
                fr = fr.resize((fr.size[0] * 2, fr.size[1] * 2), Image.Resampling.LANCZOS)
            dest = dest_base.with_suffix(".jpg")
            fr.save(dest, quality=88, optimize=True)
            return f"./assets/refs/{dest.name}", fr.size

    if spec.get("url"):
        data = fetch_bytes(spec["url"], timeout=18)
        tmp = DATA_DIR / f"_tmp_{prefix}_{slot_idx}"
        tmp.write_bytes(data)
        try:
            with Image.open(tmp) as im:
                im = im.convert("RGB")
                w, h = im.size
                if w > 1280:
                    im = im.resize((1280, int(h * 1280 / w)), Image.Resampling.LANCZOS)
                dest = dest_base.with_suffix(".jpg")
                im.save(dest, quality=88, optimize=True)
                return f"./assets/refs/{dest.name}", im.size
        finally:
            if tmp.exists():
                tmp.unlink()

    raise ValueError(f"Unsupported ref spec: {spec}")


def build_audit_sheet(ingested_items):
    if not ingested_items:
        return
    rows = len(ingested_items)
    cols = 6
    tw, th = (220, 145) if rows > 8 else (260, 175)
    sheet = Image.new("RGB", (cols * tw, rows * th), (18, 19, 24))
    draw = ImageDraw.Draw(sheet)
    for r, it in enumerate(ingested_items):
        for c, ref in enumerate(it.get("refs", [])[:6]):
            fp = ROOT / ref["src"].lstrip("./")
            x0, y0 = c * tw, r * th
            if fp.exists():
                with Image.open(fp) as raw:
                    raw.seek(0)
                    im = raw.convert("RGB")
                    im.thumbnail((tw - 8, th - 24))
                    sheet.paste(im, (x0 + 4, y0 + 21))
            draw.rectangle([x0, y0, x0 + tw - 1, y0 + 19], fill=(34, 36, 44))
            draw.text((x0 + 4, y0 + 4), f"{it['key']}-{c+1} [{it['category']}] {it.get('modelFamily','')}"[:32], fill=(240, 240, 246))
    sheet.save(AUDIT_SHEET_PATH, quality=85)
    print(f"AUDIT SHEET SAVED -> {AUDIT_SHEET_PATH} ({sheet.size[0]}x{sheet.size[1]}, {rows} works)")


def cmd_ingest(batch_file):
    batch = json.loads(Path(batch_file).read_text(encoding="utf-8"))
    entries = batch if isinstance(batch, list) else batch.get("items", [])
    feed = load_feed()
    seen_urls, _ = existing_urls_and_keys()

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

    ingested = []
    for idx, entry in enumerate(entries, 1):
        src_url = (entry.get("sourceUrl") or "").strip()
        if src_url and src_url.split("?")[0].rstrip("/").lower() in seen_urls and not entry.get("allowDuplicate"):
            print(f"[SKIP] duplicate sourceUrl: {src_url}")
            continue

        cat = entry.get("category", "web")
        if cat not in CATEGORY_META:
            cat = "web"
        model_family, model_name = infer_model_info(entry)
        routed_views = compute_routed_views(cat, model_family)

        key = f"DY-{next_num}"
        item_id = f"dy-{date_tag}-{next_num}"
        prefix = f"daily-{date_tag}-{next_num}"

        refs_in = list(entry.get("refs", []))
        if not refs_in and entry.get("animatedWebp"):
            aw = entry["animatedWebp"]
            captions = entry.get("frameCaptions") or [
                ("动态实机录屏", "动态录屏", "完整首屏与交互动效实机录屏。"),
                ("首屏与核心视觉", "实机截帧", "首屏标题、视觉层次与主操作区。"),
                ("核心交互模块（一）", "实机截帧", "核心交互状态与视觉组件细节。"),
                ("核心交互模块（二）", "实机截帧", "信息结构、栅格节奏与动效过渡。"),
                ("细节特写与配置区", "实机截帧", "交互参数、卡片层级或筛选视图。"),
                ("收口结构与视觉闭环", "实机截帧", "页面收尾节奏、CTA 或完整玩法闭环。"),
            ]
            refs_in = [{"url": aw, "keepAnimated": True, "title": captions[0][0], "tag": captions[0][1], "caption": captions[0][2]}]
            pcts = entry.get("framePcts") or [0.12, 0.30, 0.48, 0.68, 0.86]
            for j, pct in enumerate(pcts[:5], 1):
                c_t, c_tag, c_cap = captions[j] if j < len(captions) else (f"实机截帧 #{j+1}", "实机截帧", "")
                refs_in.append({"fromSlot1": True, "framePct": pct, "title": c_t, "tag": c_tag, "caption": c_cap})

        built_refs = []
        slot1_local = None
        for slot_i, rspec in enumerate(refs_in[:6], 1):
            if rspec.get("fromSlot1") and slot1_local:
                rspec = {**rspec, "fromLocalAnimated": str(slot1_local)}
            try:
                rel_src, size = process_single_ref(prefix, slot_i, rspec)
                if slot_i == 1:
                    slot1_local = ROOT / rel_src.lstrip("./")
                built_refs.append({
                    "title": rspec.get("title") or f"{entry['title']} · 参考图 {slot_i}",
                    "tag": rspec.get("tag") or "实机界面",
                    "src": rel_src,
                    "caption": rspec.get("caption") or "",
                })
                print(f"  [OK] {key} img {slot_i}/6 -> {rel_src} ({size[0]}x{size[1]})", flush=True)
            except Exception as e:
                print(f"  [ERR] {key} img {slot_i}: {e}", file=sys.stderr)

        item = {
            "id": item_id,
            "key": key,
            "type": "daily",
            "category": cat,
            "modelFamily": model_family,
            "modelName": model_name,
            "routedViews": routed_views,
            "discoveredDate": date_str,
            "title": entry["title"],
            "domain": entry.get("domain") or f"每日精选 / {CATEGORY_META[cat]}",
            "status": entry.get("status") or "backlog",
            "priority": entry.get("priority", 2),
            "starred": bool(entry.get("starred", False)),
            "labels": list(dict.fromkeys([CATEGORY_META[cat], model_name, *(entry.get("labels") or [])]))[:4],
            "essence": entry.get("essence", ""),
            "dna": entry.get("dna", []),
            "notes": entry.get("notes", []),
            "notesLabel": entry.get("notesLabel") or "红线 DON'T",
            "sourceUrl": src_url,
            "updatedAt": now_ms - idx * 1000,
            "refs": built_refs,
        }
        ingested.append(item)
        if src_url:
            seen_urls.add(src_url.split("?")[0].rstrip("/").lower())
        next_num += 1

    if ingested:
        feed["schemaVersion"] = 2
        feed["dailyQuota"] = DAILY_QUOTA
        feed["items"] = ingested + feed.get("items", [])
        feed["lastUpdatedAt"] = now_iso()
        cats_hit = " / ".join(sorted({CATEGORY_META[i["category"]] for i in ingested}))
        c_cnt = sum(1 for i in ingested if i["modelFamily"] == "claude")
        o_cnt = len(ingested) - c_cnt
        feed["lastRunSummary"] = (
            f"{date_str} 新增 {len(ingested)} 部（{cats_hit} · Claude {c_cnt} / 其他模型 {o_cnt}），"
            f"共 {sum(len(i['refs']) for i in ingested)} 张参考图并自动归类"
        )
        save_feed(feed)
        build_audit_sheet(ingested)
        print(f"INGESTED {len(ingested)} items into {FEED_PATH} (total daily items: {len(feed['items'])})")
    else:
        print("No new items ingested (all skipped or empty).")


def cmd_status():
    feed = load_feed()
    items = feed.get("items", [])
    missing = []
    total_refs = 0
    by_cat = {c: 0 for c in CATEGORY_META}
    by_model = {"claude": 0, "other": 0}
    for it in items:
        cat = it.get("category", "web")
        by_cat[cat] = by_cat.get(cat, 0) + 1
        mf = it.get("modelFamily", "other")
        by_model[mf] = by_model.get(mf, 0) + 1
        for r in it.get("refs", []):
            total_refs += 1
            fp = ROOT / r["src"].lstrip("./")
            if not fp.exists():
                missing.append(r["src"])
    print(f"FEED: {len(items)} daily items | quota={feed.get('dailyQuota', DAILY_QUOTA)}/day | {total_refs} refs | {len(missing)} missing")
    print(f"BY CATEGORY: {by_cat} | BY MODEL: {by_model}")
    print(f"LAST UPDATED: {feed.get('lastUpdatedAt')} | {feed.get('lastRunSummary')}")
    if missing:
        print("MISSING:", missing)


def cmd_fetch_design(slugs):
    for s in slugs:
        print(f"=== {s} ===", flush=True)
        for fn in ("DESIGN.md", "prompt.md"):
            u = f"https://raw.githubusercontent.com/liyupi/awesome-vibe-coding-websites/main/templates/{s}/{fn}"
            txt = fetch_text(u, timeout=10)
            if txt:
                print(f"-- {fn} --\n{txt[:900]}\n", flush=True)
        time.sleep(0.2)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "discover":
        cmd_discover()
    elif cmd == "ingest" and len(sys.argv) >= 3:
        cmd_ingest(sys.argv[2])
    elif cmd == "fetch-design" and len(sys.argv) >= 3:
        cmd_fetch_design(sys.argv[2:])
    elif cmd == "status":
        cmd_status()
    else:
        print(__doc__)
        sys.exit(1)
