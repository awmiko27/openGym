# Anime Ascension — MVP acceptance audit (Phase 5, baseline review)

**Status: NOT YET SIGNED OFF**
Reviewed: delivered Phase 5 MVP Challenge files and isolated test harness, October 14, 2026.
**Scope caveat:** This is based on the last generated patch baseline available here, **not** the user's exact Fedora working tree. A full frontend build, real device testing and actual account data are not available in this environment.

## What passed in the available source

- Standalone Phase 5 challenge simulations for all nine character/tier combinations.
- Wednesday-enrollment schedule rotation, cancellation, safe calendar restoration, and temporary routine removal.
- Character-specific 5/4/5-day training schedules, qualified saved-workout checking, and challenge workout exclusion from main arc progress.
- Benchmarks, checkpoints, failed-final retries, sequential unlocking, and challenge bonus recomputation in the isolated simulation.
- No duplicated equipment settings in the Anime Ascension UI; exercises are selected using openGym settings.
- Responsive CSS breakpoints at 620px and 440px exist, though rendering has **not** been visually verified.

## Release-blocking or high-priority findings

| Severity | Finding | Evidence / impact | Corrective action |
|---|---|---|---|
| **P0** | Final-trial prescription appears before the last session in 14-/30-day challenges | `challenge-mode.js` calculates `finalTemplate=(sessions-1)%routines.length` and edits that **repeating weekly template**. For 14 days (six sessions/four templates), the finale template is also session **2**; for 30 days it appears more than once before the final session. This dilutes the intended difficulty phasing and can require peak work early. | Track **per-session** prescriptions or stage-specific templates; do not embed the finale target in a template used before the final session. Add regression checks covering every session position. |
| **P1** | Completion requires an extra manual restoration action | `AnimeChallenges.jsx` shows `Finish challenge & resume training arc`; no automatic exit from the workout-finish event is included. The earlier description that visiting `/anime` restores automatically is not what this source does. | Choose a single intended behavior. For MVP, offer an obvious post-completion action or implement safe auto-finalization on page return; test idempotence and active-workout guard. |
| **P1** | Source-of-truth integration not validated against user's exact branch | Past installer/patch mismatches arose because generated source was not the user's current checkout. | Export a source-only archive of the current Git tree and generate all subsequent fixes against that exact baseline. |
| **P1** | Full 14-/30-day calendar not actually date-specific | openGym Fixed Week repeats 4–5 workout templates over multiple weeks, while challenge progression counts 6/12 sessions. | Define a session sequence with calendar-date or completed-session index; safely update displayed training to the appropriate session without losing user's week edits. |
| **P2** | Fitness performance claims remain rep-based | Distance, cardio timing, running, resistance increments and martial arts cannot currently be verified for XP. | Keep those goals informational in MVP UI; don't label untracked tasks completed. |
| **P2** | Mobile behavior unverified | Responsive CSS exists; no actual viewport, keyboard or screen reader pass. | Test 360, 390, and 768px widths in a browser on real frontend build. |

## Acceptance checklist to run on Fedora

Work in the **same feature branch**. Do not change or delete real workout history for testing. Back up your current openGym data before manual challenge-switch tests.

1. **Baseline:** `git status --short`, `git branch --show-current`, `git diff --check`.
2. **Logic:** `node scripts/phase5-challenge-mode-check.mjs`, `node scripts/phase5-mvp-challenge-check.mjs`, `node scripts/anime-mvp-acceptance-audit.mjs` (audit intentionally exits nonzero while blockers remain).
3. **Frontend:** `cd frontend && npm test && npm run build`.
4. **Deployment:** `cd .. && docker compose up -d --build && docker compose ps`.
5. **Onboarding:** Select each character, save goal/experience, refresh, verify persistence; confirm equipment selection remains solely in openGym Settings.
6. **Plan review:** Compare exact exercise IDs/names, sets and reps from Review Plan with the loaded native openGym routines, at Weeks 1 and 4. Verify active workout blocks replacement.
7. **Training arc:** Finish an eligible session, verify one credited slot and correct XP; finish early, verify no XP/arc credit; challenge-tagged sessions must not advance the arc.
8. **Challenge start/cancel:** Start a challenge on the current local weekday, verify Day 1 matches; cancel, verify original calendar restores and generated routines disappear; completed workouts remain.
9. **Challenge completion:** Use **isolated automated simulation** for 7-/14-/30-day tiers and final-failure retries; do not change computer clock or fabricate saved workout data in your real account.
10. **Reopen/refresh:** Check saved challenge progress, earned badges, workout history and character-isolated XP.
11. **Mobile:** Test portrait widths 360/390/768px, long exercise names, accordions, dialogs, keyboard navigation, focus states, scrolling, and no horizontal overflow.
12. **Backup/restore:** Export an openGym backup and restore into a **separate test account/environment**; verify `animeAscension` state, challenge receipts, and restored routine references.

## Go / no-go

The automated focused scenarios pass, but **this baseline does not yet meet MVP sign-off** because the longer challenge prescriptions reuse boss/checkpoint templates early and completion UX is inconsistent with the stated behavior. Fix these first, then conduct a real-device and restore-from-backup pass.

## Exact recommended next coding pass

1. Resolve per-session challenge prescription sequencing (P0) with tests for session positions 1…6 and 1…12, all three characters.
2. Make challenge finish/restore UX unambiguous and idempotent (P1).
3. Verify on a source-only snapshot of the **current Fedora branch**; supply one incremental patch with a complete test/diff/Docker/commit checklist.
