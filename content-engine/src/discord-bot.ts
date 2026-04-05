/**
 * Discord Bot for Human-in-the-Loop Review
 * Matches genesis-alpha style with interactive buttons and embeds
 */

import {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  TextChannel,
} from 'discord.js';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://user:password@postgres:5432/newsdb',
});

// Discord configuration
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || '';

/**
 * Article Draft for review
 */
interface ArticleDraft {
  draft_id: string;
  topic_id: string;
  headline: string;
  content: string;
  voice_profile: string;
  cta_text: string;
  sources: string;
  word_count: number;
  created_at: Date;
}

/**
 * Initialize Discord Client
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

/**
 * Create article review embed
 */
function createReviewEmbed(draft: ArticleDraft): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#FF4500') // Reddit orange for urgency
    .setTitle(`📰 ${truncate(draft.headline, 80)}`)
    .addFields(
      { name: 'Voice Profile', value: draft.voice_profile, inline: true },
      { name: 'Word Count', value: `${draft.word_count}`, inline: true },
      { name: 'Created', value: formatRelativeTime(draft.created_at), inline: true },
      { name: '\u200B', value: '\u200B' }, // Spacer
    )
    .setDescription(
      `**Preview:**\n${truncate(draft.content, 1500)}\n\n` +
      `**CTA:** ${truncate(draft.cta_text, 200)}`
    )
    .setFooter({ text: `Draft ID: ${draft.draft_id}` })
    .setTimestamp();
}

/**
 * Create action buttons for review
 */
function createReviewButtons(draftId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`approve_${draftId}`)
      .setLabel('✅ Approve & Publish')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`edit_${draftId}`)
      .setLabel('✏️ Edit Angle')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`reject_${draftId}`)
      .setLabel('❌ Reject')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`rewrite_${draftId}`)
      .setLabel('🔄 Rewrite (Different Voice)')
      .setStyle(ButtonStyle.Secondary),
  );
}

/**
 * Send draft for review
 */
async function sendDraftForReview(draft: ArticleDraft): Promise<void> {
  if (!CHANNEL_ID) {
    console.log('No channel ID configured, skipping Discord notification');
    return;
  }

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel || !isTextChannel(channel)) {
      console.error('Invalid channel');
      return;
    }

    const embed = createReviewEmbed(draft);
    const buttons = createReviewButtons(draft.draft_id);

    const message = await channel.send({
      embeds: [embed],
      components: [buttons],
    });

    // Store message reference for updates
    await updateDraftMessageRef(draft.draft_id, message.id);
  } catch (error) {
    console.error('Error sending draft:', error);
  }
}

/**
 * Handle button interactions
 */
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const [action, draftId] = interaction.customId.split('_');

  switch (action) {
    case 'approve':
      await handleApprove(interaction, draftId);
      break;
    case 'edit':
      await handleEdit(interaction, draftId);
      break;
    case 'reject':
      await handleReject(interaction, draftId);
      break;
    case 'rewrite':
      await handleRewrite(interaction, draftId);
      break;
  }
});

/**
 * Handle approve action
 */
async function handleApprove(
  interaction: any,
  draftId: string
): Promise<void> {
  await interaction.deferUpdate();

  try {
    // Update database
    await pool.query(
      `UPDATE content_history SET status = 'human_approved' WHERE draft_id = $1`,
      [draftId]
    );

    // Publish to Medium
    const publishResult = await publishToMedium(draftId);

    // Update message with result
    const channel = await interaction.channel.fetch();
    const message = await channel.messages.fetch(interaction.message.id);

    await message.edit({
      content: `✅ **Approved & Published!**\n\n${publishResult.url}`,
      components: [], // Remove buttons
    });

  } catch (error) {
    console.error('Error approving draft:', error);
    await interaction.followUp({
      content: '❌ Error publishing. Please check logs.',
      ephemeral: true,
    });
  }
}

/**
 * Handle edit action - creates thread for discussion
 */
async function handleEdit(
  interaction: any,
  draftId: string
): Promise<void> {
  const channel = await interaction.channel.fetch();

  // Create thread for editing discussion
  const message = await channel.messages.fetch(interaction.message.id);
  const thread = await message.createThread({
    name: `✏️ Editing: ${draftId.slice(0, 8)}`,
    autoArchiveDuration: 60,
  });

  await thread.send(
    '**Edit Instructions:**\n' +
    '1. Describe what angle/tone changes you want\n' +
    '2. Mention specific sections to modify\n' +
    '3. Use `/regenerate` command when ready\n\n' +
    'Example: "Make the headline more urgent, add 2 more data points, soften the CTA"'
  );

  await interaction.followUp({
    content: `✏️ Edit thread created: ${thread.url}`,
    ephemeral: true,
  });
}

/**
 * Handle reject action
 */
async function handleReject(
  interaction: any,
  draftId: string
): Promise<void> {
  await pool.query(
    `UPDATE content_history SET status = 'rejected' WHERE draft_id = $1`,
    [draftId]
  );

  await interaction.update({
    content: '❌ **Draft Rejected**\nThis topic will not be published.',
    components: [],
  });
}

/**
 * Handle rewrite with different voice
 */
async function handleRewrite(
  interaction: any,
  draftId: string
): Promise<void> {
  await interaction.deferUpdate();

  // Get current draft
  const { rows } = await pool.query(
    'SELECT * FROM content_history WHERE draft_id = $1',
    [draftId]
  );

  if (rows.length === 0) {
    await interaction.followUp({
      content: 'Draft not found',
      ephemeral: true,
    });
    return;
  }

  const currentDraft = rows[0];

  // Queue for regeneration with different voice
  await pool.query(
    `UPDATE content_history
     SET status = 'rewriting', voice_profile = $2
     WHERE draft_id = $1`,
    [draftId, getNextVoice(currentDraft.voice_profile)]
  );

  await interaction.followUp({
    content: `🔄 Regenerating with different voice profile...`,
    ephemeral: true,
  });
}

/**
 * Publish article to Medium
 */
async function publishToMedium(draftId: string): Promise<{ url: string; postId: string }> {
  const { rows } = await pool.query(
    `SELECT ch.*, m.medium_api_key, m.medium_user_id
     FROM content_history ch
     JOIN medium_accounts m ON ch.medium_account = m.account_name
     WHERE ch.draft_id = $1`,
    [draftId]
  );

  if (rows.length === 0) {
    throw new Error('Draft not found');
  }

  const row = rows[0];

  // Medium API call
  const mediumUrl = 'https://api.medium.com/v1/users/USERNAME/posts';

  const response = await fetch(mediumUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${row.medium_api_key}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-charset': 'utf-8',
    },
    body: JSON.stringify({
      title: row.headline,
      contentFormat: 'markdown',
      content: row.published_version,
      tags: row.categories || ['technology', 'finance'],
      publishStatus: 'public',
      license: row.license || 'all-rights-reserved',
    }),
  });

  const result = await response.json();

  return {
    url: result.data.url,
    postId: result.data.id,
  };
}

/**
 * Start the bot
 */
export function startDiscordBot(): void {
  if (!DISCORD_TOKEN) {
    console.log('Discord bot not configured (no token)');
    return;
  }

  client.once(Events.ClientReady, () => {
    console.log(`Discord bot ready: ${client.user?.tag}`);
  });

  client.login(DISCORD_TOKEN);
}

// Utility functions
function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + '...' : str;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

function isTextChannel(channel: any): channel is TextChannel {
  return channel.type === ChannelType.GuildText;
}

function getNextVoice(currentVoice: string): string {
  const voices = ['QuantumAnchor', 'TechProphet', 'FinanceRebel'];
  const currentIndex = voices.indexOf(currentVoice);
  const nextIndex = (currentIndex + 1) % voices.length;
  return voices[nextIndex];
}

function updateDraftMessageRef(draftId: string, messageId: string): Promise<void> {
  return pool.query(
    'UPDATE content_history SET discord_message_id = $2 WHERE draft_id = $1',
    [draftId, messageId]
  );
}
