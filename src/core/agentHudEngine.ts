export interface HudStep {
  id: string;
  agent: 'openclaw' | 'rea' | 'opencode';
  action: string;
  target: string;
  outcome: 'ok' | 'warn' | 'fail';
  tokens: number;
  durationMs: number;
  stateKind: 'dom' | 'disasm' | 'diff';
  statePreview: string;
  beforeSnippet?: string;
  afterSnippet?: string;
}

export interface HudSessionPreset {
  id: string;
  name: string;
  ecosystem: string;
  steps: HudStep[];
}

export const HUD_SESSIONS: HudSessionPreset[] = [
  {
    id: 'openclaw-os',
    name: 'openclaw Browser & OS Action Trace',
    ecosystem: 'openclaw · AutoGPT',
    steps: [
      { id: 's1', agent: 'openclaw', action: 'Navigate & Snapshot DOM', target: 'https://dashboard.local/billing', outcome: 'ok', tokens: 1840, durationMs: 420, stateKind: 'dom', statePreview: '<button data-testid="rotate-key">Rotate Signing Key</button>\n<status>Active Key: k_2026_01</status>' },
      { id: 's2', agent: 'openclaw', action: 'Click Interactive Element', target: '[data-testid="rotate-key"]', outcome: 'ok', tokens: 960, durationMs: 190, stateKind: 'dom', statePreview: '<modal role="dialog">Confirm rotation with 3600s grace window?</modal>' },
      { id: 's3', agent: 'openclaw', action: 'Patch Local Config File', target: 'config/keyring.json', outcome: 'ok', tokens: 1420, durationMs: 65, stateKind: 'diff', statePreview: 'Updated activeKeyId -> k_2026_02', beforeSnippet: '{\n  "activeKeyId": "k_2026_01",\n  "graceSec": 0\n}', afterSnippet: '{\n  "activeKeyId": "k_2026_02",\n  "graceSec": 3600\n}' },
      { id: 's4', agent: 'openclaw', action: 'Verify Health Probe', target: 'GET /api/health', outcome: 'ok', tokens: 780, durationMs: 88, stateKind: 'dom', statePreview: 'HTTP 200 OK · {"keyring":"k_2026_02","graceActive":true}' },
    ],
  },
  {
    id: 'rea-re',
    name: 'rea Binary Reverse-Engineering Call Graph',
    ecosystem: 'rea · deepseek-harness',
    steps: [
      { id: 'r1', agent: 'rea', action: 'Inspect Mach-O Load Image', target: 'vault_daemon (arm64)', outcome: 'ok', tokens: 2100, durationMs: 140, stateKind: 'disasm', statePreview: 'LC_SEGMENT_64 __TEXT 0x100000000..0x100048000\nEntry: _verify_ed25519_sig @ 0x100012a40' },
      { id: 'r2', agent: 'rea', action: 'Decompile Pseudo-C Procedure', target: '_verify_ed25519_sig', outcome: 'ok', tokens: 3420, durationMs: 610, stateKind: 'disasm', statePreview: 'int verify_ed25519_sig(uint8_t *msg, size_t len, uint8_t *sig) {\n  if (len == 0) return -1;\n  return crypto_sign_verify_detached(sig, msg, len, PUBKEY);\n}' },
      { id: 'r3', agent: 'rea', action: 'Trace Callers & Xrefs', target: '0x100012a40 -> 3 callers', outcome: 'warn', tokens: 1680, durationMs: 220, stateKind: 'disasm', statePreview: 'XREF 0x100014088: _handle_rpc_frame (missing length check)\nXREF 0x100018f10: _bootstrap_peer' },
    ],
  },
  {
    id: 'opencode-edit',
    name: 'opencode Parallel Multi-File Refactor',
    ecosystem: 'opencode · claw-code · superpowers',
    steps: [
      { id: 'o1', agent: 'opencode', action: 'Parallel Edit (worker-1)', target: 'src/rateLimit.ts', outcome: 'ok', tokens: 2240, durationMs: 310, stateKind: 'diff', statePreview: 'Switched fixed window -> atomic Lua ZSET', beforeSnippet: 'const count = await redis.incr(key);', afterSnippet: 'const rem = await redis.eval(SLIDING_LUA, 1, key, now, max);' },
      { id: 'o2', agent: 'opencode', action: 'Run Verification Suite', target: 'vitest run', outcome: 'fail', tokens: 1590, durationMs: 740, stateKind: 'diff', statePreview: 'FAIL expected 429, received 200 (missing ARGV[3])' },
      { id: 'o3', agent: 'opencode', action: 'Fix Lua Argument Count', target: 'src/rateLimit.ts', outcome: 'ok', tokens: 1380, durationMs: 240, stateKind: 'diff', statePreview: 'Passed crypto.randomUUID() as ARGV[3]', beforeSnippet: 'const rem = await redis.eval(SLIDING_LUA, 1, key, now, max);', afterSnippet: 'const rem = await redis.eval(SLIDING_LUA, 1, key, now, max, reqId);' },
    ],
  },
];

export function buildRevertPatch(step: HudStep): string {
  if (!step.beforeSnippet || !step.afterSnippet) {
    return `# Step "${step.action}" did not modify a text file (stateKind=${step.stateKind}).`;
  }
  const delLines = step.afterSnippet.split('\n').map((l) => `-${l}`);
  const addLines = step.beforeSnippet.split('\n').map((l) => `+${l}`);
  return [`--- a/${step.target}`, `+++ b/${step.target}`, `@@ -1,${delLines.length} +1,${addLines.length} @@`, ...delLines, ...addLines].join('\n');
}

export interface SkillNode {
  id: string;
  name: string;
  source: string;
  triggers: string[];
  tools: string[];
  handoffs: string[];
  x: number;
  y: number;
}

export interface SkillConflict {
  id: string;
  skillA: string;
  skillB: string;
  overlappingTriggers: string[];
  severity: 'conflict' | 'overlap';
  reason: string;
}

export const DEMO_SKILLS: SkillNode[] = [
  { id: 'sk-super', name: 'superpowers/plan-execute', source: 'superpowers', triggers: ['plan', 'refactor', 'implement', 'test'], tools: ['edit_file', 'run_command'], handoffs: ['sk-karp'], x: 70, y: 70 },
  { id: 'sk-ecc', name: 'ECC/tdd-architect', source: 'ECC', triggers: ['test', 'refactor', 'tdd', 'coverage'], tools: ['edit_file', 'run_command'], handoffs: ['sk-karp'], x: 70, y: 210 },
  { id: 'sk-karp', name: 'karpathy/minimal-diff', source: 'andrej-karpathy-skills', triggers: ['review', 'diff', 'guardrail', 'refactor'], tools: ['read_file'], handoffs: [], x: 380, y: 140 },
  { id: 'sk-rea', name: 'rea/binary-triage', source: 'rea', triggers: ['mach-o', 'elf', 'decompile', 'reverse'], tools: ['inspect_macho', 'procedure_pseudo_code'], handoffs: ['sk-hermes'], x: 70, y: 350 },
  { id: 'sk-hermes', name: 'hermes/subagent-router', source: 'hermes-agent', triggers: ['delegate', 'parallel', 'plan'], tools: ['invoke_subagent'], handoffs: ['sk-super', 'sk-matt'], x: 380, y: 300 },
  { id: 'sk-matt', name: 'mattpocock/ts-strict', source: 'mattpocock/skills', triggers: ['typescript', 'types', 'generics', 'refactor'], tools: ['edit_file'], handoffs: [], x: 670, y: 210 },
];

export function detectSkillConflicts(skills: SkillNode[]): SkillConflict[] {
  const conflicts: SkillConflict[] = [];
  for (let i = 0; i < skills.length; i++) {
    for (let j = i + 1; j < skills.length; j++) {
      const a = skills[i];
      const b = skills[j];
      const shared = a.triggers.filter((t) => b.triggers.includes(t));
      if (shared.length > 0) {
        conflicts.push({
          id: `${a.id}::${b.id}`,
          skillA: a.name,
          skillB: b.name,
          overlappingTriggers: shared,
          severity: shared.length >= 2 ? 'conflict' : 'overlap',
          reason:
            shared.length >= 2
              ? `High trigger collision on [${shared.join(', ')}] — both skills compete for routing.`
              : `Shared trigger keyword "${shared[0]}" — clarify precedence in SKILL.md frontmatter.`,
        });
      }
    }
  }
  return conflicts;
}

export interface GuardrailFinding {
  id: string;
  rule: string;
  severity: 'error' | 'warn';
  detail: string;
}

export function lintDiffAgainstGuardrails(diffText: string, allowedFiles: string[]): {
  score: number;
  findings: GuardrailFinding[];
  addedLines: number;
} {
  const lines = diffText.replace(/\r\n/g, '\n').split('\n');
  const findings: GuardrailFinding[] = [];
  let addedLines = 0;
  let currentFile = '';

  for (const line of lines) {
    const fm = /^\+\+\+\s+b\/(.+)$/.exec(line);
    if (fm) {
      currentFile = fm[1].trim();
      if (allowedFiles.length > 0 && !allowedFiles.some((af) => currentFile.endsWith(af))) {
        findings.push({
          id: `scope_${currentFile}`,
          rule: 'CLAUDE.md: Touch Only Requested Files',
          severity: 'error',
          detail: `Unrequested edit detected in "${currentFile}" (allowed scope: ${allowedFiles.join(', ')}).`,
        });
      }
      continue;
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      addedLines += 1;
      if (/class\s+\w*(Factory|Manager|Abstract|BaseStrategy|ProviderWrapper)/.test(line)) {
        findings.push({
          id: `abs_${addedLines}`,
          rule: 'Karpathy Rule: Avoid Premature Abstractions',
          severity: 'warn',
          detail: `Speculative wrapper/factory introduced: "${line.slice(1).trim().slice(0, 64)}"`,
        });
      }
      if (/TODO|FIXME|console\.log\(/.test(line)) {
        findings.push({
          id: `dbg_${addedLines}`,
          rule: 'Hygiene: No Stray Debug Logs / TODOs',
          severity: 'warn',
          detail: `Debug artifact added in ${currentFile || 'diff'}: "${line.slice(1).trim().slice(0, 64)}"`,
        });
      }
    }
  }

  if (addedLines > 40) {
    findings.push({
      id: 'bloat',
      rule: 'Karpathy Rule: Surgical Minimal Diff',
      severity: 'warn',
      detail: `Patch adds ${addedLines} lines for a targeted bugfix — check for unnecessary rewrites.`,
    });
  }

  const penalty = findings.reduce((s, f) => s + (f.severity === 'error' ? 28 : 14), 0);
  return { score: Math.max(15, 100 - penalty), findings, addedLines };
}

export const SAMPLE_GUARDRAIL_DIFF = `--- a/src/rateLimit.ts
+++ b/src/rateLimit.ts
@@ -1,4 +1,11 @@
+export abstract class AbstractRateLimitFactory {
+  abstract createStrategy(): unknown;
+}
 export function checkLimit(count: number, max: number) {
+  console.log("debugging rate limit", count);
   return count <= max;
 }
--- a/README.md
+++ b/README.md
@@ -1,2 +1,4 @@
 # Rate Limiter
+Unrequested formatting rewrite of documentation...`;

export interface FlameSegment {
  id: string;
  label: string;
  tokens: number;
  color: string;
  prunable: boolean;
}

export const DEFAULT_FLAME_SEGMENTS: FlameSegment[] = [
  { id: 'f1', label: 'System + CLAUDE.md', tokens: 5200, color: '#38bdf8', prunable: false },
  { id: 'f2', label: '14 Installed SKILL.md Frontmatters', tokens: 18400, color: '#a78bfa', prunable: true },
  { id: 'f3', label: 'MCP Tool JSON Schemas', tokens: 27600, color: '#f59e0b', prunable: true },
  { id: 'f4', label: 'Unpruned Bash / Test Stdout', tokens: 34200, color: '#f43f5e', prunable: true },
  { id: 'f5', label: 'Active Code Context', tokens: 16800, color: '#10b981', prunable: false },
];
