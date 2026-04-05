# Quick Start Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.10+
- API Keys (see below)

## 1. Environment Setup (5 minutes)

```bash
# Copy environment template
cp .env.example .env

# Required API keys to edit in .env:
# - OPENROUTER_API_KEY (or NVIDIA_API_KEY, or OLLAMA_BASE_URL)
# - MEDIUM_API_KEY (for publishing)
# - DISCORD_BOT_TOKEN (for human review)
# - DISCORD_CHANNEL_ID

# Optional:
# - REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET (for Reddit API)
# - NEWSAPI_KEY (for NewsAPI)
```

## 2. Start Infrastructure (2 minutes)

```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
# Should show: monitor-service, content-engine, postgres, redis
```

## 3. Install Landing Page (optional, 2 minutes)

```bash
cd landing-page
npm install
npm run dev
# Opens at http://localhost:5173
```

## 4. Test the Pipeline

### Test Monitoring (Python)
```bash
cd trending-engine
pip install -r requirements.txt
python monitor.py
# Should start detecting topics from Google Trends + RSS
```

### Test Content Generation (TypeScript)
```bash
cd content-engine
npm install
npm run dev
# Starts the orchestrator and Discord bot
```

### Access Database
```bash
psql postgres://user:password@localhost:5432/newsdb

-- Check topics detected
SELECT headline, combined_score, detected_at FROM processed_topics ORDER BY detected_at DESC LIMIT 10;

-- Check generated articles
SELECT headline, voice_profile, status FROM content_history ORDER BY created_at DESC;
```

## 5. Discord Bot Setup

1. Go to https://discord.com/developers/applications
2. Create new application
3. Go to "Bot" → Reset Token → Copy token
4. Add token to `.env` as `DISCORD_BOT_TOKEN`
5. Go to "OAuth2" → Add bot to your server
6. Copy channel ID where drafts should appear
7. Add as `DISCORD_CHANNEL_ID` to `.env`

## Default Configuration

| Service | Port | URL |
|---------|------|-----|
| Landing Page | 5173 | http://localhost:5173 |
| PostgreSQL | 5432 | postgres://user:password@localhost:5432/newsdb |
| Redis | 6379 | redis://localhost:6379 |

## Troubleshooting

### Monitor not detecting topics
- Check if APIs are configured in `.env`
- Verify score threshold: `SELECT * FROM processed_topics WHERE combined_score >= 3.0;`
- Check logs: `docker-compose logs monitor-service`

### Discord bot offline
- Verify `DISCORD_BOT_TOKEN` is valid
- Check bot has permission to send messages in channel
- Check logs: `docker-compose logs content-engine`

### Database connection issues
```bash
# View container logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

## Development Workflow

```bash
# 1. Make changes to code
# 2. Rebuild containers
docker-compose build

# 3. Restart services
docker-compose restart

# 4. View logs
docker-compose logs -f
```

## Production Deployment

For Runpod:
```bash
# Build images
docker-compose -f docker-compose.yml build

# Deploy with GPU support
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

For DigitalOcean (CPU only):
```bash
# Use CPU-optimized compose
docker-compose -f docker-compose.cpu.yml up -d
```

## Next Steps

1. ✅ System bootstrap complete
2. ⏭️ Test monitoring sources
3. ⏭️ Generate first article
4. ⏭️ Test Medium publishing
5. ⏭️ Configure Discord review flow
6. ⏭️ Refine voice profiles

For detailed workflow documentation, see [WORKFLOW.md](WORKFLOW.md).
For complete implementation details, see [IMPLEMENTATION.md](IMPLEMENTATION.md).
