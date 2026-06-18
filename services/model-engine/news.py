from __future__ import annotations

import hashlib
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional, Tuple

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
MAX_HEADLINES = 50

NEWS_SOURCES = [
    ("bloomberg", "BLOOMBERG", "https://feeds.bloomberg.com/markets/news.rss", 15),
    ("reuters", "REUTERS", "https://news.google.com/rss/search?q=Reuters+(central+bank+OR+bonds+OR+currencies+OR+commodities+OR+inflation)+when:24h&hl=en-US&gl=US&ceid=US:en", 15),
    ("cnbc", "CNBC", "https://www.cnbc.com/id/100003114/device/rss/rss.html", 12),
    ("fed", "FED", "https://www.federalreserve.gov/feeds/press_all.xml", 8),
    ("bcb", "BCB", "https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/noticias", 8),
    ("gnews-br", "BRASIL MACRO", "https://news.google.com/rss/search?q=(Selic+OR+Copom+OR+IPCA+OR+infla%C3%A7%C3%A3o+OR+d%C3%B3lar+OR+juros+OR+Ibovespa+OR+Banco+Central)+when:24h&hl=pt-BR&gl=BR&ceid=BR:pt-419", 12),
    ("infomoney", "INFOMONEY", "https://www.infomoney.com.br/feed/", 10),
]

RULES: List[Tuple[re.Pattern[str], str, float, Dict[str, int]]] = [
    (re.compile(r"\b(fed|fomc|powell|federal reserve|interest rates?|rate (?:hike|cut|decision))\b", re.I), "monetary_policy", 0.9, {"rates_us": 0, "usd": 0, "risk": 0}),
    (re.compile(r"\b(selic|copom|banco central do brasil|bcb|galipolo)\b", re.I), "monetary_policy", 1.0, {"rates_br": 0, "brl": 0, "risk": 0}),
    (re.compile(r"\b(inflation|consumer prices?|cpi|pce|ipca|prices? pressure)\b", re.I), "inflation", 0.9, {"inflation": 0, "rates_us": 0, "rates_br": 0}),
    (re.compile(r"\b(gdp|economic growth|recession|economic activity|industrial production|retail sales)\b", re.I), "growth", 0.8, {"growth": 0, "risk": 0, "rates_us": 0}),
    (re.compile(r"\b(war|attack|missile|sanctions?|geopolitic|conflict|invasion|blockade|hormuz (?:closed|closure|blocked|attack|disruption|risk|threat))\b", re.I), "geopolitics", 0.85, {"risk": -1, "energy": 1, "defense": 1}),
    (re.compile(r"\b(ceasefire|peace deal|peace agreement|deal to end|agreement to end|reopen(?:ing)? (?:of )?(?:the )?(?:strait of )?hormuz|hormuz reopen(?:s|ed|ing)?|tankers? resum(?:e|es|ed|ing)|blockade (?:eased|lifted|ends?|ended))\b", re.I), "geopolitics", 0.95, {"risk": 1, "energy": -1, "defense": -1}),
    (re.compile(r"\b(oil|crude|brent|wti|opec|natural gas|petroleum)\b", re.I), "energy", 0.85, {"energy": 0, "inflation": 0}),
    (re.compile(r"\b(gold|copper|iron ore|metals?|mining)\b", re.I), "metals", 0.75, {"metals": 0, "growth": 0, "risk": 0}),
    (re.compile(r"\b(ai|artificial intelligence|semiconductors?|chips?|data centers?|export controls?)\b", re.I), "equities", 0.8, {"technology": 0, "growth": 0, "risk": 0}),
]

POSITIVE = re.compile(r"\b(rise[sn]?|rose|rally|rallies|gain[sed]*|higher|hotter|accelerat(?:e|es|ed|ing)|strong(?:er)?|hawkish|hike[sd]?|tighten(?:s|ed|ing)?|surge[sd]?|beat[sed]*|above)\b", re.I)
NEGATIVE = re.compile(r"\b(fall[sn]?|fell|drop[sped]*|lower|cool(?:s|ed|ing)?|slow(?:s|ed|ing)?|weak(?:er)?|dovish|cut[st]?|eas(?:e|es|ed|ing)|recession|miss(?:es|ed)?|below|contract(?:s|ed|ing)?)\b", re.I)
RISK_OFF = re.compile(r"\b(risk[- ]off|selloff|turmoil|crisis|fear|tensions?|uncertainty|default|downgrade)\b", re.I)
RISK_ON = re.compile(r"\b(risk[- ]on|relief rally|optimism|soft landing|ceasefire|trade deal)\b", re.I)

FACTOR_ASSET = {
    "rates_br": {"DI": 1, "BRL": 0.4, "IBOV": -0.25},
    "rates_us": {"UST": 1, "DXY": 0.45, "SPX": -0.25, "GOLD": -0.2},
    "usd": {"DXY": 1, "BRL": -0.7, "GOLD": -0.45, "COPPER": -0.25},
    "brl": {"BRL": 1, "IBOV": 0.25},
    "inflation": {"DI": 0.5, "UST": 0.5, "GOLD": 0.2},
    "growth": {"SPX": 0.6, "IBOV": 0.5, "COPPER": 0.5, "OIL": 0.35},
    "risk": {"SPX": 0.8, "IBOV": 0.8, "BRL": 0.55, "GOLD": -0.45, "DXY": -0.35},
    "energy": {"OIL": 1, "IBOV": 0.2},
    "metals": {"COPPER": 0.8, "GOLD": 0.6, "IBOV": 0.2},
    "technology": {"SPX": 0.5},
    "defense": {"SPX": -0.1},
}


def stable_id(value: str) -> str:
    return hashlib.sha1(value.encode("utf-8")).hexdigest()[:12]


def parse_date(value: Optional[str]) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        date = parsedate_to_datetime(value)
        return date if date.tzinfo else date.replace(tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def text_of(node: ET.Element, tag: str) -> str:
    found = node.find(tag)
    if found is None:
        found = node.find(f"{{*}}{tag}")
    return (found.text or "").strip() if found is not None else ""


def fetch_feed(source_id: str, label: str, url: str, max_items: int) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    started = time.time()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/xml, text/xml"})
        with urllib.request.urlopen(req, timeout=15) as response:
            root = ET.fromstring(response.read())
        nodes = root.findall(".//item") or root.findall(".//{*}entry")
        items: List[Dict[str, Any]] = []
        invalid = 0
        for node in nodes:
            raw_title = text_of(node, "title")
            link = text_of(node, "link") or node.attrib.get("href", "")
            if not raw_title or not link:
                invalid += 1
                continue
            if source_id == "reuters" and not re.search(r"(?:\s[-–—]\s)Reuters$", raw_title, re.I):
                invalid += 1
                continue
            title = re.sub(r"(?:\s[-–—]\s)Reuters$", "", raw_title, flags=re.I).strip()
            published = parse_date(text_of(node, "pubDate") or text_of(node, "published") or text_of(node, "updated"))
            items.append({"id": stable_id(f"{source_id}:{link}"), "title": title, "source": label, "url": link, "publishedAt": published.isoformat()})
        items.sort(key=lambda item: item["publishedAt"], reverse=True)
        return items[:max_items], {"ok": bool(items), "label": label, "message": None, "stale": False, "cache": "miss", "fetchedAt": datetime.now(timezone.utc).isoformat(), "lastSuccessAt": datetime.now(timezone.utc).isoformat(), "ageMs": int((time.time() - started) * 1000), "itemCount": len(items[:max_items]), "invalidItemCount": invalid}
    except Exception as exc:
        return [], {"ok": False, "label": label, "message": str(exc), "stale": False, "cache": "miss", "fetchedAt": None, "lastSuccessAt": None, "ageMs": None, "itemCount": 0, "invalidItemCount": 0}


def headline_direction(title: str) -> int:
    pos, neg = bool(POSITIVE.search(title)), bool(NEGATIVE.search(title))
    if pos == neg:
        return 0
    return 1 if pos else -1


def merge_signal(bucket: Dict[str, Dict[str, float]], key: str, direction: int, strength: float) -> None:
    current = bucket.setdefault(key, {"directionTotal": 0.0, "strength": 0.0})
    current["directionTotal"] += direction * strength
    current["strength"] = max(current["strength"], strength)


def finalize(bucket: Dict[str, Dict[str, float]]) -> List[Dict[str, Any]]:
    out = []
    for key, value in bucket.items():
        total = value["directionTotal"]
        out.append({"id": key, "direction": 0 if total == 0 else 1 if total > 0 else -1, "strength": min(1, max(0, value["strength"]))})
    return sorted(out, key=lambda item: (-item["strength"], item["id"]))


def classify(title: str, published_at: str) -> Dict[str, Any]:
    direction = headline_direction(title)
    themes = set()
    factors: Dict[str, Dict[str, float]] = {}
    relevance = 0.0
    match_count = 0
    for pattern, theme, rule_relevance, rule_factors in RULES:
        if not pattern.search(title):
            continue
        themes.add(theme)
        relevance = max(relevance, rule_relevance)
        match_count += 1
        for factor, fixed in rule_factors.items():
            merge_signal(factors, factor, direction if fixed == 0 else fixed, rule_relevance)
    if RISK_OFF.search(title):
        themes.add("geopolitics")
        merge_signal(factors, "risk", -1, 0.9)
        relevance = max(relevance, 0.85)
        match_count += 1
    elif RISK_ON.search(title):
        merge_signal(factors, "risk", 1, 0.85)
        relevance = max(relevance, 0.8)
        match_count += 1
    factor_list = finalize(factors)
    assets: Dict[str, Dict[str, float]] = {}
    for factor in factor_list:
        for asset, exposure in FACTOR_ASSET.get(factor["id"], {}).items():
            asset_direction = 0 if factor["direction"] == 0 or exposure == 0 else int(factor["direction"] * (1 if exposure > 0 else -1))
            merge_signal(assets, asset, asset_direction, factor["strength"] * abs(exposure))
    published = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
    age_minutes = max(0, int((datetime.now(timezone.utc) - published).total_seconds() / 60))
    half_life = 240 if "geopolitics" in themes or "energy" in themes else 720
    decay = 0.5 ** (age_minutes / half_life)
    has_direction = any(signal["direction"] != 0 for signal in factor_list)
    confidence = 0 if match_count == 0 else min(1, 0.45 + min(match_count, 3) * 0.12 + (0.12 if has_direction else 0))
    return {"themes": sorted(themes), "factors": factor_list, "assets": finalize(assets), "relevance": min(1, relevance), "confidence": confidence, "decay": decay, "ageMinutes": age_minutes, "halfLifeMinutes": half_life}


def aggregate(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    def empty_signal(item_id: str) -> Dict[str, Any]:
        return {"id": item_id, "score": 0, "intensity": 0, "mentions": 0, "positive": 0, "negative": 0, "neutral": 0, "latestAt": None}

    assets: Dict[str, Dict[str, Any]] = {}
    factors: Dict[str, Dict[str, Any]] = {}
    for item in items:
        classification = item.get("classification") or {}
        weight = classification.get("relevance", 0) * classification.get("confidence", 0) * classification.get("decay", 0)
        for target_name, signals in (("assets", classification.get("assets", [])), ("factors", classification.get("factors", []))):
            target = assets if target_name == "assets" else factors
            for signal in signals:
                entry = target.setdefault(signal["id"], empty_signal(signal["id"]))
                signed = signal["direction"] * signal["strength"] * weight
                entry["score"] += signed
                entry["intensity"] += abs(signed)
                entry["mentions"] += 1
                entry["positive"] += 1 if signal["direction"] > 0 else 0
                entry["negative"] += 1 if signal["direction"] < 0 else 0
                entry["neutral"] += 1 if signal["direction"] == 0 else 0
                entry["latestAt"] = max(entry["latestAt"] or item["publishedAt"], item["publishedAt"])
    return {"asOf": datetime.now(timezone.utc).isoformat(), "itemCount": len(items), "classifiedCount": sum(1 for item in items if item.get("classification")), "assets": assets, "factors": factors}


def news_snapshot() -> Dict[str, Any]:
    all_items: List[Dict[str, Any]] = []
    sources: Dict[str, Any] = {}
    for source_id, label, url, max_items in NEWS_SOURCES:
        items, status = fetch_feed(source_id, label, url, max_items)
        sources[source_id] = status
        all_items.extend(items)
    deduped = {item["id"]: item for item in all_items}
    ranked = sorted(deduped.values(), key=lambda item: item["publishedAt"], reverse=True)[:MAX_HEADLINES]
    for item in ranked:
        item["classification"] = classify(item["title"], item["publishedAt"])
    sources["news"] = {"ok": bool(ranked), "label": "NEWS", "message": None if ranked else "No valid headlines available", "stale": False, "cache": "miss", "fetchedAt": datetime.now(timezone.utc).isoformat(), "lastSuccessAt": datetime.now(timezone.utc).isoformat() if ranked else None, "ageMs": None, "itemCount": len(ranked), "invalidItemCount": sum(s.get("invalidItemCount", 0) for s in sources.values())}
    return {"items": ranked, "sources": sources, "intelligence": aggregate(ranked), "freshness": {"ttlMs": 30000, "staleIfErrorMs": 900000, "oldestSourceAgeMs": None, "newestPublishedAt": ranked[0]["publishedAt"] if ranked else None}}
