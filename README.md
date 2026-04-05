# Trending News → Medium Pipeline

<div align="center">

**AI-powered trending news detection → Dramatic FOMO articles → Medium publishing**

[Features](#features) • [Quick Start](#quick-start) • [Architecture](#architecture) • [Workflow](WORKFLOW.md)

</div>

---

## Overview

This system transforms trending news topics into published Medium articles using AI, with human-in-the-loop review via Discord. Built on the genesis-alpha multi-agent architecture.

**What it does:**
1. Monitors Google Trends, Twitter/X, Reddit, NewsAPI, GDELT, and RSS feeds every 5 minutes
2. Filters topics by economic impact + shock value + velocity
3. Summarizes from max 5 sources using AI (NVIDIA NIM / OpenRouter / Ollama)
4. Applies dramatic FOMO/NEPQ voice framing ("Quantum Anchor" persona)
5. Generates context-aware CTAs
6. Publishes to Medium with human approval via Discord bot
7. Tracks performance metrics for style evolution (RAG)

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env
```

Fill in your API keys:
- `OPENROUTER_API_KEY` - AI summarization
- `MEDIUM_API_KEY` - Publishing
- `DISCORD_BOT_TOKEN` - Human review
- `DISCORD_CHANNEL_ID` - Review channel

### 2. Start the stack

```bash
docker-compose up -d
```

### 3. View logs

```bash
docker-compose logs -f
```

### 4. Open landing page (optional)

```bash
cd landing-page
npm install
npm run dev
```

## Project Structure

```
ruby-medium/
├── landing-page/              # MagicUI landing page (React/Vite)
│   ├── src/
│   │   ├── App.tsx           # Main landing component
│   │   ├── components/ui/    # MagicUI components
│   │   └── main.tsx
│   ├── package.json
│   └── tailwind.config.js
│
├── trending-engine/           # Python monitoring service
│   ├── monitor.py            # Main monitoring loop
│   ├── models.py             # SQLAlchemy models
│   ├── scrapers/             # Platform scrapers
│   ├── requirements.txt
│   └── Dockerfile
│
├── content-engine/            # TypeScript AI processing
│   ├── src/
│   │   ├── agents/           # AI agents
│   │   ├── discord-bot.ts    # Human review bot
│   │   └── orchestrator.ts
│   ├── package.json
│   └── Dockerfile
│
├── shared/                    # Shared resources
│   └── schema.sql            # PostgreSQL + pgvector schema
│
├── docker-compose.yml         # Master orchestration
├── .env.example              # Environment template
├── WORKFLOW.md               # Detailed workflow docs
└── README.md                 # This file
```

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRENDING NEWS PIPELINE                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SOURCES (5-min polling)                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐  │
│  │GoogleTrends │ │  Twitter/X  │ │    Reddit   │ │  NewsAPI/GDELT  │  │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └───────┬─────────┘  │
│         │               │               │                │            │
│         └───────────────┴───────────────┴────────────────┘            │
│                             │                                          │
│                             ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   MONITOR (Python)                                │  │
│  │  - Filter: Dollar Impact + Shock Value + Velocity                │  │
│  │  - Threshold: Score ≥ 3.0                                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                             │                                          │
│                             ▼ (Redis Queue)                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                 PROCESS (TypeScript + AI)                         │  │
│  │  1. Fetch 3-5 source articles                                    │  │
│  │  2. Summarize (NVIDIA NIM → OpenRouter → Ollama)                 │  │
│  │  3. Apply FOMO/NEPQ voice framing                                │  │
│  │  4. Generate context-aware CTA                                   │  │
│  │  5. Add citations (inline + footnotes + sources)                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                             │                                          │
│                             ▼ (Discord Bot)                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    HUMAN REVIEW                                   │  │
│  │  - Draft embed with preview                                      │  │
│  │  - Buttons: Approve/Edit/Reject/Rewrite                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                             │                                          │
│                             ▼ (Medium API)                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      PUBLISH                                      │  │
│  │  - Split test: Account A vs Account B                            │  │
│  │  - Track: reads, claps, followers, leads                        │  │
│  │  - Feed RAG for style evolution                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

## Features

### Monitoring
- [x] Google Trends rising searches
- [x] RSS feeds (AP, Reuters, Bloomberg, TechCrunch)
- [x] NewsAPI top headlines
- [ ] Twitter/X scraper (Playwright)
- [ ] Reddit PRAW + scraper fallback
- [ ] GDELT integration

### AI Processing
- [x] Multi-model support (NVIDIA NIM, OpenRouter, Ollama)
- [x] FOMO/NEPQ voice framing
- [x] Context-aware CTA generation
- [x] Wiki-style citations

### Publishing
- [x] Medium API integration
- [x] Discord bot review (genesis-alpha style)
- [x] Split testing (2 accounts)
- [x] Performance tracking

### Learning
- [x] PostgreSQL + pgvector RAG
- [x] Style memory storage
- [x] Content history tracking
- [ ] Performance-based style evolution

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | AI provider key | Required |
| `NVIDIA_API_KEY` | NVIDIA NIM key | Optional |
| `MEDIUM_API_KEY` | Medium publishing | Required |
| `DISCORD_BOT_TOKEN` | Discord bot token | Required |
| `DATABASE_URL` | PostgreSQL connection | Auto |
| `REDIS_URL` | Redis connection | Auto |
| `MONITOR_INTERVAL_MINUTES` | Polling frequency | `5` |
| `SCORE_THRESHOLD` | Topic score cutoff | `3.0` |

### Score Thresholds

Topics are scored on:
- **Economic Impact** (0-3): Keywords like Fed, dollar, crypto, AI
- **Shock Value** (0-2): Sentiment polarity extremes
- **Velocity** (0-4): Mention spike detection

Threshold: Combined score ≥ 3.0

## API Reference

### Discord Commands

| Command | Description |
|---------|-------------|
| `/review` | Trigger manual review |
| `/status` | System status |
| `/metrics` | Performance metrics |

## Troubleshooting

### Monitor not detecting topics
1. Check API keys in `.env`
2. Verify score threshold (`SCORE_THRESHOLD=3.0`)
3. Check `processed_topics` table for duplicates

### Discord bot not responding
1. Verify `DISCORD_BOT_TOKEN` is valid
2. Check bot has `Send Messages` permission
3. Ensure `DISCORD_CHANNEL_ID` matches

### Medium publish fails
1. Check `MEDIUM_API_KEY` validity
2. Verify Medium account status
3. Check rate limits (1 post/hour for new accounts)

## Development

```bash
# Run Python monitor locally
cd trending-engine
pip install -r requirements.txt
python monitor.py

# Run content engine locally
cd content-engine
npm install
npm run dev

# Run landing page
cd landing-page
npm install
npm run dev

# Database access
psql postgres://user:password@localhost:5432/newsdb

# View all logs
docker-compose logs -f
```

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

## License

MIT

## Related

- [WORKFLOW.md](WORKFLOW.md) - Complete workflow documentation
- [genesis-alpha](./genesis-alpha) - Original multi-agent architecture
