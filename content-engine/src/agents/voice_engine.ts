/**
 * Voice Engine - FOMO/NEPQ Framing
 * Transforms boring summaries into dramatic, attention-grabbing content
 */

import OpenAI from 'openai';
import { SummarizerAgent } from './summarizer';

// ============================================================================
// VOICE PROFILES
// ============================================================================

export interface VoiceProfile {
  name: string;
  persona: 'QuantumAnchor' | 'TechProphet' | 'FinanceRebel';
  fomoIntensity: number; // 0-1 scale
  nepqCompliant: boolean;
  shockPhrases: string[];
  ctaStyle: 'urgent' | 'inviting' | 'exclusive';
  tone: string;
  urgency: number; // 1-10
}

export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  QuantumAnchor: {
    name: 'Quantum Anchor',
    persona: 'QuantumAnchor',
    fomoIntensity: 0.9,
    nepqCompliant: true,
    shockPhrases: [
      'Your dollar just died at 2 PM today.',
      'The {number} billion people who think they\'re safe just became obsolete.',
      'While you were reading this, {event} was already happening.',
      'Most investors don\' know this yet, but...',
      'The few who know are already...',
      'This changes everything you thought you knew about {topic}.',
    ],
    ctaStyle: 'urgent',
    tone: 'dramatic, insider knowledge, urgent',
    urgency: 9,
  },
  TechProphet: {
    name: 'Tech Prophet',
    persona: 'TechProphet',
    fomoIntensity: 0.7,
    nepqCompliant: true,
    shockPhrases: [
      'By 2027, this will affect every single one of us.',
      'What Silicon Valley isn\'t telling you about {topic}.',
      'The pattern is clear. The question is: are you positioned?',
      'I\'ve analyzed {number} data points. Here\'s what emerges.',
      'This isn\'t speculation. This is trajectory.',
    ],
    ctaStyle: 'inviting',
    tone: 'analytical, authoritative, predictive',
    urgency: 7,
  },
  FinanceRebel: {
    name: 'Finance Rebel',
    persona: 'FinanceRebel',
    fomoIntensity: 0.85,
    nepqCompliant: true,
    shockPhrases: [
      'While the Fed wants you to believe X, the data shows Y.',
      'Your financial advisor won\'t tell you this.',
      'The establishment is counting on your ignorance.',
      'Here\'s what they don\'t want you to know about {topic}.',
      'Time to choose: stay informed or stay poor.',
    ],
    ctaStyle: 'exclusive',
    tone: 'contrarian, data-driven, rebellious',
    urgency: 8,
  },
};

// ============================================================================
// VOICE ENGINE
// ============================================================================

export interface VoiceConfig {
  profile: VoiceProfile;
  topic: string;
  emotionalArc: 'fear' | 'excitement' | 'curiosity' | 'outrage';
  climaxPoint: string;
  targetWordCount: number;
}

export interface VoiceTransformResult {
  headline: string;
  transformedContent: string;
  openingHook: string;
  emotionalProgression: string[];
  cliffhanger: string;
  appliedPhrases: string[];
}

export class VoiceEngineAgent {
  private ai: OpenAI | null = null;

  constructor() {
    this.initializeAI();
  }

  private initializeAI() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey && apiKey !== '') {
      this.ai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey,
        timeout: 30000,
      });
    }
  }

  /**
   * Transform a boring summary into dramatic FOMO content
   */
  async transform(
    summary: string,
    config: VoiceConfig
  ): Promise<VoiceTransformResult> {
    // Apply AI transformation if available
    if (this.ai) {
      return this.aiTransform(summary, config);
    }

    // Fallback to rule-based transformation
    return this.ruleBasedTransform(summary, config);
  }

  private async aiTransform(
    summary: string,
    config: VoiceConfig
  ): Promise<VoiceTransformResult> {
    const profile = config.profile;

    const systemPrompt = `You are ${profile.name}, a ${profile.tone} news analyst.

Your writing style:
- Use dramatic, urgent language
- Create FOMO (fear of missing out)
- Apply NEPQ principles (permission-based, non-pushy questions)
- Make readers feel they're getting insider information
- Use specific timestamps and numbers for credibility
- Create emotional interruption with shocking statements

Your goal: Transform boring news into must-read intelligence.`;

    const userPrompt = `Transform this summary into ${profile.tone} style:

ORIGINAL:
${summary}

Requirements:
- Opening hook: Shock the reader with urgency
- Emotional arc: ${config.emotionalArc}
- Add specific timestamps ("at 2:17 PM today")
- Include false time pressure ("before Friday...")
- Create exclusivity ("the few who know...")
- Word count target: ${config.targetWordCount}
- Climax point: ${config.climaxPoint}

Output format:
{{
  "headline": "...",
  "openingHook": "...",
  "content": "...",
  "emotionalProgression": ["...", "...", "..."],
  "cliffhanger": "...",
  "appliedPhrases": ["...", "..."]
}}`;

    const response = await this.ai.chat.completions.create({
      model: 'meta-llama/llama-3-70b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '';

    try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch {
      // If JSON parsing fails, parse content manually
      return {
        headline: content.split('\n')[0] || '',
        transformedContent: content,
        openingHook: '',
        emotionalProgression: [],
        cliffhanger: '',
        appliedPhrases: profile.shockPhrases.slice(0, 3),
      };
    }
  }

  private ruleBasedTransform(
    summary: string,
    config: VoiceConfig
  ): VoiceTransformResult {
    const profile = config.profile;
    const appliedPhrases: string[] = [];

    // 1. Generate dramatic headline
    const headline = this.generateDramaticHeadline(summary, profile);

    // 2. Create opening hook with shock phrase
    const shockPhrase = this.selectShockPhrase(profile, summary);
    appliedPhrases.push(shockPhrase);

    // 3. Transform content sections
    const paragraphs = summary.split('\n\n');
    const transformedParagraphs = paragraphs.map((para, index) => {
      return this.addUrgency(para, profile, index);
    });

    // 4. Create emotional progression markers
    const emotionalProgression = this.generateEmotionalProgression(
      config.emotionalArc,
      paragraphs.length
    );

    // 5. Generate cliffhanger
    const cliffhanger = this.generateCliffhanger(config.climaxPoint, profile);

    return {
      headline,
      transformedContent: transformedParagraphs.join('\n\n'),
      openingHook: shockPhrase,
      emotionalProgression,
      cliffhanger,
      appliedPhrases,
    };
  }

  private generateDramaticHeadline(summary: string, profile: VoiceProfile): string {
    const templates = [
      `Your {noun} just {verb}. Here's what happens next.`,
      `The {audience} won't tell you this, but {topic} changed today.`,
      `{number} billion people think they're safe. They're wrong.`,
      `At {time} today, {event} happened. You weren't supposed to know.`,
      `Why {topic} just became the most dangerous game in {domain}.`,
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];
    const topic = this.extractTopic(summary);

    return template
      .replace('{noun}', 'dollar')
      .replace('{verb}', 'died')
      .replace('{audience', 'the establishment')
      .replace('{topic}', topic)
      .replace('{number}', '3.5')
      .replace('{time}', '2:17 PM')
      .replace('{event}', 'the Federal Reserve pulled the trigger')
      .replace('{domain}', 'finance');
  }

  private selectShockPhrase(profile: VoiceProfile, context: string): string {
    const phrases = profile.shockPhrases;
    const randomIndex = Math.floor(Math.random() * phrases.length);
    let phrase = phrases[randomIndex];

    // Replace placeholders
    const topic = this.extractTopic(context);
    phrase = phrase.replace('{topic}', topic);
    phrase = phrase.replace('{number}', '3.5');
    phrase = phrase.replace('{event}', 'something massive');

    return phrase;
  }

  private addUrgency(paragraph: string, profile: VoiceProfile, index: number): string {
    const urgencyAdditions = [
      ' (happening as you read this)',
      ' (confirmed sources)',
      ' (verified data)',
      ' (the timeline is accelerating)',
    ];

    if (index === 0) {
      return paragraph + urgencyAdditions[0];
    }

    return paragraph;
  }

  private generateEmotionalProgression(
    arc: string,
    numParagraphs: number
  ): string[] {
    const progressions: Record<string, string[]> = {
      fear: ['Shock', 'Concern', 'Realization', 'Urgency'],
      excitement: ['Surprise', 'Opportunity', 'Possibility', 'Action'],
      curiosity: ['Mystery', 'Revelation', 'Connection', 'Invitation'],
      outrage: ['Injustice', 'Evidence', 'Accusation', 'Call to arms'],
    };

    const base = progressions[arc] || progressions.curiosity;
    return base.slice(0, numParagraphs);
  }

  private generateCliffhanger(climaxPoint: string, profile: VoiceProfile): string {
    const templates = [
      `But here's what {entity} doesn't want you to know...`,
      `The real question is: are you positioned for what comes next?`,
      `Most will miss this. The few who don't...`,
      `I've said too much already. But there's more.`,
    ];

    return templates[Math.floor(Math.random() * templates.length)]
      .replace('{entity}', 'they');
  }

  private extractTopic(summary: string): string {
    // Simple keyword extraction
    const keywords = ['Federal Reserve', 'dollar', 'crypto', 'AI', 'quantum', 'blockchain'];
    const lower = summary.toLowerCase();

    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return keyword;
      }
    }

    return 'the market';
  }

  /**
   * Apply NEPQ-style qualifying questions
   */
  generateQualifyingQuestions(topic: string): string[] {
    return [
      `What if everything you knew about ${topic} was about to change?`,
      `Are you positioned for what's coming, or still figuring it out?`,
      `What would you do if you knew the timeline had already begun?`,
      `Have you considered what happens when the dominoes start falling?`,
    ];
  }

  /**
   * Create irresistible offer framing
   */
  createIrresistibleFramming(
    offer: string,
    urgency: 'now' | 'limited' | 'exclusive'
  ): string {
    const frames = {
      now: `This is happening right now. Not tomorrow. Not next week.`,
      limited: `Only {number} spots available. This window closes {time}.`,
      exclusive: `This isn't public information. You're seeing what {percentage}% never will.`,
    };

    let frame = frames[urgency];

    if (urgency === 'limited') {
      frame = frame.replace('{number}', '17').replace('{time}', 'in 72 hours');
    } else if (urgency === 'exclusive') {
      frame = frame.replace('{percentage}', '99');
    }

    return frame;
  }
}

// Export singleton instance
let voiceEngineInstance: VoiceEngineAgent | null = null;

export function getVoiceEngine(): VoiceEngineAgent {
  if (!voiceEngineInstance) {
    voiceEngineInstance = new VoiceEngineAgent();
  }
  return voiceEngineInstance;
}
