/**
 * Medium API Integration
 * Handles publishing, split testing, and performance tracking
 */

import { Pool } from 'pg';

// ============================================================================
// TYPES
// ============================================================================

export interface MediumArticle {
  id?: string;
  title: string;
  content: string; // HTML or Markdown
  tags: string[];
  publishStatus: 'draft' | 'unlisted' | 'public';
  license: LicenseType;
}

export type LicenseType =
  | 'all-rights-reserved'
  | 'cc-40'
  | 'cc-20'
  | 'cc-0'
  | 'public-domain';

export interface MediumPublishResult {
  id: string;
  url: string;
  authorId: string;
  publishedAt: string;
}

export interface MediumMetrics {
  reads: number;
  claps: number;
  comments: number;
  followers: number;
  readingTime: number;
}

export interface SplitTestConfig {
  enabled: boolean;
  accountA: string; // account_a
  accountB: string; // account_b
  metric: 'reads' | 'claps' | 'conversion';
  duration: number; // hours
}

// ============================================================================
// MEDIUM API CLIENT
// ============================================================================

const MEDIUM_API_URL = 'https://api.medium.com/v1';

export class MediumPublisherAgent {
  private apiKeys: Map<string, string>; // account name -> API key
  private userIds: Map<string, string>; // account name -> user ID
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.apiKeys = new Map();
    this.userIds = new Map();
  }

  /**
   * Register a Medium account for publishing
   */
  registerAccount(accountName: string, apiKey: string, userId: string): void {
    this.apiKeys.set(accountName, apiKey);
    this.userIds.set(accountName, userId);
  }

  /**
   * Publish article to specified account
   */
  async publish(
    article: MediumArticle,
    accountName: string = 'account_a'
  ): Promise<MediumPublishResult> {
    const apiKey = this.apiKeys.get(accountName);
    const userId = this.userIds.get(accountName);

    if (!apiKey || !userId) {
      throw new Error(`Account ${accountName} not registered`);
    }

    // Create publication
    const response = await fetch(`${MEDIUM_API_URL}/users/${userId}/publications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-charset': 'utf-8',
      },
      body: JSON.stringify({
        title: article.title,
        contentFormat: 'markdown',
        content: article.content,
        tags: article.tags,
        publishStatus: article.publishStatus,
        license: article.license,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Medium API error: ${error}`);
    }

    const result = await response.json();

    // Store in database
    await this.recordPublication(article, accountName, result.data);

    return {
      id: result.data.id,
      url: result.data.url,
      authorId: result.data.authorId,
      publishedAt: result.data.createdAt,
    };
  }

  /**
   * Publish to both accounts for split testing
   */
  async publishSplitTest(
    article: MediumArticle,
    config: SplitTestConfig
  ): Promise<{ accountA: MediumPublishResult; accountB: MediumPublishResult }> {
    // Modify title/content slightly for B variant
    const articleB: MediumArticle = {
      ...article,
      title: this.createVariant(article.title),
    };

    // Publish to both accounts
    const [resultA, resultB] = await Promise.all([
      this.publish(article, config.accountA),
      this.publish(articleB, config.accountB),
    ]);

    // Record split test
    await this.recordSplitTest(config, resultA, resultB);

    return {
      accountA: resultA,
      accountB: resultB,
    };
  }

  /**
   * Get metrics for published article
   */
  async getMetrics(articleId: string): Promise<MediumMetrics> {
    // Note: Medium API v1.1 has limited metrics
    // This would typically be populated by polling or webhooks

    const { rows } = await this.pool.query(
      `SELECT reads, claps, comments, followers_gained as followers
       FROM performance_metrics
       WHERE article_id = $1
       ORDER BY captured_at DESC
       LIMIT 1`,
      [articleId]
    );

    if (rows.length === 0) {
      return {
        reads: 0,
        claps: 0,
        comments: 0,
        followers: 0,
        readingTime: 0,
      };
    }

    return {
      reads: rows[0].reads,
      claps: rows[0].claps,
      comments: rows[0].comments,
      followers: rows[0].followers,
      readingTime: 0,
    };
  }

  /**
   * Analyze split test results
   */
  async analyzeSplitTest(
    testId: string
  ): Promise<{ winner: 'A' | 'B' | 'tie'; confidence: number; stats: any }> {
    const { rows } = await this.pool.query(
      `SELECT * FROM split_tests WHERE test_id = $1`,
      [testId]
    );

    if (rows.length === 0) {
      return {
        winner: 'tie',
        confidence: 0,
        stats: {},
      };
    }

    const test = rows[0];

    // Calculate winner based on metric
    const metric = test.metric as 'reads' | 'claps' | 'conversion';
    const aMetric = test[`a_${metric}`];
    const bMetric = test[`b_${metric}`];

    const diff = Math.abs(aMetric - bMetric);
    const baseline = Math.max(aMetric, bMetric, 1);
    const percentDiff = diff / baseline;

    // Simple confidence calculation (for production, use proper statistical test)
    const confidence = Math.min(percentDiff * 100, 100);

    return {
      winner: aMetric > bMetric ? 'A' : bMetric > aMetric ? 'B' : 'tie',
      confidence,
      stats: {
        a_metric: aMetric,
        b_metric: bMetric,
        difference: diff,
      },
    };
  }

  private createVariant(title: string): string {
    // Create B variant of title
    const variants = [
      (t: string) => t.replace(/\bAI\b/g, 'Artificial Intelligence'),
      (t: string) => t.replace('died', 'collapsed'),
      (t: string) => t.replace('today', 'this morning'),
      (t: string) => `${t} [Analysis]`,
    ];

    const variant = variants[Math.floor(Math.random() * variants.length)];
    return variant(title);
  }

  private async recordPublication(
    article: MediumArticle,
    accountName: string,
    result: any
  ): Promise<void> {
    await this.pool.query(
      `UPDATE content_history
       SET medium_post_id = $1,
           medium_url = $2,
           medium_account = $3,
           published_at = $4
       WHERE title = $5`,
      [result.id, result.url, accountName, result.createdAt, article.title]
    );
  }

  private async recordSplitTest(
    config: SplitTestConfig,
    resultA: MediumPublishResult,
    resultB: MediumPublishResult
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO split_tests (test_id, account_a_id, account_b_id, metric, started_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())
       ON CONFLICT (test_id) DO UPDATE
       SET account_a_id = EXCLUDED.account_a_id,
           account_b_id = EXCLUDED.account_b_id`,
      [resultA.id, resultB.id, config.metric]
    );
  }
}

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

export class PerformanceTracker {
  private pool: Pool;
  private checkInterval: number; // minutes

  constructor(pool: Pool, checkIntervalMinutes: number = 60) {
    this.pool = pool;
    this.checkInterval = checkIntervalMinutes;
    this.startPolling();
  }

  /**
   * Start periodic metrics collection
   */
  private startPolling(): void {
    // In production, this would use proper scheduling
    setInterval(() => this.collectMetrics(), this.checkInterval * 60 * 1000);
  }

  /**
   * Collect metrics for all published articles
   */
  async collectMetrics(): Promise<void> {
    const { rows } = await this.pool.query(
      `SELECT article_id, medium_post_id FROM content_history
       WHERE medium_post_id IS NOT NULL
       ORDER BY published_at DESC`
    );

    for (const row of rows) {
      // Note: Actual Medium API integration would go here
      // For now, we'll use stored metrics
      await this.updateMetrics(row.article_id);
    }
  }

  private async updateMetrics(articleId: string): Promise<void> {
    // Placeholder for actual Medium API metrics collection
    // This would poll Medium's API for updated stats
    console.log(`Collecting metrics for ${articleId}`);
  }

  /**
   * Record user interaction (click, view, etc.)
   */
  async recordInteraction(
    articleId: string,
    type: 'read' | 'clap' | 'comment' | 'follow' | 'vsl_click' | 'lead'
  ): Promise<void> {
    const column = `${type}s`;

    // Increment counter
    await this.pool.query(
      `INSERT INTO performance_metrics (article_id, ${column})
       VALUES ($1, 1)
       ON CONFLICT (article_id)
       DO UPDATE SET ${column} = performance_metrics.${column} + 1`
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

let publisherInstance: MediumPublisherAgent | null = null;
let trackerInstance: PerformanceTracker | null = null;

export function getPublisher(pool: Pool): MediumPublisherAgent {
  if (!publisherInstance) {
    publisherInstance = new MediumPublisherAgent(pool);
  }
  return publisherInstance;
}

export function getTracker(pool: Pool): PerformanceTracker {
  if (!trackerInstance) {
    const checkInterval = parseInt(process.env.METRICS_INTERVAL_MINUTES || '60');
    trackerInstance = new PerformanceTracker(pool, checkInterval);
  }
  return trackerInstance;
}
