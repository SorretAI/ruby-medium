"""
SQLAlchemy ORM Models for Trending News Database
"""

from datetime import datetime
from typing import List, Optional, Any
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, String, Text, DateTime, Float, Integer,
    Boolean, ForeignKey, ARRAY, Index, Text as SqlText
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY as PG_ARRAY
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.sql import func

import uuid

Base = declarative_base()


class TopicStatus(str, PyEnum):
    DETECTED = 'detected'
    PROCESSING = 'processing'
    DRAFTED = 'drafted'
    PUBLISHED = 'published'
    SKIPPED = 'skipped'
    RESURFACED = 'resurfaced'


class ProcessedTopic(Base):
    """Represents a detected trending topic."""
    __tablename__ = 'processed_topics'

    topic_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    headline = Column(Text, nullable=False)
    headline_hash = Column(String(32), index=True)  # For duplicate detection
    source_urls = Column(PG_ARRAY(Text))
    detected_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    detected_by = Column(Text, nullable=False)  # google_trends, twitter, reddit, etc.

    # Filtering scores
    economic_impact_score = Column(Float, default=0.0)
    shock_value_score = Column(Float, default=0.0)
    velocity_score = Column(Float, default=0.0)
    combined_score = Column(Float, default=0.0, index=True)

    # Status
    status = Column(String(50), default='detected', index=True)

    # Category/tags
    categories = Column(PG_ARRAY(Text))

    # Vector embedding for similarity (pgvector)
    # embedding = Column(Vector(1536))  # Defined separately after extension

    # Foreign keys
    article_id = Column(UUID(as_uuid=True), ForeignKey('content_history.article_id'))

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    articles = relationship("ContentHistory", back_populates="topic")

    __table_args__ = (
        Index('idx_topics_combined_score', combined_score.desc()),
    )


class ContentHistory(Base):
    """Represents a generated article."""
    __tablename__ = 'content_history'

    article_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id = Column(UUID(as_uuid=True), ForeignKey('processed_topics.topic_id'))

    # Content versions
    draft_versions = Column(JSONB)  # Array of drafts
    published_version = Column(Text, nullable=False)

    # Voice/Style used
    voice_profile = Column(Text, nullable=False, index=True)
    voice_config = Column(JSONB)

    # CTA used
    cta_text = Column(Text, nullable=False)
    cta_style = Column(String(50))

    # Citations
    sources_section = Column(Text)

    # Publishing info
    medium_post_id = Column(Text)
    medium_url = Column(Text)
    medium_account = Column(String(50))  # account_a or account_b
    published_at = Column(DateTime(timezone=True), index=True)

    # Metadata
    word_count = Column(Integer)
    reading_time_minutes = Column(Integer)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    topic = relationship("ProcessedTopic", back_populates="articles")
    metrics = relationship("PerformanceMetrics", back_populates="article", uselist=False)


class PerformanceMetrics(Base):
    """Performance metrics for published articles."""
    __tablename__ = 'performance_metrics'

    metric_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id = Column(UUID(as_uuid=True), ForeignKey('content_history.article_id'), index=True)

    # Medium metrics
    reads = Column(Integer, default=0)
    claps = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    followers_gained = Column(Integer, default=0)

    # Conversion metrics
    vsl_clicks = Column(Integer, default=0)
    consultation_leads = Column(Integer, default=0)

    # Ratios
    clap_ratio = Column(Float, default=0.0)
    conversion_rate = Column(Float, default=0.0)

    # Tracking
    captured_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    is_final = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    article = relationship("ContentHistory", back_populates="metrics")


class StyleMemory(Base):
    """RAG storage for style patterns and learnings."""
    __tablename__ = 'style_memories'

    memory_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(Text, nullable=False, index=True)  # winning_headlines, viral_angles, etc.

    content = Column(Text, nullable=False)
    performance_score = Column(Float, default=0.0, index=True)

    # Metadata
    source_article_id = Column(UUID(as_uuid=True), ForeignKey('content_history.article_id'))
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True))

    # embedding = column for vector (pgvector)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Index for performance
    __table_args__ = (
        Index('idx_style_performance', performance_score.desc()),
    )


class MediumAccount(Base):
    """Medium publishing accounts for split testing."""
    __tablename__ = 'medium_accounts'

    account_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_name = Column(String(50), nullable=False)  # account_a, account_b
    persona_name = Column(Text, nullable=False)  # QuantumAnchor, TechProphet
    persona_config = Column(JSONB)

    medium_api_key = Column(Text, nullable=False)
    medium_user_id = Column(Text, nullable=False)

    articles_published = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class CFOLedger(Base):
    """Cost tracking ledger."""
    __tablename__ = 'cfo_ledger'

    ledger_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    cost_type = Column(String(50), nullable=False)  # model_api, gpu, scraping, etc.
    amount_usd = Column(Float, nullable=False)

    tokens_used = Column(Integer, default=0)
    minutes_human = Column(Float, default=0.0)

    article_id = Column(UUID(as_uuid=True), ForeignKey('content_history.article_id'))
    topic_id = Column(UUID(as_uuid=True), ForeignKey('processed_topics.topic_id'))

    provider = Column(String(100))  # openrouter, nvidia, ollama
    model_name = Column(String(100))

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


# Database session factory
engine = None
async_session_maker = None


async def init_db(database_url: str):
    """Initialize database connection and create tables."""
    global engine, async_session_maker

    engine = create_async_engine(database_url, echo=False)
    async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    return async_session_maker


async def get_async_session() -> AsyncSession:
    """Get async database session."""
    if async_session_maker is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return async_session_maker()


async def close_db():
    """Close database connection."""
    if engine:
        await engine.dispose()
