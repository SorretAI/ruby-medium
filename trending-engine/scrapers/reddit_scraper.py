"""
Reddit Scraper with PRAW API + Playwright fallback.
Monitors r/technology, r/worldnews, r/finance for trending topics.
"""

import asyncio
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

from playwright.async_api import async_playwright, Browser, Page
from loguru import logger

# Try to import PRAW, fallback to scraper if not available
try:
    import praw
    PRAW_AVAILABLE = True
except ImportError:
    PRAW_AVAILABLE = False
    logger.warning("PRAW not installed, using scraper fallback only")


@dataclass
class RedditPost:
    """Represents a Reddit post."""
    id: str
    title: str
    text: str
    author: str
    score: int
    upvote_ratio: float
    num_comments: int
    created_utc: datetime
    url: str
    subreddit: str
    permalink: str


@dataclass
class TrendingTopic:
    """Represents a trending topic from Reddit."""
    title: str
    posts: List[RedditPost]
    subreddit: str
    score: float  # Combined score based on upvotes, comments, velocity
    category: str
    detected_at: datetime = None

    def __post_init__(self):
        if self.detected_at is None:
            self.detected_at = datetime.utcnow()


# Subreddits to monitor
TARGET_SUBREDDITS = [
    "technology",
    "worldnews",
    "finance",
    "economy",
    "CryptoCurrency",
    "stocks",
    "investing",
    "Futurology",
    "artificial",
    "machinelearning",
]

# Economic impact keywords
ECONOMIC_KEYWORDS = [
    'federal reserve', 'interest rate', 'dollar', 'usd', 'inflation',
    'crypto', 'blockchain', 'ai regulation', 'semiconductor', 'supply chain',
    'layoffs', 'acquisition', 'ipo', 'revenue', 'earnings', 'fed',
    'quantitative tightening', 'recession', 'bond yield', 'treasury',
    'stock market', 'nasdaq', 'sp500', 'bitcoin', 'ethereum'
]


class RedditScraper:
    """
    Reddit scraper with PRAW API primary and Playwright fallback.
    """

    def __init__(
        self,
        reddit_client_id: Optional[str] = None,
        reddit_client_secret: Optional[str] = None,
        reddit_user_agent: str = "trending-app/0.1.0",
        headless: bool = True,
    ):
        self.reddit_client_id = reddit_client_id or os.getenv("REDDIT_CLIENT_ID")
        self.reddit_client_secret = reddit_client_secret or os.getenv("REDDIT_CLIENT_SECRET")
        self.reddit_user_agent = reddit_user_agent or os.getenv("REDDIT_USER_AGENT", "trending-app/0.1.0")
        self.headless = headless

        # PRAW Reddit instance
        self.reddit: Optional[praw.Reddit] = None
        self.use_praw = PRAW_AVAILABLE and bool(self.reddit_client_id and self.reddit_client_secret)

        # Playwright
        self._playwright = None
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None

    async def start(self):
        """Initialize the scraper."""
        logger.info("Starting Reddit scraper...")

        # Try PRAW first
        if self.use_praw:
            try:
                self.reddit = praw.Reddit(
                    client_id=self.reddit_client_id,
                    client_secret=self.reddit_client_secret,
                    user_agent=self.reddit_user_agent,
                    check_for_updates=False,
                )
                # Test connection
                self.reddit.user.me()
                logger.info("Connected to Reddit via PRAW API")
                return
            except Exception as e:
                logger.warning(f"PRAW connection failed: {e}, falling back to scraper")
                self.use_praw = False

        # Fallback to Playwright scraper
        self._playwright = await async_playwright().start()

        self.browser = await self._playwright.chromium.launch(
            headless=self.headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        )

        self.page = await self.browser.new_page(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )

        # Add stealth
        await self.page.add_init_script(
            """
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            """
        )

        logger.info("Reddit scraper initialized (Playwright mode)")

    async def close(self):
        """Close connections."""
        if self.page:
            await self.page.close()
        if self.browser:
            await self.browser.close()
        if self._playwright:
            await self._playwright.stop()
        logger.info("Reddit scraper closed")

    async def get_trending_topics(
        self,
        subreddits: Optional[List[str]] = None,
        limit: int = 25,
    ) -> List[TrendingTopic]:
        """
        Get trending topics from specified subreddits.

        Args:
            subreddits: List of subreddits to monitor
            limit: Max posts per subreddit
        """
        target_subs = subreddits or TARGET_SUBREDDITS
        all_topics = []

        if self.use_praw and self.reddit:
            all_topics = await self._get_trending_praw(target_subs, limit)
        else:
            all_topics = await self._get_trending_scraper(target_subs, limit)

        # Sort by score
        return sorted(all_topics, key=lambda x: x.score, reverse=True)

    async def _get_trending_praw(
        self,
        subreddits: List[str],
        limit: int,
    ) -> List[TrendingTopic]:
        """Get trending topics using PRAW API."""
        topics = []

        for sub_name in subreddits:
            try:
                subreddit = self.reddit.subreddit(sub_name)

                # Get hot posts
                posts = []
                for post in subreddit.hot(limit=limit):
                    if hasattr(post, 'title') and not post.stickied:
                        reddit_post = RedditPost(
                            id=post.id,
                            title=post.title,
                            text=(post.selftext or "")[:500],  # First 500 chars
                            author=str(post.author) if post.author else "Unknown",
                            score=post.score,
                            upvote_ratio=post.upvote_ratio or 0.5,
                            num_comments=post.num_comments or 0,
                            created_utc=datetime.fromtimestamp(post.created_utc),
                            url=post.url,
                            subreddit=sub_name,
                            permalink=f"https://reddit.com{post.permalink}",
                        )
                        posts.append(reddit_post)

                if posts:
                    # Calculate topic score
                    score = self._calculate_topic_score(posts, sub_name)

                    # Categorize
                    category = self._categorize_posts(posts)

                    topic = TrendingTopic(
                        title=f"r/{sub_name} trending",
                        posts=posts,
                        subreddit=sub_name,
                        score=score,
                        category=category,
                    )

                    # Only include if score passes threshold
                    if score >= 3.0:
                        topics.append(topic)
                        logger.info(f"Found trending topic in r/{sub_name}: score={score}")

            except Exception as e:
                logger.error(f"Error processing r/{sub_name}: {e}")
                continue

            # Rate limiting: PRAW has 60 requests/min limit
            await asyncio.sleep(1)

        return topics

    async def _get_trending_scraper(
        self,
        subreddits: List[str],
        limit: int,
    ) -> List[TrendingTopic]:
        """Get trending topics using Playwright scraper (fallback)."""
        if not self.page:
            return []

        topics = []

        for sub_name in subreddits:
            try:
                url = f"https://www.reddit.com/r/{sub_name}/hot.json?limit={limit}"
                await self.page.goto(url, wait_until="networkidle")

                # Wait for JSON to load
                await asyncio.sleep(2)

                # Get page content
                content = await self.page.content()

                # Parse JSON response
                import json
                try:
                    data = json.loads(content)
                    posts_data = data.get("data", {}).get("children", [])

                    posts = []
                    for item in posts_data:
                        post_data = item.get("data", {})
                        if post_data.get("stickied"):
                            continue

                        reddit_post = RedditPost(
                            id=post_data.get("id", ""),
                            title=post_data.get("title", ""),
                            text=post_data.get("selftext", "")[:500],
                            author=post_data.get("author", "Unknown"),
                            score=post_data.get("score", 0),
                            upvote_ratio=post_data.get("upvote_ratio", 0.5),
                            num_comments=post_data.get("num_comments", 0),
                            created_utc=datetime.fromtimestamp(post_data.get("created_utc", 0)),
                            url=post_data.get("url", ""),
                            subreddit=sub_name,
                            permalink=f"https://reddit.com{post_data.get('permalink', '')}",
                        )
                        posts.append(reddit_post)

                    if posts:
                        score = self._calculate_topic_score(posts, sub_name)
                        category = self._categorize_posts(posts)

                        topic = TrendingTopic(
                            title=f"r/{sub_name} trending",
                            posts=posts,
                            subreddit=sub_name,
                            score=score,
                            category=category,
                        )

                        if score >= 3.0:
                            topics.append(topic)

                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse JSON for r/{sub_name}: {e}")

            except Exception as e:
                logger.error(f"Error scraping r/{sub_name}: {e}")
                continue

            # Rate limiting for scraper
            await asyncio.sleep(3)

        return topics

    def _calculate_topic_score(self, posts: List[RedditPost], subreddit: str) -> float:
        """Calculate combined score for a topic."""
        if not posts:
            return 0.0

        # Base score from posts
        total_score = 0
        for post in posts[:10]:  # Top 10 posts
            # Upvote ratio weight
            ratio_score = post.upvote_ratio * 2

            # Comment engagement
            comment_score = min(3.0, post.num_comments / 100)

            # Recency bonus (posts within 6 hours)
            age_hours = (datetime.utcnow() - post.created_utc).total_seconds() / 3600
            recency_bonus = 2.0 if age_hours < 6 else 1.0

            total_score += (ratio_score + comment_score) * recency_bonus

        # Subreddit multiplier
        multipliers = {
            "worldnews": 1.2,
            "finance": 1.3,
            "technology": 1.1,
            "CryptoCurrency": 1.0,
        }
        total_score *= multipliers.get(subreddit, 1.0)

        return min(10.0, total_score)  # Cap at 10

    def _categorize_posts(self, posts: List[RedditPost]) -> str:
        """Categorize posts based on content."""
        for post in posts[:5]:  # Check first 5 posts
            title_lower = (post.title + " " + post.text).lower()

            if any(kw in title_lower for kw in ['crypto', 'bitcoin', 'ethereum', 'blockchain']):
                return 'Crypto'
            if any(kw in title_lower for kw in ['ai', 'machine learning', 'algorithm', 'gpt']):
                return 'AI'
            if any(kw in title_lower for kw in ['fed', 'interest rate', 'dollar', 'inflation', 'stock']):
                return 'Finance'
            if any(kw in title_lower for kw in ['tech', 'software', 'startup', 'silicon']):
                return 'Tech'

        return 'General'

    async def search_subreddit(
        self,
        query: str,
        subreddit: str = "all",
        limit: int = 10,
    ) -> List[RedditPost]:
        """Search within a subreddit."""
        if self.use_praw and self.reddit:
            # PRAW search
            posts = []
            try:
                sub = self.reddit.subreddit(subreddit)
                for post in sub.search(query, limit=limit):
                    reddit_post = RedditPost(
                        id=post.id,
                        title=post.title,
                        text=(post.selftext or "")[:500],
                        author=str(post.author) if post.author else "Unknown",
                        score=post.score,
                        upvote_ratio=post.upvote_ratio or 0.5,
                        num_comments=post.num_comments or 0,
                        created_utc=datetime.fromtimestamp(post.created_utc),
                        url=post.url,
                        subreddit=subreddit,
                        permalink=f"https://reddit.com{post.permalink}",
                    )
                    posts.append(reddit_post)
            except Exception as e:
                logger.error(f"Search failed: {e}")
            return posts

        # Scraper search (fallback)
        if not self.page:
            return []

        posts = []
        url = f"https://www.reddit.com/search?q={query}&type=post"
        await self.page.goto(url, wait_until="networkidle")
        await asyncio.sleep(3)

        # Extract search results
        # (Implementation would go here)

        return posts


def has_economic_impact(text: str) -> bool:
    """Check if text has economic impact keywords."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in ECONOMIC_KEYWORDS)


async def main():
    """Test the Reddit scraper."""
    scraper = RedditScraper(headless=False)

    try:
        await scraper.start()

        topics = await scraper.get_trending_topics(
            subreddits=["technology", "finance", "worldnews"],
            limit=10,
        )

        for topic in topics:
            logger.info(f"Topic: {topic.title}, Score: {topic.score}, Category: {topic.category}")

    finally:
        await scraper.close()


if __name__ == "__main__":
    asyncio.run(main())
