/**
 * CTA Generator Agent
 * Creates context-aware CTAs that match the article's emotional arc
 */

import { VoiceProfile } from './voice_engine';

// ============================================================================
// CTA CONFIGURATION
// ============================================================================

export interface CTAConfig {
  articleTopic: string;
  emotionalArc: 'fear' | 'excitement' | 'curiosity' | 'outrage';
  readerState: 'informed' | 'concerned' | 'excited' | 'outraged';
  voiceProfile: VoiceProfile['persona'];
  targetConversion: 'vsl' | 'community' | 'consultation' | 'newsletter';
}

export interface CTAResult {
  primary: string;
  secondary?: string;
  urgency: string;
  framingStyle: string;
}

// ============================================================================
// CTA TEMPLATES BY EMOTIONAL STATE
// ============================================================================

const CTA_TEMPLATES = {
  fear: {
    vsl: [
      `If you're wondering where quantum-resistant blockchain projects are quietly accumulating before the next wave hits — I've been tracking 3 specific ecosystems that solved this back in 2024. Most haven't even launched their main net yet. [Access the brief →]`,
      `While you were reading this, institutional players have been positioning themselves. The question is: are you still on the sidelines? [See what they know →]`,
      `The clock is ticking. And unlike traditional finance, this train leaves the station whether you're on board or not. [Get positioned →]`,
    ],
    community: [
      `The people who saw this coming? They're already inside. The question isn't whether this pattern works — it's whether you'll recognize it before the next wave. [Join the waitlist →]`,
      `I don't share this publicly often. But for the ones who actually read this far — there's a community where we discuss what comes next. [Request access →]`,
    ],
    consultation: [
      `Here's what most investors don't realize: by the time this hits mainstream media, the opportunity window has already closed. If you're serious about positioning before that happens, let's talk. [Book a 1:1 →]`,
      `This isn't financial advice. It's pattern recognition. And if you want to understand how this applies to your specific situation — I have 3 consultation slots open this week. [Claim yours →]`,
    ],
    newsletter: [
      `I track these patterns daily. Most of what I find stays in the research. But subscribers get the raw intelligence before it's distilled. [Join the inner circle →]`,
    ],
  },
  excitement: {
    vsl: [
      `I'm tracking 17 founders using this exact pattern to build million-dollar businesses while their competition is still figuring out prompts. Three of them are opening doors next week inside [Community Name]. The timing window — if you're reading this on day one — closes in 72 hours. [Get early access →]`,
      `What happens when opportunity meets preparation? You don't have to wonder. The blueprint exists. The question is whether you'll execute before everyone else does. [See how →]`,
    ],
    community: [
      `The energy in the room when this happens? Electric. And I save those moments for the people who actually show up. [Reserve your spot →]`,
    ],
    consultation: [
      `I only work with people who are ready to move. Not think about moving. Actually move. If that's you — let's skip the small talk and get straight to the strategy session. [Apply for consultation →]`,
    ],
    newsletter: [
      `Every week, I breakdown one pattern like this. No fluff. No filler. Just the tactical insight you can use immediately. [Subscribe free →]`,
    ],
  },
  curiosity: {
    vsl: [
      `This is part of a larger framework that I've been developing over the past 18 months. Most of it is too advanced to share publicly. But there's a version I walk through in the full brief. [Get the complete picture →]`,
      `Rabbit hole goes deeper. Much deeper. For those who want to see how far it goes — there's a method to the madness. [Follow the thread →]`,
    ],
    community: [
      `The best conversations happen after hours. When the public noise dies down and the real builders start talking. You're invited to listen. [Join quietly →]`,
    ],
    consultation: [
      `Sometimes the dots don't connect until someone shows you the line. If you're seeing patterns but can't quite make out the picture — let's zoom out together. [Schedule clarity call →]`,
    ],
    newsletter: [
      `Curiosity is a good starting point. But it's not a strategy. If you want to turn yours into something actionable — I send one insight like this every Tuesday. [Subscribe →]`,
    ],
  },
  outrage: {
    vsl: [
      `They count on your anger. They profit from your confusion. But here's the thing: knowledge is the great equalizer. And knowledge is exactly what they're trying to keep from you. [Get informed →]`,
      `The system isn't broken. It's working exactly as designed. For them. The question is: when do we start making it work for us? [Learn how →]`,
    ],
    community: [
      `There's a room where people talk about this honestly. No corporate filters. No PR spin. Just raw, unfiltered truth from people who've had enough. [Find your way in →]`,
    ],
    consultation: [
      `Anger is energy. But it needs direction. If you're ready to channel yours into something that actually matters — I work with people who want to build, not just complain. [Let's talk →]`,
    ],
    newsletter: [
      `They don't want you thinking for yourself. Good. Think for yourself. And if you want someone else doing the research — I publish every Thursday. Uncensored. [Subscribe if you dare →]`,
    ],
  },
} as const;

// ============================================================================
// CTA GENERATOR
// ============================================================================

export class CTAGeneratorAgent {
  /**
   * Generate context-aware CTA based on article emotional state
   */
  generate(config: CTAConfig): CTAResult {
    const { emotionalArc, targetConversion } = config;

    // Get templates for this emotional state
    const templates = CTA_TEMPLATES[emotionalArc] || CTA_TEMPLATES.curiosity;
    const targetTemplates = templates[targetConversion] || templates.curiosity;

    // Select primary CTA
    const primary = this.selectCTA(targetTemplates, config);

    // Generate secondary (fallback)
    const secondaryTemplates = targetTemplates.filter((t) => t !== primary);
    const secondary = secondaryTemplates.length > 0
      ? secondaryTemplates[0]
      : undefined;

    return {
      primary,
      secondary,
      urgency: this.generateUrgency(config),
      framingStyle: this.getFramingStyle(config),
    };
  }

  private selectCTA(templates: string[], config: CTAConfig): string {
    if (templates.length === 0) {
      return this.generateFallbackCTA(config);
    }

    // Weight by voice profile
    const weights = this.getVoiceWeights(config.voiceProfile, templates.length);

    // Simple weighted selection
    const index = Math.floor(Math.random() * templates.length);
    let cta = templates[index];

    // Add personalization based on topic
    if (config.articleTopic) {
      cta = this.personalizeCTA(cta, config.articleTopic);
    }

    return cta;
  }

  private getVoiceWeights(
    persona: string,
    length: number
  ): number[] {
    // Different personas prefer different CTA styles
    switch (persona) {
      case 'QuantumAnchor':
        // Urgent, dramatic
        return Array(length).fill(1).map((_, i) => (i === 0 ? 1.5 : 0.8));
      case 'TechProphet':
        // Analytical, inviting
        return Array(length).fill(1);
      case 'FinanceRebel':
        // Contrarian, exclusive
        return Array(length).fill(1).map((_, i) => (i < length / 2 ? 1.2 : 0.9));
      default:
        return Array(length).fill(1);
    }
  }

  private personalizeCTA(cta: string, topic: string): string {
    // Replace topic placeholders
    return cta
      .replace('{topic}', topic)
      .replace('{time}', '72 hours')
      .replace('{number}', '3');
  }

  private generateUrgency(config: CTAConfig): string {
    const urgencies = {
      fear: 'Immediate action required. Window closing.',
      excitement: 'Limited spots. Early access priority.',
      curiosity: 'Information available now. Details inside.',
      outrage: 'Change starts with awareness. Begin today.',
    };

    return urgencies[config.emotionalArc] || urgencies.curiosity;
  }

  private getFramingStyle(config: CTAConfig): string {
    // NEPQ-compliant framing
    const frames = {
      fear: 'Permission-based with escape hatch',
      excitement: 'Invitation to exclusive access',
      curiosity: 'Partial revelation + invitation',
      outrage: 'Call to action with community',
    };

    return frames[config.emotionalArc] || frames.curiosity;
  }

  private generateFallbackCTA(config: CTAConfig): string {
    const fallbacks = [
      `The next step is yours to take. [Continue →]`,
      `This is just the beginning. [See what's next →]`,
      `Knowledge without action is entertainment. [Take action →]`,
      `The pattern is clear. The question is: what will you do with it? [Decide →]`,
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  /**
   * Generate CTAs that don't feel salesy
   */
  generateOrganicCTA(config: CTAConfig): string {
    const { articleTopic, emotionalArc } = config;

    // Pattern: Acknowledge reader state + offer value + permission to decline
    const patterns = {
      fear: `Look, if you're feeling uncertain about ${articleTopic}, that's actually rational. The people who understand this best aren't sleeping well either. But they're also the ones who positioned early. There's a brief I put together for situations exactly like this. No pitch. Just the facts. [Access it here if you want →]`,
      excitement: `I get it — you're excited. You should be. But excitement without direction is just noise. If you want to channel this into something real, I've got the roadmap. No guarantees. Just the path. [Take it if it resonates →]`,
      curiosity: `Curiosity is a good starting point. But it's not a strategy. If you want to turn yours into something actionable, there's a next step. No pressure. Just an option. [Explore if interested →]`,
      outrage: `Your anger is valid. But ask yourself: is it useful? If you want to channel it into something that actually matters, there's work to be done. And there are people doing it. [Join them if you're ready →]`,
    };

    return patterns[emotionalArc] || patterns.curiosity;
  }

  /**
   * Generate CTA variations for A/B testing
   */
  generateVariations(config: CTAConfig, count: number = 3): string[] {
    const variations: string[] = [];
    const seen = new Set<string>();

    while (variations.length < count) {
      const cta = this.generate(config).primary;

      if (!seen.has(cta)) {
        seen.add(cta);
        variations.push(cta);
      }

      // Prevent infinite loop
      if (variations.length > 100) break;
    }

    return variations;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

let ctaGeneratorInstance: CTAGeneratorAgent | null = null;

export function getCTAGenerator(): CTAGeneratorAgent {
  if (!ctaGeneratorInstance) {
    ctaGeneratorInstance = new CTAGeneratorAgent();
  }
  return ctaGeneratorInstance;
}

export const ctaGenerator = getCTAGenerator();
