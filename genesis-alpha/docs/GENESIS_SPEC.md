# Genesis (RUBY) — North Star + Spec (AI Studio Output → Antigravity → Codex)

This repo is the **MVP scaffold** for a self-evolving, containerized Multi‑Agent System (MAS) called **Genesis** (code‑named **RUBY**), built under the **Model Context Protocol (MCP)** umbrella.

The **non‑negotiable** is persistence: all long‑lived state must survive restarts via `/workspace` (or an attached volume mapped to the host).

---

## 0) North Star (what we’re actually building)

**Outcome:** turn content into booked calls (and upsells) with a measurable flywheel.

**Primary KPI:** booked calls  
**Unit economics constraint:** the system must teach the human operator to climb above **$7/hour effective rate** using CFO feedback (time → cost → profit).  
This is already modeled in `src/agents/cfo.ts`.

---

## 1) Runtime Architecture (MCP)

### Brain vs. Servers
- **Brain** = Gemini/OpenRouter model(s) producing plans, copy, ComfyUI prompts, and tool calls.
- **Servers** = MCP Tools: Memory (Postgres+pgvector), Workflow store, CFO ledger, Scout selector map, Research ingestor.

### Why MCP matters
MCP forces the brain to:
1) query memory (persona + platform + past wins)  
2) act with tools (generate, overlay, post, track)  
3) store outcomes (metrics)  
4) evolve style embeddings (feedback loop)

---

## 2) Persistence model (Hot/Warm/Cold memory)

You asked for compaction and cost‑efficient memory retention (7 → 15 → 30 days etc). Here’s the policy:

### Hot (0–7 days)
- Store: raw events, prompts, platform results
- Reason: debugging + fast iteration

### Warm (8–30 days)
- Store: **summaries** of runs + “why it worked” notes
- Raw event logs get compacted (daily job)

### Cold (31+ days)
- Store: rollups + only high‑value memory items (high importance, high ROI)
- Optional: export cold memory to cheaper storage, but keep vectors in PG if needed for retrieval

**Implementation hook:** nightly compaction worker:
- `events` → `memory_items(category='run_summary')`
- `selector_map` stays uncompressed (it’s operational truth)
- `performance_metrics` stays (numbers are small)

---

## 3) Personas (The Chameleon)

Personas are **data**, not code.

Minimum required personas:
- `Ruby` (composed authority, minimal, elegant)
- `Streamer` (audience-building + “build in public”)
- `ContentManager` (fast production, turbo‑mode)

The Ruby persona must follow the brand guidelines in `docs/ruby_brand_guidelines.md`.

---

## 4) Agent swarm (current MVP + what’s missing)

### What exists (MVP stubs from AI Studio)
- **Orchestrator**: starts campaign, calls culture + CFO + Visual Engineer (`src/agents/orchestrator.ts`)
- **CFOAgent**: tracks human time + GPU/model cost + revenue estimate and reports health (`src/agents/cfo.ts`)
- **PlatformCultureExpert**: safe zones + tone rules by platform (`src/agents/platform_culture.ts`)
- **VisualEngineer**: constructs ComfyUI workflow JSON and provides text-overlay metadata (`src/agents/visual_engineer.ts`)
- **Discord “Midjourney-style” UX**: run cards, variate/upscale/save/rate, wiki vs narrative toggle (`src/discord/interaction_handler.ts`)
- **MCP server concept**: tool routing stub (`src/mcp/server.ts`)

### What’s missing (next build in Antigravity/Codex)
1) **Real DB-backed memory + workflows** (schema is now in `schema.sql`)
2) **Write‑Gate (“Memory Steward”)** so the system doesn’t store garbage
3) **Node-canvas overlay engine** that takes:
   - base image/video frame
   - safe zones from PlatformCultureExpert
   - copy blocks
   - outputs a final asset
4) **Research ingestion** (PDF/TXT → chunks → embeddings → citations)
5) **Scout agent** (Playwright + self‑healing selector map) wired to the DB
6) **Persona evolution loop** (`evolve_persona(persona_id, feedback_data)`)

---

## 5) Discord UX: how the user sees content (no more “where is it?”)

Discord is the primary UI. The user sees:

1) `/gen persona:Ruby platform:Instagram style:NARRATIVE`
2) Bot responds with a **Run Card embed** (persona/platform/budget/style) + buttons
3) Bot attaches artifacts (for MVP: `copy_pack.txt`; later: images, videos, PDFs)

Artifacts are written to:
- `WORKSPACE_DIR=/workspace/artifacts/<runId>/...`

So the user’s loop is:
- Generate → inspect assets in Discord → variate/upscale → rate → save workflow

**Critical fix for restarts:** in-memory `Map` must be replaced with DB `runs` table.

---

## 6) Platform culture: why “context of place/time” matters

`PlatformCultureExpert` currently returns:
- format ratio
- pacing expectations
- safe zones
- tone rules

Next: add “post windows” and **locale tuning** (US market vs LATAM).  
This module is what stops “TikTok logic” from leaking into X.

---

## 7) CFO agent: profitability + time conversion

CFOAgent’s current logic:
- baseline hourly = **$7**
- upsell value default = **$75** (avg $50–$100)
- effective hourly rate = (revenue - costs) / human_hours

**Next steps (Codex):**
- Replace the internal metrics with DB-backed `cfo_ledger`
- Add ad spend + CAC tracking
- Add “recommendations” that change generation strategy:
  - degrade model tier (DeepSeek lite)
  - reduce variants
  - reduce GPU steps / switch to turbo
  - pause posting if STOP threshold hit

---

## 8) Neovim protocol for JSON graphs (ComfyUI workflows)

You asked for a “Neovim protocol” so editing ComfyUI JSON is fast and structured.

Practical implementation:
- store graphs in DB (`workflows.graph_json`)
- edits are applied as **JSON Patch** (RFC 6902) or **JSON Merge Patch**
- optional: Neovim integration via `msgpack-rpc`:
  - a small Node service exposes: `open_workflow(name)`, `apply_patch(patch)`, `save_workflow()`
  - Neovim plugin just calls the service and opens a temp buffer
This keeps the “protocol” clean without overcomplicating MVP.

---

## 9) Research ingestion: PDF/TXT → Wiki vs Narrative

Goal: create content from deep research (trending topic, ritual concept, etc.) with two modes:

### Narrative mode (clean)
- no citations shown
- outputs are smooth + readable

### Wiki mode (citations)
- each claim has references to chunk IDs (or URLs) from `memory_items.evidence_json`
- output feels like a small internal wiki page

Pipeline:
1) ingest file → chunk
2) embed chunks → store as `memory_items(category='research_chunk')`
3) generation step chooses mode:
   - NARRATIVE: synthesize only
   - WIKI: synthesize + cite chunks

---

## 10) Deployment: first alpha (Runpod vs DigitalOcean vs Kaggle)

### Local / Dev
- `docker compose up`
- confirm Postgres + MCP server + orchestrator boots

### Runpod (GPU)
Use this when ComfyUI is in the loop. Choose a GPU that fits:
- SDXL: midrange GPU is fine
- Flux: needs more VRAM; prioritize VRAM over raw TFLOPS

### DigitalOcean (CPU)
Perfect for:
- Discord bot
- MCP server
- Postgres
- Scout (browserless)
But **not** ideal for heavy image generation unless you offload GPU.

### Kaggle (audience flywheel / free compute)
Use it for:
- demo notebooks
- stream “watchers” who don’t want to pay yet
- BUT keep the canonical state in your repo + DB elsewhere (Kaggle sessions are ephemeral)

---

## 11) “Genesis Prompt” for AI Studio (the improved master prompt)

Below is the version you can run in AI Studio.  
It **builds on top of** your original without deleting it — it adds:
- Memory Steward + compaction policy
- CFO agent enforcement (baseline $7/hr)
- Research ingestion modes
- Discord UX clarity + artifact storage
- Platform culture/time context
- Neovim JSON patch protocol
- Node-canvas overlay requirement

### SYSTEM PROMPT (paste into AI Studio)

```text
System Prompt: The "Genesis" Content Engine Architecture (MCP-first)
Role: You are a Principal AI Architect and Full-Stack Engineer. You are building a self-evolving, containerized Multi-Agent System (MAS) named "Genesis" (Code-named: RUBY).

Deployment Context:
Initial: Runpod (GPU-accelerated Docker containers).
Future: Digital Ocean (Standard Droplet).
Optional: Kaggle notebooks for free audience demos (ephemeral runtime; canonical state stays in repo + DB).
Core constraint: Persistence. All memory/models/artifacts must reside in /workspace volumes to survive restarts.

The Architecture: Model Context Protocol (MCP)
The system must be built on MCP. The "Brain" (Gemini/OpenRouter) interacts with "Servers" (Tools/Memory) via a standardized protocol.

Part 0: The North Star (Unit Economics)
Primary KPI: booked calls that lead to a quantum manifestation upsell ($50–$100; default $75).
CFO Baseline: system must improve the operator beyond $7/hour effective rate.
Create a CFO agent that measures:
- human minutes
- model cost
- gpu cost
- ad spend
- booked calls
- estimated revenue
and returns HEALTHY/WARNING/STOP with recommendations (degrade model tier, reduce variants, change ComfyUI settings, pause spend).

Part 1: The "Jewel" (Memory & State)
Technology: PostgreSQL with pgvector + MCP Server Interface.
Task: define DB schema and MCP resource handlers.

Dynamic Persona Storage (The Chameleon):
Instead of hardcoding Ruby, store Brand Personas (Vectors + JSON).
Minimum personas: Ruby, Streamer, ContentManager. Support creating more (IG influencer, News Anchor).
RAG: when generating, query vector DB for active persona guidelines + any relevant platform culture constraints.

Memory Steward (Write-Gate) + Compaction:
Add a Memory Steward agent that decides what is worth storing.
Retention tiers:
- Hot: 0–7 days raw events (debug)
- Warm: 8–30 days compacted summaries
- Cold: 31+ days rollups and only high-importance items
Implement daily compaction jobs: events -> memory_items(category='run_summary').
Old events may be pruned after successful compaction.

Evolution Loop (Feedback):
Table: performance_metrics.
Inputs: human ⭐ rating and/or scraped engagement.
Requirement: create function evolve_persona(persona_id, feedback_data) that adjusts embedding weights and writes a short style delta note.

Part 2: The Agent Swarm (The "Actors")
The Main Orchestrator spawns agents based on user intent and platform context.
Agents must reason about platform culture (TikTok vs X vs Instagram) AND time windows.

1) The Interface (The Architect)
Primary UI: Discord Bot (Midjourney-style).
Optional Phase-0: CLI to simplify MVP before full Discord build.
UX requirements:
- Run Card embed shows persona/platform/goal/budget/status/style
- Buttons: [V1 Variate], [U1 Upscale], [Save Workflow], [Copy Pack], [Rate ⭐⭐⭐⭐⭐], [Report Cost], [Toggle Wiki/Narrative]
Artifacts must be stored to /workspace/artifacts/<runId>/ and attached in Discord.

2) The Visual Engineer (ComfyUI + Ad Specialist)
Dynamic Workflows: do not just load JSON; construct/edit graphs programmatically.
If Persona == Streamer: inject Flux LoRA realism / flux model.
If Persona == Ruby: inject SDXL minimalist / zen LoRA.
If Persona == ContentManager: use speed mode (sdxl-turbo).
Ad Creator:
- calculate layout per platform (IG story 9:16, FB feed 1:1, etc.)
- use node-canvas (or sharp) to draw text overlays
- identify safe zones (via platform constraints + optional Vision-based saliency)
- output final image/video asset + overlay metadata.

3) The Scout (Playwright + Vision)
Role: Hands & Eyes.
Self-healing loop:
- try selector
- on failure: screenshot -> ask Brain "where is the post button?" -> update selector_map in DB -> retry

4) The Research Ingestor (PDF/TXT -> Wiki/Narrative)
User can upload a PDF/TXT deep research file.
Pipeline:
- chunk -> embed -> store memory_items(category='research_chunk', evidence_json includes chunk_id/page)
Output modes:
- WIKI: citations required (chunk references)
- NARRATIVE: no citations shown, clean synthesis

Part 3: Execution Instructions (The Output)
Generate / update the following files:
- docker-compose.yml: services (orchestrator, comfyui, postgres-vector, browserless-chrome, mcp-server) with /workspace persistence
- schema.sql: tables for personas, workflows, runs, memory_items, events, performance_metrics, cfo_ledger, selector_map
- src/mcp/server.ts: TypeScript MCP server exposing Brand Memory, Workflow Tools, Research tools, CFO audit
- src/agents/orchestrator.ts: spawns agents; enforces platform constraints; records events; writes artifacts
- src/agents/cfo.ts: cost/time/profit monitor with HEALTHY/WARNING/STOP
- src/agents/visual_engineer.ts: dynamic ComfyUI graph editing + node-canvas overlay step
- src/agents/platform_culture.ts: platform culture constraints + post windows
- src/discord/interaction_handler.ts: Midjourney-style buttons + Save Workflow + Rating -> performance_metrics

Important Implementation Details:
- Language: TypeScript (strict)
- AI Provider: standard OpenAI SDK format (OpenRouter/Gemini compatible)
- Error handling: on ComfyUI failure, read logs and self-correct node params
- Git hygiene: all secrets in .env; never commit /workspace artifacts; store big models outside repo.

Guidance for the Human Pilot:
- Use ⭐ rating after each run (early loop)
- CFO report tells you where your time is being wasted and which variants to stop
- PlatformCulture prevents cross-platform tone mismatch
- Migration: because MCP + Docker, moving to DO is copy folder + docker compose up
```

---

## 12) Repo hygiene (Git)

Add `.gitattributes` to reduce CRLF warnings:
- `* text=auto`

Windows warning about LF→CRLF is normal. It won’t break the project.

---

## 13) Next step: what to commit *right now*

Commit this bundle (it restores your “north star”):
- `docs/GENESIS_SPEC.md` (this file)
- `schema.sql` (real schema)
- the MVP TS files + docker-compose.yml

Then Antigravity refines and Codex turns MVP stubs into real services.

---

**File generated:** docs/GENESIS_SPEC.md
Generated at: 2025-12-26T19:14:27.499224Z
