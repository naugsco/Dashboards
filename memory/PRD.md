# Pulse - European News Monitor PRD

## Problem Statement
Dashboard showing top news stories for UK, Ireland, Portugal, Iceland, Moldova, Latvia, Lithuania, Estonia, Finland, Norway, Sweden, Cape Verde. Sources: AP, BBC, Euronews + Regional RSS feeds. Dark theme, auto-refresh, no auth. Backend updates every 15 min. Sports filtered. Politics & disasters prioritized. Deduplication + multi-source boosting + source diversity.

## Architecture
- **Backend**: FastAPI + MongoDB + NewsAPI.org (AP only) + BBC RSS (4 feeds) + Euronews RSS (4 feeds) + Regional RSS feeds (18 feeds)
- **Frontend**: React + Tailwind + Shadcn UI + react-simple-maps
- **Data Flow**: Backend fetches from RSS feeds + NewsAPI every 15min -> processes/deduplicates/scores -> stores in MongoDB -> Frontend polls via REST API

## Data Sources
- **BBC**: 4 RSS feeds (International, UK Edition, World, Europe)
- **Euronews**: 4 RSS feeds (All Latest, News, My Europe, Business)
- **AP**: NewsAPI.org (1 API call per cycle)
- **Regional**: 18 RSS feeds for country-specific coverage (Ireland, Iceland, Portugal, Baltics, Nordics, Moldova, Cape Verde)

## User Personas
- News-conscious professionals monitoring European affairs
- Policy analysts tracking political developments across multiple countries

## Core Requirements
- [x] Country-specific news from trusted sources (AP, BBC, Euronews + Regional)
- [x] Sports filtering (keyword-based)
- [x] Country relevance scoring
- [x] Politics/disaster priority classification
- [x] Story deduplication (title similarity)
- [x] Multi-source coverage boosting
- [x] Source diversity enforcement
- [x] Auto-refresh (15min backend + frontend countdown)
- [x] Dark theme dashboard (with light theme toggle)
- [x] Country and priority filtering
- [x] Article thumbnail images (RSS media content + og:image fallback)
- [x] Image visibility toggle
- [x] Interactive collapsible map with heatmap visualization
- [x] Map click-to-filter countries

## What's Implemented

### 2026-02-21
- **Interactive Europe Map Feature (COMPLETED)**:
  - Collapsible map toggle (click "Coverage Map" to expand/collapse)
  - Heatmap visualization: countries colored by story count (red=fewer, orange=medium, yellow=more)
  - Selection highlighting: selected countries turn green
  - Markers with story counts on each target country
  - Click-to-filter: clicking on map countries filters the news list
  - Map uses geoMercator projection via react-simple-maps
  - Legend shows color meanings
  - Cape Verde shown as inset marker

### 2026-02-20
- Full backend with NewsAPI + RSS feed integration
- Background scheduler (15min intervals)
- Data preservation on API failure (rate limit handling)
- Complete dashboard UI with Header, CountryFilter, NewsGrid, NewsCard, StatsPanel
- Source distribution visualization
- Priority breakdown panel
- Country coverage panel
- Auto-refresh countdown timer
- Article thumbnail images with og:image fallback
- Light/dark theme toggle
- Image visibility toggle
- Regional RSS feeds for less-covered countries

## Testing Status (2026-02-21)
- **Backend**: 100% (15/15 tests passed)
- **Frontend**: 95% (all features working)
- 424 stories from 21 sources across 12 countries
- All filtering, toggles, and map features verified working

## Backlog
- P0: None
- P1: None
- P2: Add search/text filter for stories
- P2: Add date range filtering
- P3: Email digest/notifications for high-priority stories
- P3: Add hover tooltips on map markers with preview info
