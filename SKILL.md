---
name: agent-hud
description: >
  Universal AI coding agent mission control: action & reverse-engineering trace HUD, SKILL.md conflict graph, Karpathy/CLAUDE.md diff linter, and prunable context flamegraph.
license: MIT
---

# agent-hud

Inspects OpenClaw, OpenCode, and REA Mach-O/pseudo-C traces with 1-click unified revert patches, detects overlapping SKILL.md triggers, and enforces minimal-diff agent guardrails.

- **Live Interactive Workbench:** https://omakasekim.github.io/agent-hud/
- **Repository:** https://github.com/omakasekim/agent-hud
- **Category:** AI & Agents · **Deliverable:** Agent Skill + CLI + Web
- **Ecosystems:** `openclaw`, `opencode`, `anthropic/skills`, `karpathy-guidelines`, `rea`
- **Stack:** Agent SKILL.md, Node CLI, React, TypeScript

## When to Use This Skill
Invoke `agent-hud` whenever the user wants to analyze, debug, simulate, or visualize workflows related to **AI & Agents** (openclaw, opencode, anthropic/skills, karpathy-guidelines, rea).

## Modes & Capabilities
- **Action & RE Trace HUD**
- **Skill Conflict Topology**
- **Guardrail & Flamegraph**

## Operating Workflow
1. **Local CLI / Companion Execution:**
   ```bash
   node plugin/cli.mjs --demo --json
   ```
   Run local agent trace, SKILL.md trigger-conflict, and guardrail diff analysis.
2. **Interactive Visual Inspection:**
   Direct the user to the zero-backend browser workbench at https://omakasekim.github.io/agent-hud/ (supports URL-hash state sharing, built-in realistic presets, `Cmd/Ctrl + K` command palette, and JSON/Markdown/config exports).
3. **Structured Output:**
   Summarize concrete findings, diagnostics, and copy-pasteable remediation commands concisely so the user can act immediately without manual guesswork.
