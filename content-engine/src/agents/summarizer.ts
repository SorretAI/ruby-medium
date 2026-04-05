/**
 * AI Summarizer Agent
 * Supports multiple AI providers: NVIDIA NIM, OpenRouter, Ollama
 * Cross-references up to 5 sources and generates citations
 */

import OpenAI from 'openai';
import { createHash } from 'crypto';

// Provider configuration
const PROVIDERS = {
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    models: ['meta-llama/llama-3-70b-instruct', 'mistralai/mistral-large'],
  },
  nvidia: {
    baseURL: 'https://integrate.api.nvidia.com/v1',
    apiKey: process.env.NVIDIA_API_KEY,
    models: ['meta/llama-3-8b-instruct', 'meta/llama-3-70b-instruct'],
  },
  ollama: {
    baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    apiKey: 'ollama', // Ollama doesn't require a key
    models: [process.env.OLLAMA_MODEL || 'llama3.1:8b'],
  },
} as const;

type Provider = keyof typeof PROVIDERS;

export interface ArticleSource {
  url: string;
  title: string;
  content: string;
  publishedAt?: Date;
  author?: string;
}

export interface SummaryResult {
  summary: string;
  citations: Citation[];
  sources: string; // Formatted sources section
  deepDiveUrl?: string; // Link to full analysis if generated
  wordCount: number;
  readingTime: number; // minutes
  provider: string;
  model: string;
}

export interface Citation {
  id: number;
  text: string;
  sourceUrl: string;
  sourceTitle: string;
}

export interface SummarizerConfig {
  maxSources: number; // Maximum sources to cross-reference (default: 5)
  summaryLength: 'short' | 'medium' | 'long';
  includeCitations: boolean;
  providerOrder?: Provider[]; // Priority order for providers
}

const DEFAULT_CONFIG: SummarizerConfig = {
  maxSources: 5,
  summaryLength: 'medium',
  includeCitations: true,
};

/**
 * Multi-provider AI Summarizer
 * Automatically falls back through providers if one fails
 */
export class SummarizerAgent {
  private config: SummarizerConfig;
  private clients: Map<string, OpenAI>;
  private currentProvider: Provider | null = null;

  constructor(config: Partial<SummarizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.clients = new Map();
    this.initializeClients();
  }

  private initializeClients() {
    // Initialize OpenAI clients for each provider
    (Object.keys(PROVIDERS) as Provider[]).forEach((provider) => {
      const providerConfig = PROVIDERS[provider];
      if (providerConfig.apiKey || provider === 'ollama') {
        const client = new OpenAI({
          baseURL: providerConfig.baseURL,
          apiKey: providerConfig.apiKey || 'no-key-needed',
          timeout: 30000,
          maxRetries: 3,
        });
        this.clients.set(provider, client);
      }
    });
  }

  /**
   * Summarize articles from multiple sources
   */
  async summarize(
    sources: ArticleSource[],
    topic: string,
    config?: Partial<SummarizerConfig>
  ): Promise<SummaryResult> {
    const finalConfig = { ...this.config, ...config };
    const limitedSources = sources.slice(0, finalConfig.maxSources);

    // Build the prompt
    const prompt = this.buildSummarizationPrompt(topic, limitedSources);

    // Try providers in order
    const providerOrder = config?.providerOrder || ['openrouter', 'nvidia', 'ollama'] as Provider[];
    let lastError: Error | null = null;

    for (const provider of providerOrder) {
      const client = this.clients.get(provider);
      if (!client) continue;

      try {
        this.currentProvider = provider;
        const result = await this.generateWithProvider(client, provider, prompt, finalConfig);
        return {
          ...result,
          provider,
          model: PROVIDERS[provider].models[0],
        };
      } catch (error) {
        lastError = error as Error;
        console.warn(`Provider ${provider} failed: ${error.message}`);
        continue;
      }
    }

    throw lastError || new Error('All AI providers failed');
  }

  private async generateWithProvider(
    client: OpenAI,
    provider: Provider,
    prompt: string,
    config: SummarizerConfig
  ): Promise<Omit<SummaryResult, 'provider' | 'model'>> {
    const systemPrompt = this.buildSystemPrompt(config.summaryLength);

    const response = await client.chat.completions.create({
      model: PROVIDERS[provider].models[0],
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: config.summaryLength === 'short' ? 500 : config.summaryLength === 'medium' ? 1000 : 2000,
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse citations from the response
    const citations = this.parseCitations(content, config.includeCitations);
    const summary = this.extractSummary(content);
    const sources = this.formatSourcesSection(citations);

    const wordCount = summary.split(' ').length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    return {
      summary,
      citations,
      sources,
      wordCount,
      readingTime,
    };
  }

  private buildSystemPrompt(length: string): string {
    return `You are an expert news analyst and summarizer. Your task is to:

1. Synthesize information from multiple news sources into a coherent summary
2. Cross-reference claims across sources for accuracy
3. Highlight points of agreement and disagreement between sources
4. Include inline citations [1], [2], etc. for claims from specific sources
5. Maintain journalistic objectivity while making complex topics accessible

Format your response as:
- A compelling headline (if not provided)
- Main summary with numbered citations [1], [2], etc.
- Sources section at the end

Keep your tone professional yet engaging. Use active voice. Avoid unnecessary jargon.`;
  }

  private buildSummarizationPrompt(topic: string, sources: ArticleSource[]): string {
    const sourceTexts = sources.map((s, i) => `
[Source ${i + 1}]: ${s.title}
Published: ${s.publishedAt?.toISOString() || 'Unknown'}
URL: ${s.url}
Content:
${s.content}
---
`).join('\n');

    return `Topic: ${topic}

Please synthesize the following ${sources.length} sources into a coherent summary:

${sourceTexts}

Instructions:
- Create a 3-5 paragraph summary
- Use inline citations [1], [2], etc.
- Note any discrepancies between sources
- Highlight the most impactful information
- Maintain objectivity
`;
  }

  private parseCitations(content: string, includeCitations: boolean): Citation[] {
    if (!includeCitations) return [];

    const citations: Citation[] = [];
    const citationRegex = /\[(\d+)\]/g;
    const matches = [...content.matchAll(citationRegex)];

    let id = 1;
    for (const match of matches) {
      citations.push({
        id: id++,
        text: `Source ${match[1]}`,
        sourceUrl: '',
        sourceTitle: `Source ${match[1]}`,
      });
    }

    return citations;
  }

  private extractSummary(content: string): string {
    // Remove sources section for clean summary
    const sourcesIndex = content.toLowerCase().indexOf('sources:');
    if (sourcesIndex !== -1) {
      return content.substring(0, sourcesIndex).trim();
    }
    return content.trim();
  }

  private formatSourcesSection(citations: Citation[]): string {
    if (citations.length === 0) return '';

    return '\n\n## Sources\n\n' + citations.map(c =>
      `${c.id}. ${c.sourceTitle} - ${c.sourceUrl}`
    ).join('\n');
  }

  /**
   * Get the current provider status
   */
  getStatus() {
    return {
      currentProvider: this.currentProvider,
      availableProviders: Array.from(this.clients.keys()),
    };
  }
}

/**
 * Extract full text from URL (simple version)
 * For production, use a proper article extractor
 */
export async function fetchArticleContent(url: string): Promise<ArticleSource> {
  // In production, use a proper article extractor like @extractus/article-extractor
  // This is a simplified version
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrendingNewsBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.status}`);
    }

    const html = await response.text();

    // Simple text extraction (production should use proper parser)
    const textContent = html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000); // Limit content size

    return {
      url,
      title: html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || url,
      content: textContent,
    };
  } catch (error) {
    console.error(`Error fetching article from ${url}:`, error);
    throw error;
  }
}

// Export singleton instance
let summarizerInstance: SummarizerAgent | null = null;

export function getSummarizer(config?: Partial<SummarizerConfig>): SummarizerAgent {
  if (!summarizerInstance) {
    summarizerInstance = new SummarizerAgent(config);
  }
  return summarizerInstance;
}
