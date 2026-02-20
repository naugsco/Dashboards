import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

# Sample news stories for testing the frontend
SAMPLE_STORIES = [
    {
        "title": "UK Parliament Passes New Climate Bill in Historic Vote",
        "description": "The House of Commons voted overwhelmingly in favor of ambitious new climate targets, marking a significant step in the country's environmental policy.",
        "url": "https://example.com/uk-climate-bill",
        "image_url": "https://via.placeholder.com/600x300",
        "published_at": "2024-12-20T10:30:00Z",
        "source": "BBC",
        "source_id": "bbc",
        "country": "United Kingdom",
        "priority": "politics",
        "relevance_score": 15.5,
        "sources": ["BBC"],
        "source_count": 1,
        "story_hash": "uk_climate_bill_123",
        "fetched_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "title": "Iceland Volcano Eruption Forces Emergency Evacuations",
        "description": "Authorities have evacuated nearby towns as the volcano on the Reykjanes Peninsula continues to spew lava and ash into the atmosphere.",
        "url": "https://example.com/iceland-volcano",
        "image_url": "https://via.placeholder.com/600x300",
        "published_at": "2024-12-20T08:15:00Z",
        "source": "Euronews",
        "source_id": "euronews",
        "country": "Iceland",
        "priority": "disaster",
        "relevance_score": 18.0,
        "sources": ["Euronews"],
        "source_count": 1,
        "story_hash": "iceland_volcano_456",
        "fetched_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "title": "Ireland Announces New Tech Investment Initiative",
        "description": "The Irish government unveils a €500 million investment program aimed at attracting international technology companies to Dublin.",
        "url": "https://example.com/ireland-tech",
        "image_url": "https://via.placeholder.com/600x300",
        "published_at": "2024-12-20T07:45:00Z",
        "source": "AP",
        "source_id": "ap",
        "country": "Ireland",
        "priority": "general",
        "relevance_score": 12.3,
        "sources": ["AP"],
        "source_count": 1,
        "story_hash": "ireland_tech_789",
        "fetched_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "title": "Portugal Introduces New Renewable Energy Targets",
        "description": "Portuguese lawmakers approve ambitious renewable energy goals as part of the country's commitment to carbon neutrality by 2050.",
        "url": "https://example.com/portugal-energy",
        "image_url": "https://via.placeholder.com/600x300",
        "published_at": "2024-12-20T06:20:00Z",
        "source": "BBC",
        "source_id": "bbc",
        "country": "Portugal",
        "priority": "politics",
        "relevance_score": 13.8,
        "sources": ["BBC"],
        "source_count": 1,
        "story_hash": "portugal_energy_101",
        "fetched_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "title": "Finland Signs Major Defense Agreement with NATO Allies",
        "description": "Finland strengthens its defense cooperation through new agreements with NATO member countries, enhancing regional security partnerships.",
        "url": "https://example.com/finland-nato",
        "image_url": "https://via.placeholder.com/600x300",
        "published_at": "2024-12-20T05:30:00Z",
        "source": "AP",
        "source_id": "ap",
        "country": "Finland",
        "priority": "politics",
        "relevance_score": 16.2,
        "sources": ["AP"],
        "source_count": 1,
        "story_hash": "finland_nato_202",
        "fetched_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "title": "Norway's Sovereign Wealth Fund Reports Record Returns",
        "description": "The world's largest sovereign wealth fund announces exceptional performance driven by global equity markets and strategic investments.",
        "url": "https://example.com/norway-fund",
        "image_url": "https://via.placeholder.com/600x300",
        "published_at": "2024-12-20T04:15:00Z",
        "source": "Euronews",
        "source_id": "euronews",
        "country": "Norway",
        "priority": "general",
        "relevance_score": 11.5,
        "sources": ["Euronews"],
        "source_count": 1,
        "story_hash": "norway_fund_303",
        "fetched_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "title": "Sweden Launches Major Arctic Research Program",
        "description": "Swedish scientists begin comprehensive Arctic climate research project to study the effects of warming temperatures on polar ecosystems.",
        "url": "https://example.com/sweden-arctic",
        "image_url": "https://via.placeholder.com/600x300",
        "published_at": "2024-12-20T03:00:00Z",
        "source": "BBC",
        "source_id": "bbc",
        "country": "Sweden",
        "priority": "general",
        "relevance_score": 10.7,
        "sources": ["BBC"],
        "source_count": 1,
        "story_hash": "sweden_arctic_404",
        "fetched_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "title": "Estonia Strengthens Cybersecurity Measures After Threats",
        "description": "Estonian government implements enhanced cybersecurity protocols following recent attempts to breach critical infrastructure systems.",
        "url": "https://example.com/estonia-cyber",
        "image_url": "https://via.placeholder.com/600x300",
        "published_at": "2024-12-20T02:45:00Z",
        "source": "AP",
        "source_id": "ap",
        "country": "Estonia",
        "priority": "politics",
        "relevance_score": 14.1,
        "sources": ["AP"],
        "source_count": 1,
        "story_hash": "estonia_cyber_505",
        "fetched_at": datetime.now(timezone.utc).isoformat()
    }
]

async def seed_sample_data():
    # Connect to MongoDB
    mongo_url = "mongodb://localhost:27017"
    client = AsyncIOMotorClient(mongo_url)
    db = client["test_database"]
    
    try:
        # Clear existing data
        await db.news_stories.delete_many({})
        print("Cleared existing stories")
        
        # Insert sample data
        await db.news_stories.insert_many(SAMPLE_STORIES)
        print(f"Inserted {len(SAMPLE_STORIES)} sample stories")
        
        # Update meta information
        await db.news_meta.update_one(
            {"key": "last_fetch"},
            {"$set": {
                "key": "last_fetch",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "story_count": len(SAMPLE_STORIES),
            }},
            upsert=True
        )
        print("Updated metadata")
        
    except Exception as e:
        print(f"Error seeding data: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(seed_sample_data())