import {
  ChatInputCommandInteraction,
  Client,
  Events,
  Interaction,
} from "discord.js";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { PersonaType } from "../../types";

// ---- Types ----
type OutputStyle = "WIKI" | "NARRATIVE";
// Using PersonaType from shared types.ts to ensure consistency
type Platform = "Instagram" | "TikTok" | "X" | "Facebook";

type RunCard = {
  runId: string;
  persona: PersonaType;
  platform: Platform;
  goal: "BookedCalls";
  budgetStatus: "OK" | "WARNING" | "STOP";
  outputStyle: OutputStyle;
  artifacts: Array<{ label: string; filePath: string }>; // local paths under /workspace
  copyPack?: {
    x?: string[];
    fb?: string[];
    ig?: string[];
    tiktok?: string[];
    blogSnippet?: string;
  };
};

// ---- Minimal storage (replace with DB later) ----
const inMemoryRuns = new Map<string, RunCard>();

// Button Styles: 1: Primary, 2: Secondary, 3: Success, 4: Danger
const BTN_PRIMARY = 1;
const BTN_SECONDARY = 2;
const BTN_SUCCESS = 3;

function buttonsForRun(run: RunCard) {
  const row1 = {
    type: 1, // ActionRow
    components: [
      {
        type: 2, // Button
        custom_id: `gen:variate:${run.runId}:v1`,
        label: "V1 Variate",
        style: BTN_SECONDARY,
      },
      {
        type: 2, // Button
        custom_id: `gen:upscale:${run.runId}:u1`,
        label: "U1 Upscale",
        style: BTN_SECONDARY,
      },
      {
        type: 2, // Button
        custom_id: `gen:save:${run.runId}`,
        label: "Save Workflow",
        style: BTN_SUCCESS,
      },
      {
        type: 2, // Button
        custom_id: `gen:copypack:${run.runId}`,
        label: "Copy Pack",
        style: BTN_PRIMARY,
      },
    ]
  };

  const row2 = {
    type: 1, // ActionRow
    components: [
      {
        type: 2, // Button
        custom_id: `gen:rate:${run.runId}:5`,
        label: "Rate ⭐⭐⭐⭐⭐",
        style: BTN_PRIMARY,
      },
      {
        type: 2, // Button
        custom_id: `gen:cost:${run.runId}`,
        label: "Report Cost",
        style: BTN_SECONDARY,
      },
      {
        type: 2, // Button
        custom_id: `gen:style:${run.runId}`,
        label: `Output: ${run.outputStyle}`,
        style: BTN_SECONDARY,
      },
    ]
  };

  return [row1, row2];
}

function embedForRun(run: RunCard) {
  const fields = [
      { name: "Run", value: run.runId, inline: true },
      { name: "Persona", value: run.persona, inline: true },
      { name: "Platform", value: run.platform, inline: true },
      { name: "Goal", value: run.goal, inline: true },
      { name: "Budget", value: run.budgetStatus, inline: true },
      { name: "Style", value: run.outputStyle, inline: true }
  ];

  if (run.artifacts.length) {
    fields.push({
      name: "Artifacts",
      value: run.artifacts.map(a => `• ${a.label}`).join("\n"),
      inline: false,
    });
  }

  return {
    title: "Genesis Run Card",
    fields: fields,
    footer: { text: "Midjourney-style controls: Variate / Upscale / Save / Rate" }
  };
}

// ---- Plug this into your real Orchestrator later ----
async function fakeGenerateRun(params: {
  persona: PersonaType;
  platform: Platform;
  outputStyle: OutputStyle;
}): Promise<RunCard> {
  const runId = crypto.randomUUID();

  // Create a placeholder artifact file path (simulate)
  const artifactDir = path.join(process.env.WORKSPACE_DIR ?? "/workspace", "artifacts", runId);
  // Ensure we don't crash if folder creation fails (permissions etc)
  try {
    await fs.mkdir(artifactDir, { recursive: true });
  } catch (e) {
    console.error("Failed to create artifact dir, using /tmp fallback", e);
  }

  // Create placeholder text artifact to prove the pipeline
  const txtPath = path.join(artifactDir, "copy_pack.txt");
  const sample = [
    `Persona: ${params.persona}`,
    `Platform: ${params.platform}`,
    `OutputStyle: ${params.outputStyle}`,
    "",
    "X:",
    "- Calm certainty. Outcomes are not optional.",
    "",
    "IG:",
    "- Book your call. We align timing, clarity, probability.",
  ].join("\n");
  
  try {
    await fs.writeFile(txtPath, sample, "utf-8");
  } catch (e) {
    console.error("Failed to write artifact", e);
  }

  const run: RunCard = {
    runId,
    persona: params.persona,
    platform: params.platform,
    goal: "BookedCalls",
    budgetStatus: "OK",
    outputStyle: params.outputStyle,
    artifacts: [{ label: "Copy Pack (txt)", filePath: txtPath }],
    copyPack: {
      x: ["Calm certainty. Outcomes are not optional."],
      ig: ["Book your call. We align timing, clarity, probability."],
    },
  };

  inMemoryRuns.set(runId, run);
  return run;
}

// ---- Slash command: /gen ----
// Manual construction to avoid SlashCommandBuilder import issues
export const GenCommand = {
  name: "gen",
  description: "Generate a Genesis run card (MVP)",
  options: [
    {
      name: "persona",
      description: "Persona",
      type: 3, // STRING
      required: true,
      choices: [
        { name: "Ruby", value: "Ruby" },
        { name: "Streamer", value: "Streamer" },
        { name: "ContentManager", value: "ContentManager" }
      ]
    },
    {
      name: "platform",
      description: "Platform",
      type: 3, // STRING
      required: true,
      choices: [
        { name: "Instagram", value: "Instagram" },
        { name: "TikTok", value: "TikTok" },
        { name: "X", value: "X" },
        { name: "Facebook", value: "Facebook" }
      ]
    },
    {
      name: "style",
      description: "Research output style",
      type: 3, // STRING
      required: false,
      choices: [
        { name: "Wiki (citations)", value: "WIKI" },
        { name: "Narrative (clean)", value: "NARRATIVE" }
      ]
    }
  ]
};

export async function handleGenCommand(interaction: ChatInputCommandInteraction) {
  const persona = interaction.options.getString("persona", true) as PersonaType;
  const platform = interaction.options.getString("platform", true) as Platform;
  const style = (interaction.options.getString("style") ?? "NARRATIVE") as OutputStyle;

  await interaction.deferReply();

  const run = await fakeGenerateRun({ persona, platform, outputStyle: style });

  const embed = embedForRun(run);
  const rows = buttonsForRun(run);

  // Attach artifacts if they exist and are small enough
  const files = [];
  for (const a of run.artifacts) {
    try {
      // You can attach more later (images/videos). For now, attach the txt.
      // Check if file exists before attaching to avoid Discord API errors
      await fs.access(a.filePath);
      files.push({ attachment: a.filePath, name: path.basename(a.filePath) });
    } catch {
      // ignore
    }
  }

  // @ts-ignore - types might be strict about API objects vs Builders, but runtime supports it
  await interaction.editReply({
    embeds: [embed],
    components: rows,
    files,
  });
}

// ---- Button handling ----
export async function handleDiscordInteraction(i: Interaction) {
  if (!i.isButton()) return;

  const [ns, action, runId, arg] = i.customId.split(":");
  if (ns !== "gen") return;

  const run = inMemoryRuns.get(runId);
  if (!run) {
    await i.reply({ content: "Run not found (maybe restarted).", ephemeral: true });
    return;
  }

  // Variate / Upscale are placeholders until wired to ComfyUI + Orchestrator
  if (action === "variate") {
    await i.reply({ content: `✅ Variate queued for run ${runId} (${arg}).`, ephemeral: true });
    return;
  }

  if (action === "upscale") {
    await i.reply({ content: `✅ Upscale queued for run ${runId} (${arg}).`, ephemeral: true });
    return;
  }

  if (action === "save") {
    await i.reply({ content: `💾 Workflow saved for run ${runId} (MVP placeholder).`, ephemeral: true });
    return;
  }

  if (action === "copypack") {
    const lines: string[] = [];
    if (run.copyPack?.x?.length) lines.push("**X**\n" + run.copyPack.x.map(s => `• ${s}`).join("\n"));
    if (run.copyPack?.ig?.length) lines.push("**IG**\n" + run.copyPack.ig.map(s => `• ${s}`).join("\n"));
    if (run.copyPack?.blogSnippet) lines.push("**Blog snippet**\n" + run.copyPack.blogSnippet);

    await i.reply({ content: lines.join("\n\n") || "No copy pack yet.", ephemeral: true });
    return;
  }

  if (action === "rate") {
    const rating = Number(arg ?? "0");
    // TODO: write to DB performance_metrics + memory write-gate
    await i.reply({ content: `⭐ Rated ${rating}/5. Logged (MVP placeholder).`, ephemeral: true });
    return;
  }

  if (action === "cost") {
    // TODO: CFO agent report pulled from DB
    await i.reply({ content: `📊 Cost report for ${runId}: (wire CFO here).`, ephemeral: true });
    return;
  }

  if (action === "style") {
    run.outputStyle = run.outputStyle === "WIKI" ? "NARRATIVE" : "WIKI";
    inMemoryRuns.set(runId, run);

    const embed = embedForRun(run);
    const rows = buttonsForRun(run);

    // @ts-ignore
    await i.update({ embeds: [embed], components: rows });
    return;
  }

  await i.reply({ content: "Unknown action.", ephemeral: true });
}

// ---- Hook into your discord client ----
export function registerDiscordHandlers(client: Client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === "gen") {
        await handleGenCommand(interaction);
        return;
      }
      await handleDiscordInteraction(interaction);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (interaction.isRepliable()) {
        try {
          await interaction.reply({ content: `Error: ${msg}`, ephemeral: true });
        } catch {
          // ignore
        }
      }
    }
  });
}