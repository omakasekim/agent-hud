# agent-hud

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-a78bfa?style=flat-square)](https://aetherx86.github.io/agent-hud/)
[![Plugin: SKILL.md + CLI](https://img.shields.io/badge/Plugin-SKILL.md%20%2B%20CLI-10b981?style=flat-square)](plugin/SKILL.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-38bdf8?style=flat-square)](LICENSE)

> **Universal Agent Skill, Action Timeline & Guardrail Mission Control.**

## Covered Top-50 GitHub Ecosystems
| Ecosystem | Capability in `agent-hud` |
| :--- | :--- |
| `openclaw`, `AutoGPT`, `opencode`, `claw-code` | Live Action Timeline HUD with DOM/diff state cards and 1-click unified revert patches |
| `rea`, `deepseek-harness` | Binary reverse-engineering Mach-O / Pseudo-C / Xref inspection trace replay |
| `superpowers`, `ECC`, `hermes-agent`, `mattpocock/skills`, `anthropics/skills` | Interactive `SKILL.md` trigger collision & subagent handoff topology graph |
| `andrej-karpathy-skills` | Diff guardrail linter flagging unrequested file touches, premature abstractions, and token bloat flamegraph |

## 1-Step Plugin Install (`SKILL.md` + CLI Hook)
```bash
node plugin/cli.mjs --demo --json
```
Copy `plugin/SKILL.md` into your agent's skills directory to activate guardrail auditing.

## Architecture
```mermaid
flowchart LR
  LOG[Agent JSONL / RE Trace] --> HUD[Action Timeline & Revert Patcher]
  SK[SKILL.md Frontmatter] --> TOPO[Trigger Conflict Graph]
  DIFF[Proposed Patch + CLAUDE.md] --> LINT[Karpathy Guardrail Linter + Token Flamegraph]
```
