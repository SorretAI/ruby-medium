/**
 * Content Orchestrator
 * Coordinates all AI agents for end-to-end article generation
 */

import { Pool } from 'pg';
import { getSummarizer, ArticleSource, fetchArticleContent } from './summarizer';
import { getVoiceEngine, VoiceProfile, VOICE_PROFILES } from './voice_engine';
import { getCTAGenerator, ctaGenerator } from './cta_generator';
import { getPublisher, MediumArticle } from './publisher';
import { getSummarizer as getDbSession } from '../db';

// ============================================================================
// TYPES
// ============================================================================

export interface GenerationConfig {
  topicId: string;
  headline: string;
  sourceUrls: string[];
  voiceProfile: keyof typeof VOICE_PROFILES;
  targetWordCount: number;
  includeCitations: boolean;
  autoApprove: boolean; // Skip human review (for testing)
}

export interface GeneratedArticle {
  id: string;
  topicId: string;
  headline: string;
  content: string;
  cta: string;
  citations: string;
  voiceProfile: string;
  wordCount: number;
  readingTime: number;
  status: 'draft' | 'pending_review' | 'approved' | 'published';
  createdAt: Date;
}

export interface ProcessingMetrics {
  topicId: string;
  summarizationTime: number;
  voiceTransformTime: number;
  ctaGenerationTime: number;
  totalTokens: number;
  provider: string;
  model: string;
  costEstimate: number;
}

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export class ContentOrchestrator {
  private pool: Pool;
  private summarizer: ReturnType<typeof getSummarizer>;
  private voiceEngine: ReturnType<typeof getVoiceEngine>;
  private ctaGenerator: ReturnType<typeof getCTAGenerator>;
  private publisher: ReturnType<typeof getPublisher>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.summarizer = getSummarizer();
    this.voiceEngine = getVoiceEngine();
    this.ctaGenerator = getCTAGenerator();
    this.publisher = getPublisher(pool);
  }

  /**
   * Generate complete article from topic
   */
  async generateArticle(config: GenerationConfig): Promise<GeneratedArticle> {
    const startTime = Date.now();
    const metrics: Partial<ProcessingMetrics> = {
      topicId: config.topicId,
    };

    try {
      // Step 1: Fetch and summarize sources
      const sumStart = Date.now();
      const sources: ArticleSource[] = [];

      for (const url of config.sourceUrls.slice(0, 5)) {
        try {
          const source = await fetchArticleContent(url);
          sources.push(source);
        } catch (error) {
          console.warn(`Failed to fetch ${url}:`, error);
        }
      }

      if (sources.length === 0) {
        throw new Error('No valid sources found');
      }

      const summary = await this.summarizer.summarize(sources, config.headline, {
        summaryLength: 'medium',
        includeCitations: config.includeCitations,
      });

      metrics.summarizationTime = Date.now() - sumStart;
      metrics.provider = summary.provider;
      metrics.model = summary.model;

      // Step 2: Apply voice transformation
      const voiceStart = Date.now();
      const voiceProfile = VOICE_PROFILES[config.voiceProfile] || VOICE_PROFILES.QuantumAnchor;

      const transformed = await this.voiceEngine.transform(summary.summary, {
        profile: voiceProfile,
        topic: config.headline,
        emotionalArc: 'fear', // Could be determined from content analysis
        climaxPoint: config.headline,
        targetWordCount: config.targetWordCount,
      });

      metrics.voiceTransformTime = Date.now() - voiceStart;

      // Step 3: Generate CTA
      const ctaStart = Date.now();
      const cta = this.ctaGenerator.generateOrganicCTA({
        articleTopic: config.headline,
        emotionalArc: 'fear',
        readerState: 'concerned',
        voiceProfile: voiceProfile.persona,
        targetConversion: 'vsl',
      });

      metrics.ctaGenerationTime = Date.now() - ctaStart;

      // Step 4: Combine into final article
      const fullContent = [
        `# ${transformed.headline}\n`,
        `_${transformed.openingHook}_\n`,
        transformed.transformedContent,
        `\n\n---\n`,
        `## What This Means For You\n`,
        cta,
        summary.sources, // Citations and sources section
      ].join('\n');

      const wordCount = fullContent.split(' ').length;
      const readingTime = Math.ceil(wordCount / 200);

      const article: GeneratedArticle = {
        id: crypto.randomUUID(),
        topicId: config.topicId,
        headline: transformed.headline,
        content: fullContent,
        cta,
        citations: summary.sources,
        voiceProfile: config.voiceProfile,
        wordCount,
        readingTime,
        status: config.autoApprove ? 'approved' : 'pending_review',
        createdAt: new Date(),
      };

      // Step 5: Save to database
      await this.saveArticle(article);

      // Step 6: Send to Discord for review (if not auto-approve)
      if (!config.autoApprove) {
        await this.sendToDiscord(article);
      }

      return article;
    } catch (error) {
      console.error('Article generation failed:', error);
      throw error;
    }
  }

  /**
   * Publish article to Medium
   */
  async publishArticle(
    article: GeneratedArticle,
    accountName: string = 'account_a'
  ): Promise<string> {
    const mediumArticle: MediumArticle = {
      title: article.headline,
      content: article.content,
      tags: ['technology', 'finance', 'ai', 'trending'],
      publishStatus: 'public',
      license: 'all-rights-reserved',
    };

    const result = await this.publisher.publish(mediumArticle, accountName);

    // Update database with Medium info
    await this.pool.query(
      `UPDATE content_history
       SET medium_post_id = $1,
           medium_url = $2,
           medium_account = $3,
           published_at = $4,
           status = 'published'
       WHERE article_id = $5`,
      [result.id, result.url, accountName, result.publishedAt, article.id]
    );

    return result.url;
  }

  /**
   * Run split test between two article variants
   */
  async runSplitTest(
    config: GenerationConfig,
    durationHours: number = 24
  ): Promise<{ variantA: GeneratedArticle; variantB: GeneratedArticle; testId: string }> {
    // Generate variant A with first voice
    const variantA = await this.generateArticle({
      ...config,
      voiceProfile: 'QuantumAnchor',
    });

    // Generate variant B with different voice
    const variantB = await this.generateArticle({
      ...config,
      voiceProfile: config.voiceProfile === 'QuantumAnchor' ? 'TechProphet' : 'QuantumAnchor',
    });

    // Publish both
    await this.publishArticle(variantA, 'account_a');
    await this.publishArticle(variantB, 'account_b');

    // Record test
    const { rows } = await this.pool.query(
      `INSERT INTO split_tests (test_id, account_a_id, account_b_id, metric, duration_hours, started_at)
       VALUES (gen_random_uuid(), $1, $2, 'reads', $3, NOW())
       RETURNING test_id`,
      [variantA.id, variantB.id, durationHours]
    );

    return {
      variantA,
      variantB,
      testId: rows[0].test_id,
    };
  }

  private async saveArticle(article: GeneratedArticle): Promise<void> {
    await this.pool.query(
      `INSERT INTO content_history
       (article_id, topic_id, published_version, voice_profile, cta_text, sources_section, word_count, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (article_id) DO UPDATE SET
       published_version = EXCLUDED.published_version,
       voice_profile = EXCLUDED.voice_profile,
       cta_text = EXCLUDED.cta_text,
       status = EXCLUDED.status`,
      [
        article.id,
        article.topicId,
        article.content,
        article.voiceProfile,
        article.cta,
        article.citations,
        article.wordCount,
        article.status,
      ]
    );
  }

  private async sendToDiscord(article: GeneratedArticle): Promise<void> {
    const channelId = process.env.DISCORD_CHANNEL_ID;
    if (!channelId) {
      console.warn('No Discord channel configured, skipping notification');
      return;
    }

    // This would integrate with the Discord bot
    // For now, just log
    console.log(`Article ${article.id} sent for review in channel ${channelId}`);
  }
}

// ============================================================================
// WORKFLOW: TOPIC TO PUBLISHED ARTICLE
// ============================================================================

/**
 * Complete workflow from detected topic to published article
 */
export async function processTrendingTopic(
  topicId: string,
  headline: string,
  sourceUrls: string[]
): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const orchestrator = new ContentOrchestrator(pool);

  try {
    // Update status
    await pool.query(
      `UPDATE processed_topics SET status = 'processing' WHERE topic_id = $1`,
      [topicId]
    );

    // Generate article with default settings
    const article = await orchestrator.generateArticle({
      topicId,
      headline,
      sourceUrls,
      voiceProfile: 'QuantumAnchor',
      targetWordCount: 800,
      includeCitations: true,
      autoApprove: false, // Requires human review
    });

    console.log(`Generated article: ${article.id}`);

  } catch (error) {
    console.error('Error processing topic:', error);
    await pool.query(
      `UPDATE processed_topics SET status = 'skipped' WHERE topic_id = $1`,
      [topicId]
    );
    throw error;
  } finally {
    await pool.end();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

let orchestratorInstance: ContentOrchestrator | null = null;

export function getOrchestrator(pool: Pool): ContentOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new ContentOrchestrator(pool);
  }
  return orchestratorInstance;
}
