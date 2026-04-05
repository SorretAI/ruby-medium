-- Trending News → Medium Pipeline Database Schema
-- PostgreSQL 16+ with pgvector extension

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Events (audit trail, inherited from genesis-alpha)
CREATE TABLE events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT CHECK (event_type IN (
        'TOPIC_DETECTED',
        'TOPIC_SKIPPED',
        'ARTICLE_GENERATED',
        'DRAFT_CREATED',
        'HUMAN_APPROVED',
        'HUMAN_REJECTED',
        'PUBLISHED',
        'METRIC_CAPTURED',
        'ERROR'
    )),
    agent TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for event queries
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created ON events(created_at DESC);
CREATE INDEX idx_events_agent ON events(agent);

-- ============================================================================
-- TOPICS (Detected trending topics)
-- ============================================================================

CREATE TABLE processed_topics (
    topic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    headline TEXT NOT NULL,
    source_urls TEXT[],  -- Array of source article URLs
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    detected_by TEXT NOT NULL,  -- Which source detected it (google_trends, twitter, reddit, etc.)

    -- Filtering scores
    economic_impact_score FLOAT DEFAULT 0,
    shock_value_score FLOAT DEFAULT 0,
    velocity_score FLOAT DEFAULT 0,
    combined_score FLOAT DEFAULT 0,

    -- Status tracking
    status TEXT CHECK (status IN (
        'detected',
        'processing',
        'drafted',
        'published',
        'skipped',
        'resurfaced'  -- For re-engagement when topic becomes relevant again
    )) DEFAULT 'detected',

    -- Category/tags
    categories TEXT[],  -- ['tech', 'finance', 'crypto', 'ai', etc.]

    -- Vector embedding for similarity + resurfacing
    embedding vector(1536),

    -- Foreign key to resulting article
    article_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for topics
CREATE INDEX idx_topics_status ON processed_topics(status);
CREATE INDEX idx_topics_detected ON processed_topics(detected_at DESC);
CREATE INDEX idx_topics_combined_score ON processed_topics(combined_score DESC);
CREATE INDEX idx_topics_embedding ON processed_topics USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- CONTENT HISTORY (Articles generated and published)
-- ============================================================================

CREATE TABLE content_history (
    article_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES processed_topics(topic_id),

    -- Content versions
    draft_versions JSONB[],  -- Array of draft versions for evolution tracking
    published_version TEXT NOT NULL,

    -- Voice/Style used
    voice_profile TEXT NOT NULL,  -- 'QuantumAnchor', 'TechProphet', 'FinanceRebel'
    voice_config JSONB,  -- Full config snapshot

    -- CTA used
    cta_text TEXT NOT NULL,
    cta_style TEXT,  -- 'urgent', 'inviting', 'exclusive'

    -- Citations
    sources_section TEXT,  -- Formatted sources/footnotes

    -- Publishing info
    medium_post_id TEXT,  -- Medium's post ID
    medium_url TEXT,
    medium_account TEXT,  -- 'account_a' or 'account_b' for split testing
    published_at TIMESTAMPTZ,

    -- Metadata
    word_count INTEGER,
    reading_time_minutes INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for content
CREATE INDEX idx_content_topic ON content_history(topic_id);
CREATE INDEX idx_content_published ON content_history(published_at DESC);
CREATE INDEX idx_content_voice ON content_history(voice_profile);

-- ============================================================================
-- PERFORMANCE METRICS (Drives learning and style evolution)
-- ============================================================================

CREATE TABLE performance_metrics (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES content_history(article_id),

    -- Medium metrics
    reads INTEGER DEFAULT 0,
    claps INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    followers_gained INTEGER DEFAULT 0,

    -- Conversion metrics
    vsl_clicks INTEGER DEFAULT 0,
    consultation_leads INTEGER DEFAULT 0,

    -- Ratios (calculated)
    clap_ratio FLOAT DEFAULT 0,  -- claps / reads
    conversion_rate FLOAT DEFAULT 0,  -- leads / reads

    -- Capture timestamps (for time-series analysis)
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    is_final BOOLEAN DEFAULT FALSE,  -- True if this is the "final" snapshot

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for metrics
CREATE INDEX idx_metrics_article ON performance_metrics(article_id);
CREATE INDEX idx_metrics_captured ON performance_metrics(captured_at DESC);

-- ============================================================================
-- STYLE MEMORIES (RAG storage for learning)
-- ============================================================================

CREATE TABLE style_memories (
    memory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,  -- 'winning_headlines', 'viral_angles', 'cta_variants', 'voice_patterns'

    content TEXT NOT NULL,  -- The actual pattern/text
    performance_score FLOAT DEFAULT 0,  -- Normalized score 0-1

    -- Metadata about the pattern
    source_article_id UUID REFERENCES content_history(article_id),
    usage_count INTEGER DEFAULT 0,  -- How many times this pattern was used
    last_used_at TIMESTAMPTZ,

    -- Vector embedding for retrieval
    embedding vector(1536),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for RAG
CREATE INDEX idx_style_category ON style_memories(category);
CREATE INDEX idx_style_performance ON style_memories(performance_score DESC);
CREATE INDEX idx_style_embedding ON style_memories USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- MEDIUM ACCOUNTS (Split testing)
-- ============================================================================

CREATE TABLE medium_accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name TEXT NOT NULL,  -- 'account_a', 'account_b'

    -- Persona config
    persona_name TEXT NOT NULL,  -- 'QuantumAnchor', 'TechProphet'
    persona_config JSONB,  -- Voice settings

    -- API credentials (encrypted at app level)
    medium_api_key TEXT NOT NULL,
    medium_user_id TEXT NOT NULL,

    -- Usage tracking
    articles_published INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CFO LEDGER (Cost tracking, from genesis-alpha)
-- ============================================================================

CREATE TABLE cfo_ledger (
    ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cost type
    cost_type TEXT CHECK (cost_type IN (
        'model_api',
        'gpu',
        'scraping',
        'hosting',
        'human_time'
    )) NOT NULL,

    -- Amounts
    amount_usd FLOAT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    minutes_human DECIMAL(10,2) DEFAULT 0,

    -- Link to content
    article_id UUID REFERENCES content_history(article_id),
    topic_id UUID REFERENCES processed_topics(topic_id),

    -- Metadata
    provider TEXT,  -- 'openrouter', 'nvidia', 'ollama'
    model_name TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cost tracking
CREATE INDEX idx_cfo_article ON cfo_ledger(article_id);
CREATE INDEX idx_cfo_type ON cfo_ledger(cost_type);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON processed_topics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_updated_at
    BEFORE UPDATE ON content_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Calculate conversion rate helper view
CREATE OR REPLACE VIEW article_performance AS
SELECT
    c.article_id,
    c.topic_id,
    c.published_at,
    c.voice_profile,
    c.cta_text,
    c.medium_url,
    COALESCE(p.reads, 0) as reads,
    COALESCE(p.claps, 0) as claps,
    COALESCE(p.followers_gained, 0) as followers_gained,
    COALESCE(p.vsl_clicks, 0) as vsl_clicks,
    COALESCE(p.consultation_leads, 0) as consultation_leads,
    CASE
        WHEN COALESCE(p.reads, 0) > 0 THEN COALESCE(p.claps, 0)::FLOAT / p.reads
        ELSE 0
    END as clap_ratio,
    CASE
        WHEN COALESCE(p.reads, 0) > 0 THEN COALESCE(p.consultation_leads, 0)::FLOAT / p.reads
        ELSE 0
    END as conversion_rate
FROM content_history c
LEFT JOIN (
    SELECT DISTINCT ON (article_id) *
    FROM performance_metrics
    ORDER BY article_id, captured_at DESC
) p ON c.article_id = p.article_id;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default medium accounts (placeholder - update with real credentials)
INSERT INTO medium_accounts (account_name, persona_name, medium_api_key, medium_user_id, is_active)
VALUES
    ('account_a', 'QuantumAnchor', '', '', TRUE),
    ('account_b', 'TechProphet', '', '', FALSE);  -- Start with one active

-- Insert initial style memories (seed patterns based on your examples)
INSERT INTO style_memories (category, content, performance_score, usage_count)
VALUES
    ('winning_headlines', 'Your dollar just died at {time} today.', 0.8, 0),
    ('winning_headlines', 'The {number} billion people who think they''re safe just became obsolete.', 0.8, 0),
    ('fomo_phrases', 'Most will miss this.', 0.7, 0),
    ('fomo_phrases', 'The few who know...', 0.7, 0),
    ('nepq_questions', 'What if you could know before the market reacts?'),
    ('cta_closers', 'The timing window closes in {hours} hours.');
