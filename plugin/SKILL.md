---
name: agent-hud
description: Autonomous agent action/RE trace HUD, SKILL.md trigger conflict topology, and Karpathy guardrail diff linter
---

# agent-hud Agent Skill

## Usage
Run the local trace & guardrail analyzer:

```bash
node plugin/cli.mjs --demo
```

## Capabilities
- Parses local JSONL coding agent transcripts & tool calls
- Audits SKILL.md trigger overlap across installed skills
- Flags unrequested edits and over-engineered abstractions against CLAUDE.md guardrails
