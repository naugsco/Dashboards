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
    "United Kingdom": {"code": "gb", "keywords": ["UK", "Britain", "British", "England", "Scotland", "Wales", "London", "Westminster", "Downing Street"]},
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


def is_sports(title: str, description: str) -> bool:
    text = f"{title} {description}".lower()
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


def assign_countries(title: str, description: str) -> list:
    """Assign relevant countries to a story based on content."""
    text = f"{title} {description}".lower()
    matched = []
    for country, info in COUNTRIES.items():
        if country.lower() in text:
            matched.append(country)
            continue
        for kw in info.get("keywords", []):
            if kw.lower() in text:
                matched.append(country)
                break
    return matched if matched else []


async def fetch_all_news():
    logger.info("Starting news fetch cycle...")
    all_stories = []
    all_country_terms = []
    for country, info in COUNTRIES.items():
        all_country_terms.append(country)
        all_country_terms.extend(info.get("keywords", [])[:2])

    # Build a broad query with key terms (NewsAPI max ~500 chars)
    # Use the most distinctive terms to stay within limits
    key_terms = list(COUNTRIES.keys())
    query = " OR ".join(f'"{t}"' for t in key_terms)

    async with httpx.AsyncClient() as http_client:
        # Call 1: AP + BBC
        try:
            source_ids = ",".join(TRUSTED_SOURCES.keys())
            resp = await http_client.get(
                f"{NEWS_API_BASE}/everything",
                params={
                    "q": query,
                    "sources": source_ids,
                    "language": "en",
                    "sortBy": "publishedAt",
                    "pageSize": 100,
                    "apiKey": NEWS_API_KEY,
                },
                timeout=20.0
            )
            if resp.status_code == 200:
                data = resp.json()
                logger.info(f"AP/BBC returned {data.get('totalResults', 0)} results")
                for article in data.get("articles", []):
                    title = article.get("title", "") or ""
                    desc = article.get("description", "") or ""
                    if is_sports(title, desc):
                        continue
                    countries = assign_countries(title, desc)
                    if not countries:
                        continue
                    source_id = article.get("source", {}).get("id", "")
                    source_name = TRUSTED_SOURCES.get(source_id, article.get("source", {}).get("name", "Unknown"))
                    for c in countries:
                        all_stories.append({
                            "title": title,
                            "description": desc,
                            "url": article.get("url", ""),
                            "image_url": article.get("urlToImage", ""),
                            "published_at": article.get("publishedAt", ""),
                            "source": source_name,
                            "source_id": source_id,
                            "country": c,
                            "priority": classify_priority(title, desc),
                            "relevance_score": compute_relevance(title, desc, c),
                            "sources": [source_name],
                            "source_count": 1,
                        })
            elif resp.status_code == 429:
                logger.warning("Rate limited on AP/BBC call. Will retry next cycle.")
            else:
                logger.warning(f"AP/BBC call returned {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.error(f"Error fetching AP/BBC: {e}")

        await asyncio.sleep(2)

        # Call 2: Euronews
        try:
            resp = await http_client.get(
                f"{NEWS_API_BASE}/everything",
                params={
                    "q": query,
                    "domains": EURONEWS_DOMAIN,
                    "language": "en",
                    "sortBy": "publishedAt",
                    "pageSize": 100,
                    "apiKey": NEWS_API_KEY,
                },
                timeout=20.0
            )
            if resp.status_code == 200:
                data = resp.json()
                logger.info(f"Euronews returned {data.get('totalResults', 0)} results")
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
                            "source": "Euronews",
                            "source_id": "euronews",
                            "country": c,
                            "priority": classify_priority(title, desc),
                            "relevance_score": compute_relevance(title, desc, c),
                            "sources": ["Euronews"],
                            "source_count": 1,
                        })
            elif resp.status_code == 429:
                logger.warning("Rate limited on Euronews call. Will retry next cycle.")
            else:
                logger.warning(f"Euronews call returned {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.error(f"Error fetching Euronews: {e}")

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
