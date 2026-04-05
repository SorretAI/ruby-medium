"""
Trending News Monitoring Service
Detects trending topics from multiple sources and queues them for processing.
"""

import asyncio
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from enum import Enum

import aiohttp
import feedparser
from loguru import logger
from dotenv import load_dotenv
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select, text
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Load environment
load_dotenv()

# Database connection
from models import ProcessedTopic, get_async_session, TopicStatus

# Redis queue
REDIS_URL = "redis://redis:6379"
redis_client = Redis.from_url(REDIS_URL)

# Economic impact keywords
ECONOMIC_KEYWORDS = [
    'federal reserve', 'interest rate', 'dollar', 'usd', 'inflation',
    'crypto', 'blockchain', 'ai regulation', 'semiconductor', 'supply chain',
    'layoffs', 'acquisition', 'ipo', 'revenue', 'earnings', 'fed',
    'quantitative tightening', 'recession', 'bond yield', 'treasury'
]

# Shock value phrases
SHOCK_PHRASES = [
    'breaking', 'unprecedented', 'historic', 'shocking', 'massive',
    'collapse', 'surge', 'crash', 'boom', 'crisis', 'breakthrough'
]


@dataclass
class TrendingTopic:
    """Represents a detected trending topic."""
    headline: str
    source_urls: List[str]
    detected_by: str
    raw_data: Dict[str, Any]
    detected_at: datetime = None
    economic_impact_score: float = 0.0
    shock_value_score: float = 0.0
    velocity_score: float = 0.0
    combined_score: float = 0.0
    categories: List[str] = None

    def __post_init__(self):
        if self.detected_at is None:
            self.detected_at = datetime.utcnow()
        if self.categories is None:
            self.categories = []
        self.detected_at = self.detected_at or datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        d = asdict(self)
        d['detected_at'] = self.detected_at.isoformat() if self.detected_at else None
        return d

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TrendingTopic':
        """Create from dictionary."""
        if 'detected_at' in data and isinstance(data['detected_at'], str):
            data['detected_at'] = datetime.fromisoformat(data['detected_at'])
        return cls(**data)


class SentimentAnalyzer:
    """Analyzes sentiment and shock value of text."""

    def __init__(self):
        self.analyzer = SentimentIntensityAnalyzer()

    def calculate_economic_impact(self, text: str) -> float:
        """Calculate economic impact score (0-3)."""
        text_lower = text.lower()
        score = 0.0

        # Check for economic keywords
        for keyword in ECONOMIC_KEYWORDS:
            if keyword in text_lower:
                score += 1.0

        # Normalize to 0-3 scale
        return min(3.0, score * 0.5)

    def calculate_shock_value(self, text: str) -> float:
        """Calculate shock value based on sentiment polarity (0-2)."""
        scores = self.analyzer.polarity_scores(text)
        compound = scores['compound']

        # High absolute sentiment = high shock value
        shock = abs(compound)

        # Check for shock phrases
        text_lower = text.lower()
        for phrase in SHOCK_PHRASES:
            if phrase in text_lower:
                shock += 0.3

        return min(2.0, shock)

    def calculate_velocity(self, current_mentions: int, baseline: int) -> float:
        """Calculate velocity score based on mention spike (0-4)."""
        if baseline == 0:
            return 0.0

        ratio = current_mentions / baseline
        if ratio > 3:
            return min(4.0, ratio)
        return 0.0


class BaseMonitor:
    """Base class for all monitors."""

    def __init__(self):
        self.sentiment = SentimentAnalyzer()
        self.session: Optional[AsyncSession] = None

    async def start(self):
        """Initialize the monitor."""
        self.session = await get_async_session()

    async def detect(self) -> Optional[TrendingTopic]:
        """Detect trending topics. Override in subclass."""
        raise NotImplementedError

    async def is_duplicate(self, topic: TrendingTopic) -> bool:
        """Check if topic already processed."""
        if not self.session:
            return False

        # Check by headline similarity (hash)
        headline_hash = hashlib.md5(topic.headline.lower().encode()).hexdigest()

        stmt = select(ProcessedTopic).where(
            ProcessedTopic.headline_hash == headline_hash
        ).where(
            ProcessedTopic.detected_at > datetime.utcnow() - timedelta(hours=24)
        )

        result = await self.session.execute(stmt)
        return result.scalars().first() is not None

    async def save_topic(self, topic: TrendingTopic) -> None:
        """Save topic to database."""
        if not self.session:
            return

        headline_hash = hashlib.md5(topic.headline.lower().encode()).hexdigest()

        db_topic = ProcessedTopic(
            headline=topic.headline,
            source_urls=topic.source_urls,
            detected_by=topic.detected_by,
            economic_impact_score=topic.economic_impact_score,
            shock_value_score=topic.shock_value_score,
            velocity_score=topic.velocity_score,
            combined_score=topic.combined_score,
            categories=topic.categories,
            headline_hash=headline_hash
        )

        self.session.add(db_topic)
        await self.session.commit()

    async def queue_topic(self, topic: TrendingTopic) -> None:
        """Queue topic for processing."""
        await redis_client.rpush(
            'topics_to_process',
            json.dumps(topic.to_dict())
        )
        logger.info(f"Queued topic: {topic.headline[:50]}...")


class GoogleTrendsMonitor(BaseMonitor):
    """Monitor Google Trends for rising searches."""

    def __init__(self):
        super().__init__()
        from pytrends.request import TrendReq
        self.trends = TrendReq()

    async def detect(self) -> Optional[TrendingTopic]:
        """Check Google Trends for rising tech/finance topics."""
        try:
            # Get trending searches (this is synchronous, wrapped in async)
            self.trends.build(pinterest=False)
            trending = self.trends.trending_searches(pgeo='united_states')

            for _, row in trending.iterrows():
                topic_name = row.get('Topic Title', '') or row.get('entity', '')
                traffic = row.get('Traffic', '')

                if topic_name:
                    headline = f"Google Trends: {topic_name} trending"

                    topic = TrendingTopic(
                        headline=headline,
                        source_urls=['https://trends.google.com'],
                        detected_by='google_trends',
                        raw_data={'topic': topic_name, 'traffic': traffic}
                    )

                    if not await self.is_duplicate(topic):
                        topic.economic_impact_score = self.sentiment.calculate_economic_impact(topic_name)
                        topic.shock_value_score = self.sentiment.calculate_shock_value(topic_name)
                        topic.combined_score = topic.economic_impact_score + topic.shock_value_score

                        if topic.combined_score >= 3.0:  # Threshold
                            await self.save_topic(topic)
                            await self.queue_topic(topic)
                            return topic

        except Exception as e:
            logger.error(f"Google Trends error: {e}")

        return None


class RSSMonitor(BaseMonitor):
    """Monitor RSS feeds for breaking news."""

    RSS_FEEDS = [
        'https://apnews.com/rss/news',
        'https://feeds.reuters.com/reuters/topNews',
        'https://www.bloomberg.com/feed/podcast/law.yml',
        'https://techcrunch.com/feed/',
        'https://www.cnbc.com/id/19854910/device/rss/rss.html',
    ]

    async def detect(self) -> Optional[TrendingTopic]:
        """Check RSS feeds for trending topics."""
        try:
            for feed_url in self.RSS_FEEDS:
                feed = await self._parse_feed(feed_url)
                if feed and feed.entries:
                    for entry in feed.entries[:3]:  # Top 3 entries
                        headline = entry.get('title', '')
                        if headline:
                            topic = TrendingTopic(
                                headline=headline,
                                source_urls=[entry.get('link', '')],
                                detected_by='rss',
                                raw_data={'feed': feed_url, 'entry': str(entry)},
                                categories=self._categorize(headline)
                            )

                            if not await self.is_duplicate(topic):
                                topic.economic_impact_score = self.sentiment.calculate_economic_impact(headline)
                                topic.shock_value_score = self.sentiment.calculate_shock_value(headline)
                                topic.combined_score = topic.economic_impact_score + topic.shock_value_score

                                if topic.combined_score >= 3.0:
                                    await self.save_topic(topic)
                                    await self.queue_topic(topic)
                                    return topic
        except Exception as e:
            logger.error(f"RSS monitoring error: {e}")

        return None

    async def _parse_feed(self, url: str) -> Optional[Any]:
        """Parse RSS feed asynchronously."""
        # In real implementation, use aiohttp
        return feedparser.parse(url)

    def _categorize(self, headline: str) -> List[str]:
        """Categorize headline."""
        categories = []
        h = headline.lower()

        if any(kw in h for kw in ['tech', 'ai', 'software', 'startup', 'app']):
            categories.append('tech')
        if any(kw in h for kw in ['finance', 'stock', 'market', 'invest', 'crypto']):
            categories.append('finance')
        if any(kw in h for kw in ['ai', 'machine learning', 'algorithm']):
            categories.append('ai')

        return categories


class NewsAPIMonitor(BaseMonitor):
    """Monitor NewsAPI for breaking news."""

    def __init__(self):
        super().__init__()
        self.api_key = os.getenv('NEWSAPI_KEY')

    async def detect(self) -> Optional[TrendingTopic]:
        """Check NewsAPI for top headlines."""
        if not self.api_key:
            return None

        try:
            async with aiohttp.ClientSession() as session:
                url = "https://newsapi.org/v2/top-headlines"
                params = {
                    'country': 'us',
                    'category': 'business,technology',
                    'apiKey': self.api_key
                }

                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        for article in data.get('articles', [])[:5]:
                            headline = article.get('title', '')
                            if headline:
                                topic = TrendingTopic(
                                    headline=headline,
                                    source_urls=[article.get('url', '')],
                                    detected_by='newsapi',
                                    raw_data=article
                                )

                                if not await self.is_duplicate(topic):
                                    topic.economic_impact_score = self.sentiment.calculate_economic_impact(headline)
                                    topic.shock_value_score = self.sentiment.calculate_shock_value(headline)
                                    topic.combined_score = topic.economic_impact_score + topic.shock_value_score

                                    if topic.combined_score >= 3.0:
                                        await self.save_topic(topic)
                                        await self.queue_topic(topic)
                                        return topic
        except Exception as e:
            logger.error(f"NewsAPI error: {e}")

        return None


async def monitoring_loop():
    """Main monitoring loop - runs every 5 minutes."""
    logger.info("Starting monitoring service...")

    # Initialize monitors
    monitors = [
        GoogleTrendsMonitor(),
        RSSMonitor(),
        NewsAPIMonitor(),
    ]

    for monitor in monitors:
        await monitor.start()

    # Run detection every 5 minutes
    while True:
        logger.info(f"Running detection cycle at {datetime.utcnow()}")

        for monitor in monitors:
            try:
                topic = await monitor.detect()
                if topic:
                    logger.info(f"Detected topic: {topic.headline[:50]}... (score: {topic.combined_score})")
            except Exception as e:
                logger.error(f"Monitor {monitor.__class__.__name__} error: {e}")

        # Wait 5 minutes
        await asyncio.sleep(300)


if __name__ == "__main__":
    asyncio.run(monitoring_loop())
