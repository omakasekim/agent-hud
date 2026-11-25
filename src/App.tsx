import { useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Bot,
  Check,
  Copy,
  Flame,
  Network,
  Pause,
  Play,
  ShieldAlert,
} from 'lucide-react';
import {
  buildRevertPatch,
  DEFAULT_FLAME_SEGMENTS,
  DEMO_SKILLS,
  detectSkillConflicts,
  HUD_SESSIONS,
  lintDiffAgainstGuardrails,
  SAMPLE_GUARDRAIL_DIFF,
  type SkillNode,
} from './core/agentHudEngine.ts';
import { decodeHashState, WorkbenchShell } from './components/WorkbenchShell.tsx';

type Mode = 'trace' | 'skills' | 'guardrail';

export function App() {
  const initial = useMemo(() => decodeHashState<{ mode?: Mode; sessionId?: string }>(), []);
  const [mode, setMode] = useState<Mode>(initial?.mode ?? 'trace');
  const [sessionId, setSessionId] = useState<string>(initial?.sessionId ?? HUD_SESSIONS[0].id);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [copiedPatch, setCopiedPatch] = useState(false);

  // Mode 2: Skill Topology
  const [skills, setSkills] = useState<SkillNode[]>(DEMO_SKILLS);
  const [selectedSkillId, setSelectedSkillId] = useState<string>(DEMO_SKILLS[0].id);

  // Mode 3: Karpathy Guardrail Linter + Token Flamegraph
  const [diffText, setDiffText] = useState(SAMPLE_GUARDRAIL_DIFF);
  const [allowedScope, setAllowedScope] = useState('src/rateLimit.ts');
  const [prunedIds, setPrunedIds] = useState<Set<string>>(() => new Set());

  const session = HUD_SESSIONS.find((s) => s.id === sessionId) ?? HUD_SESSIONS[0];
  const step = session.steps[Math.min(stepIdx, session.steps.length - 1)] ?? session.steps[0];
  const revertPatch = useMemo(() => (step ? buildRevertPatch(step) : ''), [step]);

  useEffect(() => {
    if (!playing || mode !== 'trace') return;
    const t = setInterval(() => {
      setStepIdx((prev) => (prev + 1 < session.steps.length ? prev + 1 : 0));
    }, 1500);
    return () => clearInterval(t);
  }, [playing, mode, session.steps.length]);

  const conflicts = useMemo(() => detectSkillConflicts(skills), [skills]);
  const selectedSkill = skills.find((s) => s.id === selectedSkillId) ?? skills[0];
  const guardrailReport = useMemo(
    () =>
      lintDiffAgainstGuardrails(
        diffText,
        allowedScope
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    [diffText, allowedScope],
  );

  const totalTokens = DEFAULT_FLAME_SEGMENTS.reduce((a, f) => a + f.tokens, 0);
  const activeTokens = DEFAULT_FLAME_SEGMENTS.filter((f) => !prunedIds.has(f.id)).reduce((a, f) => a + f.tokens, 0);
  const savedTokens = totalTokens - activeTokens;

  const buildSkillSvg = () => {
    const byId = new Map(skills.map((s) => [s.id, s]));
    const conflictPairs = new Set(conflicts.map((c) => `${c.skillA}::${c.skillB}`));
    const edgesSvg = skills
      .flatMap((s) =>
        s.handoffs.map((tid) => {
          const t = byId.get(tid);
          if (!t) return '';
          return `<line x1="${s.x + 110}" y1="${s.y + 34}" x2="${t.x + 110}" y2="${t.y + 34}" stroke="#a78bfa" stroke-width="2" stroke-opacity="0.7" />`;
        }),
      )
      .join('');
    const nodesSvg = skills
      .map((s) => {
        const hasConf = conflicts.some((c) => c.skillA === s.name || c.skillB === s.name);
        const stroke = hasConf ? '#f59e0b' : '#34d399';
        return `<g transform="translate(${s.x},${s.y})"><rect width="220" height="72" rx="10" fill="#0F172A" stroke="${stroke}" stroke-width="2" /><text x="12" y="24" fill="#f8fafc" font-family="monospace" font-size="11" font-weight="700">${s.name}</text><text x="12" y="44" fill="#94a3b8" font-family="monospace" font-size="9.5">${s.triggers.join(', ')}</text><text x="12" y="61" fill="${stroke}" font-family="monospace" font-size="9">${s.source}</text></g>`;
      })
      .join('');
    void conflictPairs;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="940" height="470"><rect width="100%" height="100%" fill="#070B14" />${edgesSvg}${nodesSvg}</svg>`;
  };

  return (
    <WorkbenchShell
      name="agent-hud"
      subtitle="Action & RE Trace HUD · SKILL.md Conflict Topology · Karpathy Guardrail Linter"
      badge="SKILL + CLI + WEB"
      accentHex="#a78bfa"
      icon={<Bot className="h-4 w-4" />}
      modes={[
        { id: 'trace', label: 'Action & RE Trace HUD', shortKey: '1' },
        { id: 'skills', label: 'Skill Conflict Topology', shortKey: '2' },
        { id: 'guardrail', label: 'Guardrail & Flamegraph', shortKey: '3' },
      ]}
      activeMode={mode}
      onModeChange={(id) => setMode(id as Mode)}
      getShareState={() => ({ mode, sessionId })}
      onTogglePlay={() => setPlaying((p) => !p)}
      onStep={(dir) => setStepIdx((i) => Math.max(0, Math.min(session.steps.length - 1, i + dir)))}
      onResetView={() => { setSkills(DEMO_SKILLS); setStepIdx(0); }}
      actions={[
        ...HUD_SESSIONS.map((s) => ({
          id: `sess-${s.id}`,
          label: `Load Session: ${s.name}`,
          group: 'Presets',
          run: () => { setMode('trace'); setSessionId(s.id); setStepIdx(0); },
        })),
      ]}
      exportBundle={{
        filenameBase: `agent-hud-${mode}`,
        svg: buildSkillSvg,
        markdown: () =>
          `# agent-hud Mission Report\n- Guardrail Score: **${guardrailReport.score}/100**\n- Skill Trigger Collisions: **${conflicts.length}**\n- Token Savings Simulated: **${savedTokens.toLocaleString()} tokens**\n\n## Guardrail Findings\n` +
          guardrailReport.findings.map((f) => `- **[${f.severity.toUpperCase()}]** ${f.rule}: ${f.detail}`).join('\n'),
        json: () => ({ session, conflicts, guardrailReport, activeTokens, savedTokens }),
        codeLabel: 'Step Revert Patch (.patch)',
        codeExt: 'patch',
        code: () => revertPatch,
      }}
    >
      {/* MODE 1: LIVE ACTION & RE TRACE HUD */}
      {mode === 'trace' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B] bg-[#0B1221] px-4 py-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {HUD_SESSIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setSessionId(s.id); setStepIdx(0); setPlaying(false); }}
                  className={`rounded-md border px-2.5 py-1 ${
                    sessionId === s.id ? 'border-violet-500/60 bg-violet-500/15 font-semibold text-violet-200' : 'border-[#1E293B] bg-[#0F172A] text-slate-300'
                  }`}
                >
                  {s.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="ml-2 inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-200"
              >
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{playing ? 'Pause' : 'Play HUD'}</span>
              </button>
            </div>
            <span className="font-mono text-[11px] text-violet-300">{session.ecosystem}</span>
          </div>

          <div className="grid flex-1 overflow-hidden lg:grid-cols-[0.9fr_1.35fr]">
            <section className="space-y-2 overflow-y-auto border-r border-[#1E293B] p-4">
              {session.steps.map((st, idx) => {
                const active = idx === stepIdx;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => { setPlaying(false); setStepIdx(idx); }}
                    className={`block w-full rounded-xl border p-3.5 text-left transition ${
                      active ? 'border-violet-400 bg-violet-500/10' : 'border-[#1E293B] bg-[#0F172A] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-bold text-violet-300">#{idx + 1} · {st.agent}</span>
                      <span className={st.outcome === 'fail' ? 'text-rose-400' : st.outcome === 'warn' ? 'text-amber-300' : 'text-emerald-400'}>
                        {st.outcome.toUpperCase()} · {st.durationMs}ms
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-100">{st.action}</div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-slate-400">{st.target} · {st.tokens} tok</div>
                  </button>
                );
              })}
            </section>

            <section className="flex flex-col space-y-4 overflow-y-auto bg-[#0F172A] p-5">
              {step && (
                <>
                  <div className="rounded-xl border border-[#1E293B] bg-[#070B14] p-4">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="rounded bg-violet-500/15 px-2 py-0.5 font-bold uppercase text-violet-300">{step.stateKind} state</span>
                      <span className="text-slate-400">{step.tokens} tokens · {step.durationMs}ms</span>
                    </div>
                    <h2 className="mt-2 text-base font-bold text-slate-50">{step.action}</h2>
                    <div className="font-mono text-xs text-cyan-300">{step.target}</div>
                    <pre className="mt-3 overflow-x-auto rounded-lg border border-[#1E293B] bg-[#0F172A] p-3 font-mono text-xs text-slate-200">
                      {step.statePreview}
                    </pre>
                  </div>

                  <div className="rounded-xl border border-[#1E293B] bg-[#070B14] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">1-Click Revert Patch</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(revertPatch);
                            setCopiedPatch(true);
                            setTimeout(() => setCopiedPatch(false), 1500);
                          } catch {}
                        }}
                        className="inline-flex items-center gap-1 rounded border border-[#1E293B] bg-[#0F172A] px-2 py-0.5 font-mono text-[11px] text-cyan-300"
                      >
                        {copiedPatch ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />} Copy Patch
                      </button>
                    </div>
                    <pre className="mt-2.5 overflow-x-auto rounded-lg border border-[#1E293B] bg-[#0F172A] p-3 font-mono text-xs text-emerald-200">
                      {revertPatch}
                    </pre>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      )}

      {/* MODE 2: SKILL TRIGGER & CONFLICT TOPOLOGY */}
      {mode === 'skills' && (
        <div className="grid flex-1 overflow-hidden lg:grid-cols-[1.35fr_0.9fr]">
          <section className="relative overflow-auto border-r border-[#1E293B] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:22px_22px] p-5">
            <div className="mb-3 flex items-center justify-between rounded-xl border border-[#1E293B] bg-[#0F172A]/90 px-4 py-2 text-xs">
              <span className="flex items-center gap-2 font-bold text-slate-100">
                <Network className="h-4 w-4 text-violet-400" /> SKILL.md Trigger &amp; Subagent Handoff Topology
              </span>
              <span className="font-mono text-amber-300">{conflicts.length} trigger overlap(s) detected</span>
            </div>

            <div className="relative h-[460px] min-w-[900px]">
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {skills.flatMap((s) =>
                  s.handoffs.map((tid) => {
                    const t = skills.find((x) => x.id === tid);
                    if (!t) return null;
                    return (
                      <path
                        key={`${s.id}-${tid}`}
                        d={`M ${s.x + 220} ${s.y + 38} C ${s.x + 280} ${s.y + 38}, ${t.x - 60} ${t.y + 38}, ${t.x} ${t.y + 38}`}
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="2"
                        className="edge-flow"
                      />
                    );
                  }),
                )}
              </svg>
              {skills.map((s) => {
                const hasConf = conflicts.some((c) => c.skillA === s.name || c.skillB === s.name);
                const sel = selectedSkill?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSkillId(s.id)}
                    style={{ left: s.x, top: s.y, width: 224 }}
                    className={`absolute rounded-xl border bg-[#0F172A]/95 p-3 text-left transition ${
                      hasConf ? 'border-amber-500/70' : 'border-emerald-500/50'
                    } ${sel ? 'ring-2 ring-violet-400' : ''}`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-slate-400">{s.source}</span>
                      <span className={hasConf ? 'text-amber-300' : 'text-emerald-400'}>{hasConf ? 'OVERLAP' : 'CLEAN'}</span>
                    </div>
                    <div className="mt-1 truncate font-mono text-xs font-bold text-slate-50">{s.name}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.triggers.map((t) => (
                        <span key={t} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-cyan-300">{t}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="space-y-4 overflow-y-auto bg-[#0F172A] p-5">
            {selectedSkill && (
              <div className="rounded-xl border border-[#1E293B] bg-[#070B14] p-4 space-y-2">
                <div className="font-mono text-xs text-violet-300">{selectedSkill.source}</div>
                <h2 className="font-mono text-base font-bold text-slate-50">{selectedSkill.name}</h2>
                <div className="text-xs text-slate-400">Tools bound: {selectedSkill.tools.join(', ')}</div>
              </div>
            )}

            <div className="space-y-2 rounded-xl border border-[#1E293B] bg-[#070B14] p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                <ShieldAlert className="h-4 w-4" /> Trigger Collisions ({conflicts.length})
              </div>
              {conflicts.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-lg border p-3 text-xs ${
                    c.severity === 'conflict' ? 'border-rose-500/50 bg-rose-500/10 text-rose-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                  }`}
                >
                  <div className="font-mono font-bold">{c.skillA} ↔ {c.skillB}</div>
                  <div className="mt-1 opacity-90">{c.reason}</div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* MODE 3: KARPATHY GUARDRAIL LINTER & TOKEN FLAMEGRAPH */}
      {mode === 'guardrail' && (
        <div className="grid flex-1 overflow-hidden lg:grid-cols-2">
          <section className="flex flex-col space-y-4 overflow-y-auto border-r border-[#1E293B] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-violet-300">
                Karpathy &amp; `CLAUDE.md` Guardrail Diff Auditor
              </h2>
              <span className={`font-mono text-sm font-extrabold ${guardrailReport.score >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                Score {guardrailReport.score}/100
              </span>
            </div>

            <label className="block text-xs text-slate-400">
              Allowed file scope (comma-separated):
              <input
                value={allowedScope}
                onChange={(e) => setAllowedScope(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#1E293B] bg-[#0F172A] px-3 py-1.5 font-mono text-xs text-cyan-200"
              />
            </label>

            <textarea
              value={diffText}
              onChange={(e) => setDiffText(e.target.value)}
              spellCheck={false}
              className="h-52 w-full resize-none rounded-xl border border-[#1E293B] bg-[#0F172A] p-3.5 font-mono text-xs leading-5 text-slate-200"
            />

            <div className="space-y-2">
              {guardrailReport.findings.map((f) => (
                <div
                  key={f.id}
                  className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                    f.severity === 'error' ? 'border-rose-500/50 bg-rose-500/10 text-rose-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                  }`}
                >
                  {f.severity === 'error' ? <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                  <div>
                    <div className="font-bold">{f.rule}</div>
                    <div className="mt-0.5 opacity-90">{f.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col space-y-4 overflow-y-auto bg-[#0F172A] p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Flame className="h-4 w-4" /> Interactive Context / Token Flamegraph
              </h2>
              <span className="font-mono text-xs text-emerald-400">
                Active: {(activeTokens / 1000).toFixed(1)}k · Saved: {(savedTokens / 1000).toFixed(1)}k tok
              </span>
            </div>

            <div className="flex h-8 w-full overflow-hidden rounded-xl border border-[#1E293B] bg-[#070B14]">
              {DEFAULT_FLAME_SEGMENTS.map((seg) => {
                if (prunedIds.has(seg.id)) return null;
                return (
                  <div
                    key={seg.id}
                    title={`${seg.label}: ${seg.tokens.toLocaleString()} tokens`}
                    style={{ width: `${(seg.tokens / totalTokens) * 100}%`, backgroundColor: seg.color }}
                    className="h-full transition-all"
                  />
                );
              })}
            </div>

            <div className="space-y-2.5">
              {DEFAULT_FLAME_SEGMENTS.map((seg) => {
                const pruned = prunedIds.has(seg.id);
                return (
                  <div
                    key={seg.id}
                    className={`flex items-center justify-between rounded-xl border p-3.5 transition ${
                      pruned ? 'border-[#1E293B] bg-[#070B14]/40 opacity-50' : 'border-[#1E293B] bg-[#070B14]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: seg.color }} />
                      <div>
                        <div className="text-xs font-bold text-slate-100">{seg.label}</div>
                        <div className="font-mono text-[11px] text-slate-400">{seg.tokens.toLocaleString()} tokens ({Math.round((seg.tokens / totalTokens) * 100)}%)</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!seg.prunable}
                      onClick={() =>
                        setPrunedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(seg.id)) next.delete(seg.id);
                          else next.add(seg.id);
                          return next;
                        })
                      }
                      className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold ${
                        !seg.prunable
                          ? 'cursor-not-allowed border-slate-700 text-slate-500'
                          : pruned
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                            : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                      }`}
                    >
                      {!seg.prunable ? 'LOCKED' : pruned ? 'Restore' : 'Prune'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </WorkbenchShell>
  );
}

export default App;
