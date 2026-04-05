"""
Twitter/X Scraper using Playwright
Scrapes trending topics with rate limiting and multiple account rotation.
"""

import asyncio
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

from playwright.async_api import async_playwright, Browser, Page, BrowserContext
from loguru import logger

# Trending hashtags and topics to track
TRENDING_SEARCH_QUERIES = [
    "dollar interest rate",
    "Federal Reserve",
    "crypto regulation",
    "AI stocks",
    "semiconductor shortage",
    "inflation news",
    "tech layoffs",
    "blockchain adoption",
    "quantum computing",
    "recession warning",
]

X_TRENDS_URL = "https://twitter.com/i/trends"
X_SEARCH_URL = "https://twitter.com/search?q={query}&f=live"


@dataclass
class Tweet:
    """Represents a scraped tweet."""
    id: str
    text: str
    author: str
    timestamp: datetime
    retweets: int
    likes: int
    replies: int
    url: str


@dataclass
class TrendingTopic:
    """Represents a trending topic from Twitter."""
    name: str
    tweet_count: int
    tweets: List[Tweet]
    category: str
    velocity: float  # tweets per hour
    detected_at: datetime = None

    def __post_init__(self):
        if self.detected_at is None:
            self.detected_at = datetime.utcnow()


class TwitterScraper:
    """
    Playwright-based Twitter/X scraper.
    Handles rate limiting, multiple accounts, and anti-detection.
    """

    def __init__(
        self,
        accounts: Optional[List[Dict[str, str]]] = None,
        headless: bool = True,
    ):
        self.accounts = accounts or []
        self.current_account_index = 0
        self.headless = headless
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self._playwright = None

    async def start(self):
        """Initialize Playwright and browser."""
        logger.info("Starting Twitter scraper...")
        self._playwright = await async_playwright().start()

        browser_args = {
            "headless": self.headless,
            "args": [
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        }

        self.browser = await self._playwright.chromium.launch(**browser_args)

        # Create context with anti-detection
        self.context = await self.browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="en-US",
            timezone_id="America/New_York",
        )

        # Add stealth headers
        await self.context.add_init_script(
            """
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            """
        )

        self.page = await self.context.new_page()
        logger.info("Twitter scraper initialized")

    async def close(self):
        """Close browser and cleanup."""
        if self.page:
            await self.page.close()
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self._playwright:
            await self._playwright.stop()
        logger.info("Twitter scraper closed")

    async def login(self, username: str, password: str) -> bool:
        """Login to Twitter/X."""
        if not self.page:
            await self.start()

        try:
            await self.page.goto("https://twitter.com/login")
            await self.page.wait_for_load_state("networkidle")

            # Find and fill username
            await self.page.fill('input[autocomplete="username"]', username)
            await self.press_enter()

            # Wait for password field
            await self.page.wait_for_selector('input[type="password"]', timeout=5000)
            await self.page.fill('input[type="password"]', password)
            await self.press_enter()

            # Wait for navigation
            await self.page.wait_for_url("https://twitter.com/home", timeout=10000)

            logger.info(f"Logged in as {username}")
            return True

        except Exception as e:
            logger.error(f"Login failed: {e}")
            return False

    async def press_enter(self):
        """Press Enter key."""
        await self.page.keyboard.press("Enter")
        await asyncio.sleep(0.5)

    async def get_trending_topics(self) -> List[TrendingTopic]:
        """
        Get trending topics from Twitter/X.
        Uses the trends sidebar if available.
        """
        if not self.page:
            return []

        try:
            # Go to explore page
            await self.page.goto(X_TRENDS_URL, wait_until="networkidle")
            await asyncio.sleep(3)  # Wait for dynamic content

            # Wait for trends container
            await self.page.wait_for_selector('[data-testid="trend"], [role="list"]', timeout=10000)

            topics = []

            # Extract trending topics using multiple selectors
            trend_selectors = [
                '[data-testid="trend"]',
                '[class*="trend-item"]',
                'a[href^="/explore"]',
            ]

            for selector in trend_selectors:
                elements = await self.page.query_selector_all(selector)
                if elements:
                    for element in elements:
                        try:
                            topic_name = await element.inner_text()
                            if topic_name and len(topic_name.strip()) > 0:
                                # Clean and normalize the topic name
                                clean_name = self._clean_topic_name(topic_name)
                                if clean_name:
                                    topics.append(clean_name)
                        except Exception:
                            continue
                    if topics:
                        break

            logger.info(f"Found {len(topics)} trending topics")
            return topics[:10]  # Return top 10

        except Exception as e:
            logger.error(f"Error getting trending topics: {e}")
            return []

    def _clean_topic_name(self, text: str) -> Optional[str]:
        """Clean and validate topic name."""
        if not text:
            return None

        # Remove hashtags, mentions, and extra whitespace
        cleaned = text.strip()

        # Skip if too short or looks like noise
        if len(cleaned) < 3 or len(cleaned) > 140:
            return None

        return cleaned

    async def search_topics(
        self,
        queries: Optional[List[str]] = None,
        max_results: int = 10,
    ) -> List[TrendingTopic]:
        """
        Search for specific topics and return trending discussions.

        Args:
            queries: List of search queries
            max_results: Maximum number of results to return
        """
        search_queries = queries or TRENDING_SEARCH_QUERIES
        results = []

        for query in search_queries:
            try:
                topic = await self._search_single_topic(query, max_results // len(search_queries))
                if topic:
                    results.append(topic)
            except Exception as e:
                logger.error(f"Error searching '{query}': {e}")

            # Rate limiting: wait between searches
            await asyncio.sleep(5)

        return sorted(results, key=lambda x: x.velocity, reverse=True)[:max_results]

    async def _search_single_topic(
        self,
        query: str,
        max_results: int = 5,
    ) -> Optional[TrendingTopic]:
        """Search for a single topic."""
        if not self.page:
            return None

        url = X_SEARCH_URL.format(query=query.replace(" ", "%20"))
        await self.page.goto(url, wait_until="networkidle")
        await asyncio.sleep(3)

        tweets = []
        try:
            # Wait for tweets to load
            await self.page.wait_for_selector('[data-testid="tweet"]', timeout=10000)
        except Exception:
            logger.warning(f"No tweets found for '{query}'")
            return None

        # Extract tweets
        tweet_elements = await self.page.query_selector_all('[data-testid="tweet"]')

        for tweet_el in tweet_elements[:max_results]:
            try:
                tweet = await self._extract_tweet(tweet_el)
                if tweet:
                    tweets.append(tweet)
            except Exception:
                continue

        if tweets:
            # Calculate velocity (simple: tweets per hour estimate)
            velocity = len(tweets) * 6  # Rough estimate based on sample

            return TrendingTopic(
                name=query,
                tweet_count=len(tweets),
                tweets=tweets,
                category=self._categorize_query(query),
                velocity=velocity,
            )

        return None

    async def _extract_tweet(self, element) -> Optional[Tweet]:
        """Extract tweet data from element."""
        try:
            # Extract tweet text
            text_el = await element.query_selector('[data-lang="true"]')
            text = await text_el.inner_text() if text_el else ""

            # Extract author
            author_el = await element.query_selector('[data-testid="User-Name"]')
            author = await author_el.inner_text() if author_el else "Unknown"

            # Extract stats
            stats = await element.query_selector_all('[data-testid="reply"]')
            stats_text = await element.inner_text()

            # Simple parsing - would need enhancement for production
            retweet_count = 0
            try:
                retweet_match = [s for s in stats_text.split() if 'K' in s or s.isdigit()]
                if retweet_match:
                    retweet_count = int(retweet_match[0].replace('K', '000'))
            except Exception:
                pass

            # Extract timestamp
            time_el = await element.query_selector('time')
            timestamp_str = await time_el.get_attribute("datetime") if time_el else None
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00')) if timestamp_str else datetime.utcnow()

            # Extract URL
            link_el = await element.query_selector('a[href*="/status/"]')
            url = await link_el.get_attribute("href") if link_el else ""

            # Generate ID
            tweet_id = url.split("/status/")[-1] if "/status/" in url else ""

            return Tweet(
                id=tweet_id or "",
                text=text or "",
                author=author or "",
                timestamp=timestamp,
                retweets=retweet_count,
                likes=0,
                replies=0,
                url=f"https://twitter.com{url}" if url else ""
            )

        except Exception as e:
            logger.error(f"Error extracting tweet: {e}")
            return None

    def _categorize_query(self, query: str) -> str:
        """Categorize search query."""
        query_lower = query.lower()

        if any(kw in query_lower for kw in ['crypto', 'bitcoin', 'blockchain', 'ethereum']):
            return 'Crypto'
        if any(kw in query_lower for kw in ['ai', 'artificial intelligence', 'machine learning']):
            return 'AI'
        if any(kw in query_lower for kw in ['fed', 'interest rate', 'dollar', 'inflation']):
            return 'Finance'
        if any(kw in query_lower for kw in ['tech', 'semiconductor', 'layoffs', 'startup']):
            return 'Tech'

        return 'General'

    async def rotate_account(self) -> bool:
        """Switch to next account for rate limit avoidance."""
        if not self.accounts or len(self.accounts) < 2:
            return False

        self.current_account_index = (self.current_account_index + 1) % len(self.accounts)
        account = self.accounts[self.current_account_index]

        # Logout
        if self.page:
            await self.page.goto("https://twitter.com/settings/logout")

        # Login with new account
        return await self.login(account["username"], account["password"])


async def main():
    """Test the Twitter scraper."""
    scraper = TwitterScraper(headless=False)

    try:
        await scraper.start()

        # Get trending topics
        topics = await scraper.get_trending_topics()
        logger.info(f"Trending topics: {topics}")

        # Search for specific topics
        results = await scraper.search_topics(["crypto regulation", "Federal Reserve"])
        for topic in results:
            logger.info(f"Topic: {topic.name}, Velocity: {topic.velocity}")

    finally:
        await scraper.close()


if __name__ == "__main__":
    asyncio.run(main())
