# Pulse - European News Monitor PRD

## Problem Statement
Dashboard showing top news stories for UK, Ireland, Portugal, Iceland, Moldova, Latvia, Lithuania, Estonia, Finland, Norway, Sweden, Cape Verde. Sources: AP, BBC, Euronews. Dark theme, auto-refresh, no auth. Backend updates every 15 min. Sports filtered. Politics & disasters prioritized. Deduplication + multi-source boosting + source diversity.

## Architecture
- **Backend**: FastAPI + MongoDB + NewsAPI.org (2 API calls per cycle)
- **Frontend**: React + Tailwind + Shadcn UI
- **Data Flow**: Backend fetches from NewsAPI every 15min -> processes/deduplicates/scores -> stores in MongoDB -> Frontend polls via REST API

## User Personas
- News-conscious professionals monitoring European affairs
- Policy analysts tracking political developments across multiple countries

## Core Requirements
- [x] Country-specific news from trusted sources (AP, BBC, Euronews)
- [x] Sports filtering (keyword-based)
- [x] Country relevance scoring
- [x] Politics/disaster priority classification
- [x] Story deduplication (title similarity)
- [x] Multi-source coverage boosting
- [x] Source diversity enforcement
- [x] Auto-refresh (15min backend + frontend countdown)
- [x] Dark theme dashboard
- [x] Country and priority filtering

## What's Implemented (2026-02-20)
- Full backend with NewsAPI integration (optimized to 2 API calls/cycle)
- Background scheduler (15min intervals)
- Data preservation on API failure (rate limit handling)
- Complete dashboard UI with Header, CountryFilter, NewsGrid, NewsCard, StatsPanel
- Source distribution visualization
- Priority breakdown panel
- Country coverage panel
- Auto-refresh countdown timer

## Backlog
- P0: None
- P1: Add article images from news API when available
- P2: Add search/text filter for stories
- P2: Add date range filtering
- P3: Email digest/notifications for high-priority stories
