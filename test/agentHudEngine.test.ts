import { describe, expect, it } from 'vitest';
import {
  buildRevertPatch,
  DEMO_SKILLS,
  detectSkillConflicts,
  HUD_SESSIONS,
  lintDiffAgainstGuardrails,
  SAMPLE_GUARDRAIL_DIFF,
} from '../src/core/agentHudEngine.ts';

describe('agent-hud trace, skill conflict & guardrail engine', () => {
  it('detects overlapping SKILL.md frontmatter triggers across ecosystems', () => {
    const conflicts = detectSkillConflicts(DEMO_SKILLS);
    expect(conflicts.length).toBeGreaterThanOrEqual(4);
    expect(conflicts.some((c) => c.severity === 'conflict')).toBe(true);
  });

  it('flags unrequested file edits and premature abstractions against Karpathy/CLAUDE.md rules', () => {
    const report = lintDiffAgainstGuardrails(SAMPLE_GUARDRAIL_DIFF, ['src/rateLimit.ts']);
    expect(report.score).toBeLessThan(70);
    expect(report.findings.some((f) => f.rule.includes('Touch Only Requested Files'))).toBe(true);
    expect(report.findings.some((f) => f.rule.includes('Premature Abstractions'))).toBe(true);
  });

  it('builds valid unified revert patches for file-modifying steps', () => {
    const patch = buildRevertPatch(HUD_SESSIONS[0].steps[2]);
    expect(patch).toContain('--- a/config/keyring.json');
    expect(patch).toContain('"activeKeyId": "k_2026_01"');
  });
});
