from fastapi import FastAPI, APIRouter, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
import asyncio
import hashlib
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import feedparser
from difflib import SequenceMatcher

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

NEWS_API_KEY = os.environ.get('NEWS_API_KEY', '')
NEWS_API_BASE = "https://newsapi.org/v2"

COUNTRIES = {
    "United Kingdom": {"code": "gb", "keywords": ["UK", "Britain", "British", "England", "Scotland", "Wales", "London", "Westminster", "Downing Street", "Starmer", "Sunak"]},
    "Ireland": {"code": "ie", "keywords": ["Irish", "Dublin", "Taoiseach", "Dail"]},
    "Portugal": {"code": "pt", "keywords": ["Portuguese", "Lisbon", "Lisboa"]},
    "Iceland": {"code": "is", "keywords": ["Icelandic", "Reykjavik"]},
    "Moldova": {"code": "md", "keywords": ["Moldovan", "Chisinau", "Kishinev"]},
    "Latvia": {"code": "lv", "keywords": ["Latvian", "Riga"]},
    "Lithuania": {"code": "lt", "keywords": ["Lithuanian", "Vilnius"]},
    "Estonia": {"code": "ee", "keywords": ["Estonian", "Tallinn"]},
    "Finland": {"code": "fi", "keywords": ["Finnish", "Helsinki"]},
    "Norway": {"code": "no", "keywords": ["Norwegian", "Oslo"]},
    "Sweden": {"code": "se", "keywords": ["Swedish", "Stockholm"]},
    "Cape Verde": {"code": "cv", "keywords": ["Cape Verdean", "Praia", "Cabo Verde"]},
}

SPORTS_KEYWORDS = [
    "football", "soccer", "cricket", "rugby", "tennis", "golf", "basketball",
    "baseball", "hockey", "nfl", "nba", "mlb", "nhl", "premier league",
    "champions league", "world cup", "olympics", "olympic", "athletic",
    "marathon", "tournament", "championship", "playoff", "relegation",
    "transfer", "signing", "coach", "striker", "goalkeeper", "midfielder",
    "defender", "batting", "bowling", "wicket", "innings", "touchdown",
    "slam dunk", "grand prix", "formula 1", "f1", "motorsport", "boxing",
    "mma", "ufc", "wrestling", "swimming", "cycling", "tour de france",
    "la liga", "serie a", "bundesliga", "ligue 1", "europa league",
    "super bowl", "wimbledon", "roland garros", "us open tennis",
    "australian open tennis", "match day", "half-time", "penalty kick",
    "red card", "yellow card", "offside", "hat-trick", "ballon d'or",
    "fifa", "uefa", "sporting", "atletico", "real madrid", "barcelona fc",
    "manchester united", "manchester city", "liverpool fc", "chelsea fc",
    "arsenal fc", "tottenham", "six nations"
]

POLITICS_KEYWORDS = [
    "election", "parliament", "minister", "president", "government",
    "legislation", "law", "policy", "vote", "referendum", "diplomatic",
    "sanction", "treaty", "political", "opposition", "coalition",
    "prime minister", "chancellor", "congress", "senate", "nato",
    "european union", "eu", "brexit", "democracy", "authoritarian",
    "corruption", "impeach", "cabinet", "foreign affairs", "ambassador",
    "summit", "bilateral", "geopolitical", "sovereignty"
]

DISASTER_KEYWORDS = [
    "earthquake", "tsunami", "hurricane", "typhoon", "cyclone", "tornado",
    "flood", "flooding", "wildfire", "fire", "volcano", "eruption",
    "landslide", "avalanche", "drought", "famine", "storm", "blizzard",
    "heatwave", "heat wave", "cold snap", "freeze", "disaster", "emergency",
    "evacuation", "rescue", "casualties", "death toll", "devastation",
    "destruction", "catastrophe", "crisis", "severe weather", "extreme weather",
    "climate emergency", "power outage", "blackout"
]

TRUSTED_SOURCES = {
    "associated-press": "AP",
    "bbc-news": "BBC",
}
EURONEWS_DOMAIN = "euronews.com"

BBC_RSS_FEEDS = [
    "https://feeds.bbci.co.uk/news/rss.xml?edition=int",
    "https://feeds.bbci.co.uk/news/rss.xml",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
]

EURONEWS_RSS_FEEDS = [
    "https://www.euronews.com/rss",
    "https://www.euronews.com/rss?level=vertical&name=news",
    "https://www.euronews.com/rss?level=program&name=europe-news",
    "https://www.euronews.com/rss?level=vertical&name=business",
]

# Regional feeds for less-covered countries — each maps to (source_label, target_country)
REGIONAL_RSS_FEEDS = [
    # Iceland
    ("https://www.ruv.is/rss/english", "RUV", "Iceland"),
    ("https://www.icelandreview.com/feed/", "Iceland Review", "Iceland"),
    ("https://grapevine.is/feed/", "Grapevine", "Iceland"),
    # Moldova
    ("https://moldovalive.md/feed/", "Moldova Live", "Moldova"),
    ("https://news.yam.md/en/rss", "YAM News", "Moldova"),
    # Estonia
    ("https://news.err.ee/rss", "ERR News", "Estonia"),
    # Latvia
    ("https://eng.lsm.lv/rss/", "LSM Latvia", "Latvia"),
    # Lithuania — no working English RSS found; rely on Baltic Times + Euronews
    # Baltic States (shared)
    ("https://feeds.feedburner.com/TheBalticTimesNews", "Baltic Times", None),  # None = assign via content
    # Ireland
    ("https://www.irishcentral.com/feeds/section-articles.atom", "Irish Central", "Ireland"),
    ("https://www.irishmirror.ie/?service=rss", "Irish Mirror", "Ireland"),
    ("https://www.irishnews.com/arc/outboundfeeds/rss/", "Irish News", "Ireland"),
    # Cape Verde
    ("https://expressodasilhas.cv/rss", "Expresso das Ilhas", "Cape Verde"),
    # Portugal
    ("https://www.portugalresident.com/feed/", "Portugal Resident", "Portugal"),
    ("https://www.theportugalnews.com/rss", "The Portugal News", "Portugal"),
    # Norway
    ("https://feeds.thelocal.com/rss/no", "The Local Norway", "Norway"),
    # Sweden
    ("https://feeds.thelocal.com/rss/se", "The Local Sweden", "Sweden"),
    # Finland
    ("https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_NEWS&language=en", "Yle News", "Finland"),
    ("https://finlandtoday.fi/feed/", "Finland Today", "Finland"),
]


def is_sports(title: str, description: str) -> bool:
    text = f"{title} {description}".lower()
    # Single strong sports keyword = sports
    strong_sports = ["premier league", "champions league", "world cup", "six nations",
                     "grand prix", "formula 1", "super bowl", "wimbledon", "roland garros",
                     "ballon d'or", "fifa", "uefa", "nfl", "nba", "mlb", "nhl",
                     "la liga", "serie a", "bundesliga", "ligue 1", "europa league",
                     "tour de france", "ufc", "mma"]
    for kw in strong_sports:
        if kw in text:
            return True
    # Two or more general sports keywords = sports
    count = sum(1 for kw in SPORTS_KEYWORDS if kw in text)
    return count >= 2


def classify_priority(title: str, description: str) -> str:
    text = f"{title} {description}".lower()
    disaster_score = sum(1 for kw in DISASTER_KEYWORDS if kw in text)
    politics_score = sum(1 for kw in POLITICS_KEYWORDS if kw in text)
    if disaster_score >= 2:
        return "disaster"
    if politics_score >= 2:
        return "politics"
    if disaster_score >= 1:
        return "disaster"
    if politics_score >= 1:
        return "politics"
    return "general"


def compute_relevance(title: str, description: str, country: str) -> float:
    text = f"{title} {description}".lower()
    country_lower = country.lower()
    score = 0.0
    if country_lower in text:
        score += 5.0
    if country_lower in title.lower():
        score += 3.0
    country_info = COUNTRIES.get(country, {})
    for kw in country_info.get("keywords", []):
        if kw.lower() in text:
            score += 2.0
        if kw.lower() in title.lower():
            score += 1.5
    priority = classify_priority(title, description)
    if priority == "disaster":
        score += 3.0
    elif priority == "politics":
        score += 2.0
    return min(score, 20.0)


def deduplicate_stories(stories: list) -> list:
    unique = []
    for story in stories:
        is_dup = False
        for existing in unique:
            similarity = SequenceMatcher(None, story["title"].lower(), existing["title"].lower()).ratio()
            if similarity > 0.65:
                if story.get("source_count", 1) > existing.get("source_count", 1):
                    existing["source_count"] = story.get("source_count", 1)
                    existing["sources"] = list(set(existing.get("sources", []) + story.get("sources", [])))
                is_dup = True
                break
        if not is_dup:
            unique.append(story)
    return unique


def enforce_source_diversity(stories: list, max_per_source: int = 0) -> list:
    if not stories:
        return stories
    total = len(stories)
    num_sources = len(set(s.get("source", "") for s in stories))
    if num_sources == 0:
        return stories
    max_per_source = max(total // num_sources + 2, 5)
    source_counts = {}
    result = []
    for story in stories:
        src = story.get("source", "Unknown")
        current = source_counts.get(src, 0)
        if current < max_per_source:
            result.append(story)
            source_counts[src] = current + 1
    return result


def multi_source_boost(stories: list) -> list:
    title_map = {}
    for story in stories:
        key = re.sub(r'[^a-z0-9\s]', '', story["title"].lower()).strip()
        found = False
        for existing_key in title_map:
            if SequenceMatcher(None, key, existing_key).ratio() > 0.6:
                title_map[existing_key]["sources"].add(story.get("source", "Unknown"))
                title_map[existing_key]["stories"].append(story)
                found = True
                break
        if not found:
            title_map[key] = {
                "sources": {story.get("source", "Unknown")},
                "stories": [story]
            }
    boosted = []
    for key, data in title_map.items():
        best = max(data["stories"], key=lambda s: s.get("relevance_score", 0))
        best["source_count"] = len(data["sources"])
        best["sources"] = list(data["sources"])
        if best["source_count"] > 1:
            best["relevance_score"] = best.get("relevance_score", 0) + (best["source_count"] * 1.5)
        boosted.append(best)
    return boosted


# Broad European terms — stories with these get assigned to relevant member countries
EU_MEMBERS = ["Ireland", "Portugal", "Latvia", "Lithuania", "Estonia", "Finland", "Sweden"]
NATO_MEMBERS = ["United Kingdom", "Iceland", "Portugal", "Norway", "Latvia", "Lithuania", "Estonia", "Finland", "Sweden"]
NORDIC_COUNTRIES = ["Iceland", "Finland", "Norway", "Sweden"]
BALTIC_COUNTRIES = ["Latvia", "Lithuania", "Estonia"]
EUROPEAN_ALL = list(COUNTRIES.keys())

BROAD_EUROPEAN_KEYWORDS = {
    "european union": EU_MEMBERS,
    "european commission": EU_MEMBERS,
    "european council": EU_MEMBERS,
    "european parliament": EU_MEMBERS,
    "eu summit": EU_MEMBERS,
    "eu member": EU_MEMBERS,
    "brussels": EU_MEMBERS,
    "nato": NATO_MEMBERS,
    "nato alliance": NATO_MEMBERS,
    "atlantic alliance": NATO_MEMBERS,
    "nordic": NORDIC_COUNTRIES,
    "scandinavian": ["Norway", "Sweden", "Finland", "Iceland"],
    "scandinavia": ["Norway", "Sweden", "Finland", "Iceland"],
    "baltic": BALTIC_COUNTRIES,
    "baltic states": BALTIC_COUNTRIES,
}


def assign_countries(title: str, description: str, broad_match: bool = False) -> list:
    """Assign relevant countries to a story based on content.
    
    If broad_match=True, also match broad European terms (EU, NATO, etc.)
    and assign to relevant member countries.
    """
    text = f"{title} {description}"
    text_lower = text.lower()
    matched = set()

    # Direct country/keyword matching
    for country, info in COUNTRIES.items():
        if country.lower() in text_lower:
            matched.add(country)
            continue
        for kw in info.get("keywords", []):
            if len(kw) <= 3:
                if re.search(r'\b' + re.escape(kw) + r'\b', text, re.IGNORECASE):
                    matched.add(country)
                    break
            elif kw.lower() in text_lower:
                matched.add(country)
                break

    # Broad European term matching (only for AP/BBC/Euronews)
    if broad_match and not matched:
        for keyword, countries in BROAD_EUROPEAN_KEYWORDS.items():
            if keyword in text_lower:
                # Add all relevant member countries, but with lower relevance
                matched.update(countries)

    return list(matched) if matched else []


async def fetch_rss_feed(url: str, http_client: httpx.AsyncClient) -> list:
    """Fetch and parse a single RSS feed."""
    try:
        resp = await http_client.get(url, timeout=15.0, follow_redirects=True)
        if resp.status_code == 200:
            feed = feedparser.parse(resp.text)
            return feed.entries
        else:
            logger.warning(f"RSS feed {url} returned {resp.status_code}")
    except Exception as e:
        logger.error(f"Error fetching RSS feed {url}: {e}")
    return []


async def fetch_og_image(url: str, http_client: httpx.AsyncClient) -> str:
    """Extract og:image from an article page."""
    try:
        resp = await http_client.get(url, timeout=8.0, follow_redirects=True)
        if resp.status_code == 200:
            match = re.search(r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', resp.text[:15000])
            if match:
                return match.group(1)
    except Exception:
        pass
    return ""


async def enrich_missing_images(stories: list, http_client: httpx.AsyncClient):
    """Fetch og:image for stories that don't have thumbnails."""
    tasks = []
    indices = []
    for i, story in enumerate(stories):
        if not story.get("image_url") and story.get("url"):
            tasks.append(fetch_og_image(story["url"], http_client))
            indices.append(i)
    if not tasks:
        return
    # Process in batches of 10 to avoid overwhelming servers
    batch_size = 10
    for batch_start in range(0, len(tasks), batch_size):
        batch = tasks[batch_start:batch_start + batch_size]
        batch_indices = indices[batch_start:batch_start + batch_size]
        results = await asyncio.gather(*batch, return_exceptions=True)
        for idx, result in zip(batch_indices, results):
            if isinstance(result, str) and result:
                stories[idx]["image_url"] = result
        if batch_start + batch_size < len(tasks):
            await asyncio.sleep(0.5)
    enriched = sum(1 for i in indices if stories[i].get("image_url"))
    logger.info(f"Enriched {enriched}/{len(indices)} stories with og:image thumbnails")


def parse_rss_entry(entry, source_name: str) -> dict:
    """Convert an RSS feed entry into a story dict."""
    title = entry.get("title", "") or ""
    description = entry.get("summary", "") or entry.get("description", "") or ""
    # Strip HTML tags from description
    description = re.sub(r'<[^>]+>', '', description).strip()
    link = entry.get("link", "") or ""
    
    # Parse published date
    published = entry.get("published", "") or entry.get("updated", "") or ""
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        try:
            published = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
        except Exception:
            pass
    elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
        try:
            published = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc).isoformat()
        except Exception:
            pass

    # Get image URL from media content if available
    image_url = ""
    if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
        image_url = entry.media_thumbnail[0].get("url", "")
    elif hasattr(entry, "media_content") and entry.media_content:
        image_url = entry.media_content[0].get("url", "")
    elif hasattr(entry, "enclosures") and entry.enclosures:
        for enc in entry.enclosures:
            if enc.get("type", "").startswith("image"):
                image_url = enc.get("href", "") or enc.get("url", "")
                break

    return {
        "title": title,
        "description": description[:500],
        "url": link,
        "image_url": image_url,
        "published_at": published,
        "source": source_name,
        "source_id": source_name.lower().replace(" ", "-"),
    }


async def fetch_all_news():
    logger.info("Starting news fetch cycle...")
    all_stories = []

    # Build broad query for AP via NewsAPI
    key_terms = list(COUNTRIES.keys())
    query = " OR ".join(f'"{t}"' for t in key_terms)

    async with httpx.AsyncClient(headers={"User-Agent": "Mozilla/5.0 (compatible; PulseNewsBot/1.0)"}) as http_client:

        # === BBC RSS Feeds ===
        bbc_seen_urls = set()
        for feed_url in BBC_RSS_FEEDS:
            entries = await fetch_rss_feed(feed_url, http_client)
            for entry in entries:
                parsed = parse_rss_entry(entry, "BBC")
                if not parsed["title"] or parsed["url"] in bbc_seen_urls:
                    continue
                bbc_seen_urls.add(parsed["url"])
                title, desc = parsed["title"], parsed["description"]
                if is_sports(title, desc):
                    continue
                countries = assign_countries(title, desc, broad_match=True)
                if not countries:
                    continue
                for c in countries:
                    all_stories.append({
                        **parsed,
                        "country": c,
                        "priority": classify_priority(title, desc),
                        "relevance_score": compute_relevance(title, desc, c),
                        "sources": ["BBC"],
                        "source_count": 1,
                    })
            await asyncio.sleep(0.3)
        logger.info(f"BBC RSS: fetched {len(bbc_seen_urls)} unique articles, {sum(1 for s in all_stories if s['source']=='BBC')} country-matched stories")

        # === Euronews RSS Feeds ===
        euro_seen_urls = set()
        euro_start = len(all_stories)
        for feed_url in EURONEWS_RSS_FEEDS:
            entries = await fetch_rss_feed(feed_url, http_client)
            for entry in entries:
                parsed = parse_rss_entry(entry, "Euronews")
                if not parsed["title"] or parsed["url"] in euro_seen_urls:
                    continue
                euro_seen_urls.add(parsed["url"])
                title, desc = parsed["title"], parsed["description"]
                if is_sports(title, desc):
                    continue
                countries = assign_countries(title, desc)
                if not countries:
                    continue
                for c in countries:
                    all_stories.append({
                        **parsed,
                        "country": c,
                        "priority": classify_priority(title, desc),
                        "relevance_score": compute_relevance(title, desc, c),
                        "sources": ["Euronews"],
                        "source_count": 1,
                    })
            await asyncio.sleep(0.3)
        euro_count = sum(1 for s in all_stories[euro_start:] if s['source'] == 'Euronews')
        logger.info(f"Euronews RSS: fetched {len(euro_seen_urls)} unique articles, {euro_count} country-matched stories")

        # === Regional RSS Feeds (for less-covered countries) ===
        regional_seen_urls = set()
        regional_start = len(all_stories)
        for feed_url, source_label, target_country in REGIONAL_RSS_FEEDS:
            entries = await fetch_rss_feed(feed_url, http_client)
            for entry in entries:
                parsed = parse_rss_entry(entry, source_label)
                if not parsed["title"] or parsed["url"] in regional_seen_urls:
                    continue
                regional_seen_urls.add(parsed["url"])
                title, desc = parsed["title"], parsed["description"]
                if is_sports(title, desc):
                    continue
                if target_country:
                    # Fixed country assignment for country-specific feeds
                    countries = [target_country]
                else:
                    # Baltic Times etc — detect from content
                    countries = assign_countries(title, desc)
                    if not countries:
                        # For Baltic Times, default to all 3 Baltic states if no match
                        if "baltic" in source_label.lower():
                            countries = ["Latvia", "Lithuania", "Estonia"]
                        else:
                            continue
                for c in countries:
                    all_stories.append({
                        **parsed,
                        "country": c,
                        "priority": classify_priority(title, desc),
                        "relevance_score": compute_relevance(title, desc, c),
                        "sources": [source_label],
                        "source_count": 1,
                    })
            await asyncio.sleep(0.3)
        regional_count = len(all_stories) - regional_start
        logger.info(f"Regional RSS: fetched {len(regional_seen_urls)} unique articles, {regional_count} country-matched stories")

        # === AP via NewsAPI ===
        try:
            resp = await http_client.get(
                f"{NEWS_API_BASE}/everything",
                params={
                    "q": query,
                    "sources": "associated-press",
                    "language": "en",
                    "sortBy": "publishedAt",
                    "pageSize": 100,
                    "apiKey": NEWS_API_KEY,
                },
                timeout=20.0
            )
            if resp.status_code == 200:
                data = resp.json()
                ap_count = 0
                for article in data.get("articles", []):
                    title = article.get("title", "") or ""
                    desc = article.get("description", "") or ""
                    if is_sports(title, desc):
                        continue
                    countries = assign_countries(title, desc)
                    if not countries:
                        continue
                    for c in countries:
                        all_stories.append({
                            "title": title,
                            "description": desc,
                            "url": article.get("url", ""),
                            "image_url": article.get("urlToImage", ""),
                            "published_at": article.get("publishedAt", ""),
                            "source": "AP",
                            "source_id": "associated-press",
                            "country": c,
                            "priority": classify_priority(title, desc),
                            "relevance_score": compute_relevance(title, desc, c),
                            "sources": ["AP"],
                            "source_count": 1,
                        })
                        ap_count += 1
                logger.info(f"AP NewsAPI: {data.get('totalResults', 0)} results, {ap_count} country-matched stories")
            elif resp.status_code == 429:
                logger.warning("AP NewsAPI rate limited. BBC & Euronews RSS still available.")
            else:
                logger.warning(f"AP NewsAPI returned {resp.status_code}")
        except Exception as e:
            logger.error(f"Error fetching AP: {e}")

        # === Enrich missing thumbnails via og:image ===
        await enrich_missing_images(all_stories, http_client)

    all_stories = multi_source_boost(all_stories)
    all_stories = deduplicate_stories(all_stories)
    all_stories = enforce_source_diversity(all_stories)
    all_stories.sort(key=lambda s: s.get("relevance_score", 0), reverse=True)

    for story in all_stories:
        story["story_hash"] = hashlib.md5(story["title"].encode()).hexdigest()
        story["fetched_at"] = datetime.now(timezone.utc).isoformat()

    # Only replace data if we actually got stories; preserve existing data on API failure
    if all_stories:
        await db.news_stories.delete_many({})
        await db.news_stories.insert_many(all_stories)
        logger.info(f"Fetched and stored {len(all_stories)} stories")
    else:
        existing = await db.news_stories.count_documents({})
        logger.info(f"No new stories fetched (API may be rate-limited). Preserving {existing} existing stories.")

    await db.news_meta.update_one(
        {"key": "last_fetch"},
        {"$set": {
            "key": "last_fetch",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "story_count": await db.news_stories.count_documents({}),
        }},
        upsert=True
    )

    return await db.news_stories.count_documents({})


class StoryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str
    description: str
    url: str
    image_url: Optional[str] = None
    published_at: str
    source: str
    country: str
    priority: str
    relevance_score: float
    sources: List[str] = []
    source_count: int = 1
    story_hash: str = ""
    fetched_at: str = ""


@api_router.get("/")
async def root():
    return {"message": "News Dashboard API"}


@api_router.get("/news")
async def get_news(
    country: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
):
    query = {}
    if country and country != "all":
        query["country"] = country
    if priority and priority != "all":
        query["priority"] = priority

    stories = await db.news_stories.find(query, {"_id": 0}).sort("relevance_score", -1).to_list(limit)
    return {"stories": stories, "count": len(stories)}


@api_router.get("/news/stats")
async def get_news_stats():
    pipeline = [
        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    source_dist = await db.news_stories.aggregate(pipeline).to_list(100)

    country_pipeline = [
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    country_dist = await db.news_stories.aggregate(country_pipeline).to_list(100)

    priority_pipeline = [
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    priority_dist = await db.news_stories.aggregate(priority_pipeline).to_list(100)

    meta = await db.news_meta.find_one({"key": "last_fetch"}, {"_id": 0})
    total = await db.news_stories.count_documents({})

    return {
        "total_stories": total,
        "source_distribution": [{"source": s["_id"], "count": s["count"]} for s in source_dist],
        "country_distribution": [{"country": c["_id"], "count": c["count"]} for c in country_dist],
        "priority_distribution": [{"priority": p["_id"], "count": p["count"]} for p in priority_dist],
        "last_updated": meta.get("timestamp") if meta else None,
    }


@api_router.get("/news/countries")
async def get_countries():
    return {"countries": list(COUNTRIES.keys())}


@api_router.post("/news/refresh")
async def trigger_refresh():
    count = await fetch_all_news()
    return {"message": "Refresh complete", "story_count": count}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


background_task = None

async def periodic_fetch():
    while True:
        try:
            await fetch_all_news()
        except Exception as e:
            logger.error(f"Periodic fetch error: {e}")
        await asyncio.sleep(900)  # 15 minutes


@app.on_event("startup")
async def startup():
    global background_task
    background_task = asyncio.create_task(periodic_fetch())
    logger.info("Background news fetcher started (every 15 minutes)")


@app.on_event("shutdown")
async def shutdown():
    global background_task
    if background_task:
        background_task.cancel()
    client.close()
