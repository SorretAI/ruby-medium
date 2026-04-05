# Trending News → Medium Pipeline

## Overview

This system transforms trending news topics into published Medium articles using AI, with human-in-the-loop review via Discord. Built on the genesis-alpha multi-agent architecture.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PIPELINE FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   MONITOR    │────▶│   PROCESS    │────▶│   PUBLISH    │                │
│  │   (Python)   │     │  (TS + AI)   │     │  (Medium)    │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│         │                   │                  │                            │
│         ▼                   ▼                  ▼                            │
│  - Google Trends     - Summarize        - Human Review                    │
│  - Twitter/X         - FOMO/NEPQ        - Medium API                      │
│  - Reddit            - Citations        - Split Test                      │
│  - NewsAPI/GDELT     - CTA Gen          - Track Metrics                   │
│  - RSS Feeds                                                             │
│                                                                              │
│                     POSTGRESQL + pgvector (Memory/RAG)                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.11+
- API Keys (see Configuration)

### Installation

1. **Clone and configure:**
```bash
cd /home/lui/DEV/ruby-medium
cp .env.example .env
```

2. **Set required environment variables:**
```bash
# AI Providers
OPENROUTER_API_KEY=your_key_here
NVIDIA_API_KEY=your_key_here

# Database (auto-configured in docker-compose)
DATABASE_URL=postgres://user:password@localhost:5432/newsdb

# Discord Bot
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CHANNEL_ID=your_channel_id

# Medium API
MEDIUM_API_KEY=your_medium_token
```

3. **Start the stack:**
```bash
docker-compose up -d
```

4. **View logs:**
```bash
docker-compose logs -f
```

## Components

### 1. Monitoring Service (Python)

**Location:** `trending-engine/`

Monitors multiple sources every 5 minutes:

| Source | Method | Notes |
|--------|--------|-------|
| Google Trends | `pytrends` API | Rising searches |
| Twitter/X | Playwright scraper | Rate-limited, multiple accounts |
| Reddit | PRAW API + scraper fallback | r/technology, r/worldnews, r/finance |
| NewsAPI | REST API | Top headlines |
| GDELT | API | Global events |
| RSS Feeds | Parser | AP, Reuters, Bloomberg |

**Filtering Logic:**

Topics are scored on:
- Economic impact (keywords: Fed, dollar, crypto, AI, etc.)
- Shock value (sentiment analysis)
- Velocity (mention spike detection)

Threshold: Combined score ≥ 3.0

### 2. Content Engine (TypeScript)

**Location:** `content-engine/`

#### AI Summarization Pipeline

```
1. Extract full text (max 5 sources)
2. Cross-reference claims
3. Summarize (NVIDIA NIM → OpenRouter free → Ollama)
4. Add citations (inline + wiki footnotes + sources)
5. Conditional deep-dive link
```

#### Voice Engine (FOMO/NEPQ)

Transforms boring summaries into dramatic content:

| Before | After |
|--------|-------|
| "Fed announces 0.25% rate increase" | "**Your dollar just died at 2 PM today.**" |
| "AI company releases new model" | "**3.5 billion people just became obsolete.**" |

**Voice Profiles:**
- `QuantumAnchor` - Urgent, dramatic, insider knowledge
- `TechProphet` - Analytical, authoritative, predictions
- `FinanceRebel` - Contrarian, data-driven, actionable

#### CTA Generation

Context-aware CTAs matching article tone:

```typescript
// Fear + Crypto
"If you're wondering where quantum-resistant projects are accumulating..."

// Excitement + AI
"I'm tracking 17 founders using this exact pattern..."
```

### 3. Discord Bot (Human Review)

**Style:** Matches genesis-alpha (Midjourney-style buttons)

**Workflow:**
1. Draft sent to Discord channel as embed
2. User sees preview with:
   - Headline
   - Voice profile
   - Word count
   - Content preview
   - CTA preview
3. Interactive buttons:
   - ✅ Approve & Publish
   - ✏️ Edit Angle (creates thread)
   - ❌ Reject
   - 🔄 Rewrite (different voice)

### 4. Medium Publishing

**Split Testing:**
- Account A: QuantumAnchor persona
- Account B: TechProphet persona

**Metrics Tracked:**
- Reads, Claps, Followers
- VSL clicks
- Consultation leads

## Database Schema

**Location:** `shared/schema.sql`

Key tables:
- `processed_topics` - Detected trending topics
- `content_history` - Generated articles
- `performance_metrics` - Medium metrics
- `style_memories` - RAG storage for learning
- `medium_accounts` - Split test accounts
- `cfo_ledger` - Cost tracking

## Project Structure

```
ruby-medium/
├── trending-engine/          # Python monitoring service
│   ├── monitor.py           # Main monitoring loop
│   ├── models.py            # SQLAlchemy models
│   ├── scrapers/            # Platform scrapers
│   │   ├── twitter_scraper.py
│   │   ├── reddit_scraper.py
│   │   └── rss_monitor.py
│   ├── apis/                # API integrations
│   │   ├── google_trends.py
│   │   ├── newsapi.py
│   │   └── gdelt.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── content-engine/          # TypeScript AI processing
│   ├── src/
│   │   ├── agents/          # AI agents
│   │   │   ├── summarizer.ts
│   │   │   ├── voice_engine.ts
│   │   │   ├── cta_generator.ts
│   │   │   └── publisher.ts
│   │   ├── discord-bot.ts   # Human review bot
│   │   └── orchestrator.ts  # Main orchestrator
│   ├── package.json
│   └── Dockerfile
│
├── shared/                  # Shared resources
│   ├── schema.sql          # Database schema
│   └── init.sql            # Initialization
│
├── docker-compose.yml       # Master orchestration
├── .env.example            # Environment template
└── WORKFLOW.md             # This file
```

## Configuration

### Environment Variables

```bash
# === AI Providers ===
OPENROUTER_API_KEY=sk-xxx
NVIDIA_API_KEY=nim-xxx
OLLAMA_BASE_URL=http://localhost:11434

# === Database ===
DATABASE_URL=postgres://user:password@localhost:5432/newsdb

# === Redis ===
REDIS_URL=redis://localhost:6379

# === Discord ===
DISCORD_BOT_TOKEN=xxx
DISCORD_CHANNEL_ID=xxx

# === Medium ===
MEDIUM_API_KEY=xxx
MEDIUM_ACCOUNTS=account_a,account_b

# === Monitoring ===
MONITOR_INTERVAL_MINUTES=5
SCORE_THRESHOLD=3.0
```

### Scoring Thresholds

| Component | Threshold | Action |
|-----------|-----------|--------|
| Combined Score | ≥ 3.0 | Process topic |
| Economic Impact | ≥ 2.0 | Prioritize |
| Shock Value | ≥ 1.5 | Boost distribution |
| Velocity | ≥ 2.0 | Real-time alert |

## Implementation Phases

### Phase 1: Bootstrap (Week 1)
- [x] Database schema created
- [x] Docker Compose scaffold
- [ ] Basic monitoring (Google Trends + RSS + NewsAPI)
- [ ] Redis queue operational

### Phase 2: Core AI (Week 2)
- [ ] AI summarization pipeline
- [ ] Voice engine with FOMO/NEPQ
- [ ] Citation system

### Phase 3: Publishing (Week 3)
- [ ] Medium API integration
- [ ] Discord bot review workflow
- [ ] Split testing setup

### Phase 4: Learning (Week 4)
- [ ] Performance tracking
- [ ] RAG memory for style evolution
- [ ] CTO feedback loop

## Development Commands

```bash
# Start all services
docker-compose up -d

# Run Python monitor locally
cd trending-engine
pip install -r requirements.txt
python monitor.py

# Run content engine locally
cd content-engine
npm install
npm run dev

# View logs
docker-compose logs -f monitor-service
docker-compose logs -f content-engine

# Database access
psql postgres://user:password@localhost:5432/newsdb

# Redis CLI
redis-cli
```

## API Reference

### Discord Commands

| Command | Description |
|---------|-------------|
| `/review` | Trigger manual review of pending drafts |
| `/status` | Show system status |
| `/metrics` | Show latest performance metrics |
| `/regenerate <draft_id>` | Regenerate with different settings |

### Content Engine API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/drafts` | GET | List pending drafts |
| `/api/drafts/:id` | GET | Get draft details |
| `/api/drafts/:id/approve` | POST | Approve for publishing |
| `/api/drafts/:id/reject` | POST | Reject draft |
| `/api/metrics` | GET | Get performance metrics |

## Troubleshooting

### Monitor not detecting topics
- Check API keys in `.env`
- Verify score threshold (`SCORE_THRESHOLD=3.0`)
- Check `processed_topics` table for duplicates

### Discord bot not responding
- Verify `DISCORD_BOT_TOKEN` is valid
- Check bot has `Send Messages` permission in channel
- Ensure `DISCORD_CHANNEL_ID` matches

### Medium publish fails
- Check `MEDIUM_API_KEY` is valid
- Verify Medium account is in good standing
- Check rate limits (Medium: 1 post/hour for new accounts)

## Metrics & KPIs

**Primary:**
- Consultation leads generated
- VSL page clicks

**Secondary:**
- Medium followers gained
- Claps per article
- Read-to-clap ratio

**Cost Tracking:**
- API costs per article
- Human review time
- Effective hourly rate (CFO agent)

---

Built on the genesis-alpha architecture.
