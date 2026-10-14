# Anime Ascension — Phase 5A + 5B

This patch adds original, character-themed **9-week Saitama**, **10-week Goku**, and **9-week Jinwoo** training arcs, plus nine optional challenges (7, 14, and 30 days per character). It does not copy or distribute OtakuAthlete's authored workout prescriptions. All training continues to use openGym's exercise catalog, equipment preferences, routine scheduler, session logger, and workout history. No new equipment or weight fields exist.

## How the multiweek program works

1. Load a character's training plan at `#/anime`. The first successful plan load starts that character's opt-in training arc at the current timestamp. Earlier Phase 3/4 workouts retain XP, but don't advance a newly started arc.
2. Begin the native openGym A, B and C routines on separate days, leaving at least one rest day between credited sessions. Each session must meet the Phase 3 RPG validator (all prescribed exercises, sets and reps). A workout that finishes early, lacks proof or is excluded from progression does not count.
3. After three qualifying A/B/C sessions, the **next** week unlocks. `#/anime` shows **Review and load Week N workouts**. The unlock is automatic, but applying a changed schedule requires an explicit click; this avoids changing live workouts or silently replacing a plan. The existing `loadStarterPlan()` handles replacing Monday/Wednesday/Friday assignments.
4. Week-specific routine names prevent openGym from reusing a previous week's routine with different rep targets. The old routine and all workout records remain available. XP evidence captures the original week and day letter when a workout starts, so repeating older, easier prescriptions cannot unlock a later training week.
5. Within each phase, progression adds at most a few reps, with a small set increase after transitioning and a lighter first week of the new phase. Sets cap at four and reps at twenty. No automatic weight changes or prescribed running distance. Height remains informational. Advanced/difficult variations still require their own future validation.

The UI may show `Week N unlocked` even if its plan hasn't yet been loaded; it will not count a completed session using the previous week's prescription toward the unlocked week.

## Challenges

Each character has original 7-, 14-, and 30-day options. One challenge per character is active at a time; completed badges are retained, and a completed challenge cannot be repeatedly restarted for more XP. Each tracks respectively 3, 6, or 12 completed workouts after activation, with recovery spacing. The last qualifying workout acts as a final trial. Missing the target window **extends the challenge** without resetting workouts. All criteria are derived from existing saved workout records, not manual checkboxes or another workout log.

Completing a challenge earns a one-time badge and **60, 150 or 350 bonus XP**. Character level and total displayed on `#/anime/rpg` include these derived bonuses. The active-workout preview and native completion toast currently show **base RPG rewards only**; challenge bonuses are itemized on the RPG dashboard. A challenge badge/bonus disappears if its proof workouts are deleted or edited below the completion threshold. No achievement can be repeatedly claimed by refreshing a page.

## Intentional boundaries

- Supports native **rep-based** workouts. Timed cardio, distance challenges, interval running and their XP-proof rules remain future work; the site already supports them independently through openGym.
- Recovery is inferred only from local session dates and one intervening rest day; it is not a medical readiness assessment.
- Challenges are training-session objectives, not exact copies of other sites' schedules. The target 7/14/30-day window is flexible to avoid punishing missed days.
- Only the selected character's workouts count toward that character's arc or challenges. Switching characters preserves stored starts and accomplishments.
- No `sheets.jsx`, native starter plan registry, other openGym route, database schema, or equipment setting is modified by this patch.

## Fedora verification

Stay on `feature/anime-ascension-poc` and apply the Phase 5 patch once. From the project root:

```bash
node --test scripts/phase5-offline-check.mjs
cd frontend
npx vitest run src/lib/anime/training.test.js src/lib/anime/challenges.test.js src/lib/anime/phase5-builder.test.js src/lib/anime/rpg.test.js src/lib/anime/character-paths.test.js
npm test
npm run build
cd ..
git diff --check
docker compose up -d --build
```

Browser testing: load a fresh test profile if possible, go to `#/anime` and load Saitama Week 1; confirm a 7-day challenge appears. Confirm that the plan still uses openGym's equipment configuration and that XP previews, workouts and save history work. Test a new qualifying workout and observe challenge progress in the UI. An actual Week 2 transition requires three correctly logged A/B/C sessions spaced with rest days; do not manufacture history on your personal account just to test the rule. Focused automated tests cover the week unlock and no-farming safeguards.
