# Progression Analytics — Design Plan

> Multi-PR roadmap. This doc captures functional requirements and strategic decisions; per-PR design happens in its own conversation.

## Context

Today the parseboard shows only best-kill parse percentiles (≤9 data points per boss). That's "who had the prettiest kill" — weak signal for progression. Most of the officer-relevant signal lives in wipe data: who survives deeper, who bricks pulls, who dies with defensives available.

We want pull-level analytics sourced from WCL reports, comparing players across wipes and kills. The hardest design constraint is honesty: we call wipes verbally, players die intentionally as part of the plan, some hold out to rez, some jump immediately. Scoring to literal fight end punishes the wrong people.

**The pipeline is fundamentally different from today's.** The existing parse sync (`apps/api/src/jobs/syncParses.ts`) queries WCL per-character for zone rankings — a pull-by-player model. Progression ingestion is pull-by-report: discover reports via `guildData`, walk fights within a report, attribute stats to players from inside the report. The per-character rankings path stays (for the existing kill-parse scatter); progression is an entirely new, parallel pipeline.

**Live logging is first-class.** We log live to WCL during raids — fights stream into the report as they happen. The system must refresh active reports during a raid (not just after the night), ingest new fights as they appear, and mark reports `provisional` until they quiesce. This means discovery runs on a higher cadence during raid time and a lower cadence otherwise, and every ingest is incremental by fight ID.

**Success** = officers can answer three questions per player per boss from real data: _do they live deep enough? do they press their buttons? do they hurt prog_ — and see it update during the raid, not two days later.

## Strategic Decisions

### Ingestion

- **Single discovery source: the guild.** Use WCL `guildData.reports`, not per-character enumeration. This is a new pipeline entirely — the existing per-character zone-rankings sync (`apps/api/src/jobs/syncParses.ts`) stays untouched and continues to feed the kill-parse scatter.
- **Live-aware refresh model.** Every report has a `provisional` flag. Discovery runs on two cadences:
    - **Live cadence** (every 2–5 min) while any report's `end_time` is within the last ~15 min or is still advancing between fetches. Only refetches fights + spine for live reports.
    - **Idle cadence** (hourly or admin-triggered) when no report is live. Sweeps for late uploads with a 24–48h overlap watermark.
    - A report becomes `final` when its `end_time` stops advancing for N minutes or falls outside the raid window.
- **Incremental by fight ID.** On every refresh of a live report, fetch the fights list and only ingest fights whose `fight_id` is new or whose `end_time` changed (in-flight fight). The report spine itself is upserted; raw cache is versioned by fetch timestamp.
- **Idempotent pull-level ingest.** Natural keys: `report_code`, `(report_code, fight_id)`, `(report_code, fight_id, actor_id)`. Every operation is safe to replay.
- **Raw payload cache, season-scoped.** JSONB in Neon keyed by `(report_code, source_type, fetched_at)` for live — only the latest kept per `(report_code, source_type)` once the report is final. Purge at tier end. Lets us recompute metrics when logic changes without re-hitting WCL.
- **Layered fetch** — always fetch the spine (report, fights, masterData); fetch pull tables (deaths/damageTaken/casts/interrupts/dispels/summary) only for fights classified `PROGRESSION` in existing `FightConfig`; event windows on demand only.
- **Rate-limit budget.** Guild has the WCL Platinum plan (18,000 points/hour). Even an aggressive live cadence (30 polls/hour × spine + per-fight tables) stays an order of magnitude under the cap. We'll still include a per-minute cap as a defensive guard, but rate limits are not a practical design constraint.
- **`metric_version` column** on all derived facts. Logic changes bump the version and trigger local recompute, not re-fetch.
- **Admin-triggered first, cron later.** Reuse existing admin sync pattern (`POST /api/sync/*`, `apps/web/src/pages/admin/AdminSyncs.tsx`). Live cadence runs as a server-side interval once the pipeline proves stable.

### Identity & config

- **Store IDs, not names.** `ability_id` and `npc_game_id` from WCL `masterData`. Let admins _enter_ spell/mob names; resolve to IDs and persist both. Names are localized and unstable; IDs are not.
- **Actor stitching across reports** via player GUID (stable across reports) mapped back to `Character.wowauditId`. Add a `characterActor` mapping table keyed by `(report_code, actor_id) → character_id`.
- **Tiny fight config.** Extend `FightConfig` with (eventually) JSON for: priority targets, avoidable abilities, checkpoints. V1 keeps config empty — metrics are zero-config.

### The wipe-call problem

- **Never score to observed fight end.** All prog metrics score to `effective_prog_end_ts`, a derived timestamp on each fight.
- **Heuristic + admin override.** Two-of-three signals (boss/priority-target DPS collapse, critical-role viability break, death cluster within short window). Officer can override per-fight in admin UI; override is authoritative and versioned.
- **Death classification** on each `player_fight_fact`: `PROG_RELEVANT | WIPE_COLLAPSE | POST_WIPE_EXIT | RESET_ROLE_HOLDOUT`. Deaths and avoidable damage after `effective_prog_end` are stored and shown but not penalized.
- **Metric scoring scope** is declared per metric: `UNTIL_EFFECTIVE_PROG_END` (default), `FULL_PULL`, `WITHIN_WINDOW`, `KILL_ONLY`.

### Comparisons & stats

- **Role-normalized comparisons.** Always compare within role/spec or within a player's own last 10–20 pulls. Never a global leaderboard across roles.
- **Rolling medians and rates, not averages.** Coefficient of variation for consistency. % of pulls above an "acceptable" threshold as a readable stat.
- **Pull-depth buckets** derived from `fight.bossPercentage` and observed `phaseTransitions`. Same player's 78% wipe and 9% wipe never compared directly.

### v1 metrics (zero-config)

Three metrics in the first user-facing phase:

1. **Survival Depth** — `min(death_ts, effective_prog_end_ts)` → boss % remaining. Rolling median per player/boss.
2. **Early Brick Rate** — % of pulls where player dies before first observed phase transition (or first HP band if single-phase fight).
3. **Deaths With Answers** — at time of death, did player have a major personal defensive / healthstone / pot available and unused within the last N seconds?

Avoidable-damage density and priority-target damage are deferred until Phase 4 when light-config admin UI exists.

### UI surfaces

- **Dashboard summary (extended)** — add a 3-tile progression panel to `apps/web/src/pages/Dashboard.tsx` below the existing Progression/Overall cards. Shows the v1 metrics for the selected character vs role-peer median, last-20-pull window.
- **New `/progression` route** — drill-down with filters (boss, difficulty, role, player, rolling window size), per-pull trend charts, per-night breakdown. Reuses `useHashParams` and `parseFilters.ts` patterns; charts via existing Recharts dep.
- **Admin: fight override UI** — extend `apps/web/src/pages/admin/AdminFights.tsx` with per-fight `effective_prog_end` review/override and a read-only heuristic trace.

## Functional Requirements (vetted)

### Feasibility

| Requirement                                                              | Source                                           | Feasibility                                                                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Guild report discovery with watermark                                    | WCL `guildData.reports`                          | ✅ Standard GraphQL query, cheap                                                                                         |
| Live report detection + incremental fight ingest                         | `report.endTime` advancing, `report.fights` diff | ✅ WCL exposes in-progress reports; fight list is authoritative per refresh                                              |
| Per-pull tables (deaths, dmg-taken, casts, interrupts, dispels, summary) | WCL `reportData.report.table(...)`               | ⚠️ ~60 pulls × ~6 tables = ~360 ops/raid night. Mitigated by PROGRESSION-only gating and incremental-by-fight-id refresh |
| Phase transitions                                                        | `fight.phaseTransitions`                         | ✅ Native, but not every encounter emits phases — fall back to HP bands                                                  |
| Ability/NPC resolution                                                   | `report.masterData.abilities` / `actors`         | ✅ Native                                                                                                                |
| Actor stitching across reports                                           | player GUID                                      | ✅ GUID is stable across reports                                                                                         |
| Effective prog end                                                       | Derived                                          | ⚠️ Heuristic only; admin override is required v1                                                                         |
| Healthstone/pot/defensive availability at death                          | Casts table + buffs                              | ⚠️ Requires per-spec availability model (class cooldowns). Keep a small curated list for v1                              |

### Maintainability

- **Additive schema only.** No breaking changes to `Parse`/`Character`/`FightConfig`. New tables live alongside.
- **`metric_version` isolation.** Old and new metric logic coexist; dashboards read latest version.
- **Raw cache enables replay.** Officer-facing metric changes don't require re-hitting WCL.
- **No per-boss code.** V1 is zero-config; later phases introduce tiny JSON config, never if/else per encounter.

### Ease of use

- **Dashboard stays the default landing.** Progression tiles sit under existing summary cards; no new navigation required for the 80% case.
- **Officers never need to input IDs.** Admin UI always takes names (spell, NPC, ability) and resolves via WCL lookup.
- **Overrides are obvious.** When `effective_prog_end` is overridden, the dashboard shows a small badge so officers know a human adjusted it.

## Critical Files

**Read-only references (existing patterns to reuse):**

- `apps/api/prisma/schema.prisma` — additive tables here
- `apps/api/src/wcl/auth.ts`, `apps/api/src/wcl/client.ts` — OAuth + GraphQL client, reuse
- `apps/api/src/wcl/queries.ts` — add new queries (report discovery, report spine, per-pull tables)
- `apps/api/src/jobs/syncParses.ts` — sync-job pattern to mirror
- `apps/api/src/routes/sync.ts` — admin-only trigger pattern
- `apps/web/src/pages/Dashboard.tsx` — progression tiles anchor
- `apps/web/src/pages/admin/AdminFights.tsx` — fight override UI anchor
- `apps/web/src/lib/parseFilters.ts`, `apps/web/src/hooks/useHashParams.ts` — filter state pattern
- `apps/web/src/components/ranking/ParseQuadrant.tsx` — Recharts example to follow

## Rollout Phases (PR Roadmap)

Each phase ships as 1–2 PRs with its own design conversation.

### Phase 0 — Schema foundation (1 PR)

- New Prisma models: `Report`, `Fight`, `Actor`, `Ability`, `Npc`, `PlayerFightFact`, `RawPayloadCache`
- Columns: `metric_version` on facts, `effective_prog_end_ts` + `effective_prog_end_source` on `Fight`
- No logic yet — just the schema and migrations
- **Exit criteria:** `pnpm run db:migrate` produces the new schema on dev; no regressions on existing tables

### Phase 1 — Guild discovery + report spine (1–2 PRs)

- WCL `guildData.reports` query with sliding watermark
- Fetch + raw-cache each report's `fights` and `masterData`
- Normalize into `Report`, `Fight`, `Actor`, `Ability`, `Npc`
- `Report.provisional` state machine: NEW → LIVE → FINAL based on `end_time` stability
- Incremental fight ingest: diff `fight_id` set between fetches; only upsert new/changed fights
- Admin trigger: `POST /api/sync/reports`, button on `AdminSyncs.tsx` — runs one-shot discovery + refresh
- **Exit criteria:** After sync, DB has current tier reports with fights and actor/ability dims; re-running is a no-op; re-running on a live report fetches only new fights

### Phase 1.5 — Live refresh loop (1 PR, could bundle with 1)

- Server-side interval job that, when any report is LIVE, polls every 2–5 min
- Quiesce detection: `end_time` unchanged for N minutes → mark FINAL
- Rate-limit guard: hard cap polls per minute, backoff on WCL error
- **Exit criteria:** Log live during a raid night and observe pulls appearing in the DB within 5 min of WCL upload; verify polling stops when report finalizes

### Phase 2 — Pull tables + effective_prog_end (1–2 PRs)

- Fetch per-pull tables only for `PROGRESSION`-classified fights
- Build `PlayerFightFact` skeleton rows per player per pull
- Implement `effective_prog_end` heuristic (two-of-three)
- Admin override UI on `AdminFights.tsx` (per-fight drilldown with heuristic trace)
- Death classification: `PROG_RELEVANT | WIPE_COLLAPSE | POST_WIPE_EXIT | RESET_ROLE_HOLDOUT`
- **Exit criteria:** For a sample raid night, every PROGRESSION pull has an `effective_prog_end_ts` and every death has a context; admin can override and override sticks

### Phase 3 — v1 metrics + dashboard (1–2 PRs)

- Compute Survival Depth, Early Brick Rate, Deaths With Answers
- New API endpoints: `GET /progression/character/:id`, `GET /progression/boss/:encounterId`
- Dashboard: 3-tile progression panel on `Dashboard.tsx`
- New route: `/progression` with filterable trend view
- **Exit criteria:** Officers can see the three metrics per character vs role-peer median, with last-20-pull rolling windows; drill-down works for at least one boss through one raid week

### Phase 4 — Light-config metrics (deferred, 2–3 PRs)

- Admin UI for `priorityTargets`, `avoidableAbilities`, `checkpoints` per encounter (name input → ID resolution)
- Metrics: Avoidable Failure Density, Priority Damage Share, Late-Pull Survival Rate
- Dashboard: expand progression panel or add second panel

### Phase 5 — Stability & depth (deferred, open scope)

- Consistency score (rolling CoV across v1 + Phase 4 metrics)
- Active Time While Alive, Cooldown Window Adherence
- Assignment overlays (interrupt rotation, soak groups, externals) — highest config cost, lowest until we prove officer demand

## Future (deferred)

- Assignment overlays and cooldown-window adherence (heavy per-night config)
- Resource waste / readiness metrics (role/spec-specific, fragile)
- Cron-based nightly ingest (ship manual-only first, automate once cadence stabilizes)
- Event-window reconstruction for precise death-cause attribution
- Cross-tier historical retention (first tier ends → decide archival strategy)
- Player-facing view of their own metrics (currently officer-gated assumption)

## Verification

- **Schema:** `pnpm run db:generate && pnpm run db:migrate` on dev branch; verify new tables present, no existing tables touched except `FightConfig` (JSON config addition, nullable).
- **Ingestion:** Trigger `POST /api/sync/reports` on a raid-night report. Confirm (a) `Report` + `Fight` rows exist, (b) raw payload cache has entries, (c) re-trigger is a no-op, (d) watermark advances.
- **Live refresh:** During an actual raid, confirm new fights appear in the DB within 5 min of being uploaded to WCL; confirm the report transitions to FINAL after the raid ends; confirm no duplicate fight rows are produced across refresh cycles.
- **Effective prog end:** For 5 sample wipes, eyeball the heuristic output against raid VOD or officer memory; confirm admin override UI writes and the dashboard reflects it.
- **Metrics correctness:** Spot-check survival depth for 3 players across a raid night — manual count of `boss % at death` matches stored value. Early brick rate: pick a boss with an obvious phase boundary and count bricks manually.
- **UI:** Dashboard renders progression tiles for a character; `/progression` route filters update the chart; admin override badge appears when set.
- **Typecheck + format:** `pnpm run check` passes on each PR.

## Open questions deferred to per-phase design

- Which cooldowns count as "answers" for Deaths With Answers? (curated per-class list — discussed in Phase 3 design)
- Exact two-of-three thresholds for `effective_prog_end` heuristic — will require a calibration pass against real raid-night data in Phase 2
- Whether `/progression` should be officer-gated or visible to all members
- Specific chart types for `/progression` trend view (line vs. ribbon vs. small-multiples)
