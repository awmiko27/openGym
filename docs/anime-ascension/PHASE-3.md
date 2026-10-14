# Anime Ascension x openGym — Phase 3 (Saitama RPG)

Baseline: openGym v1.4.0, Saitama POC installed, Phase 2 patch + installer run. Apply this patch on the **existing** `feature/anime-ascension-poc` branch; run `node scripts/install-anime-ascension-phase3.mjs` from the repository root. Review the subsequent changes, then run tests and build.

## What was implemented

- `/anime/rpg`: Saitama Hero status, level progress, rank, two initial arcs, daily and weekly quests, achievements, and last ten derived rewards.
- One source of truth: RPG XP is a **read-only derived ledger** from native openGym completed workout history. This avoids duplicate XP from retries and keeps awards consistent when workout history is edited, synced, or deleted.
- On a **new** Saitama session started with the native Plan/Workout flow, a snapshot of the original exercises and requested reps is placed on the in-progress workout. On finish, openGym's normal `buildCompletedWorkout()` persists that immutable prescription beside the recorded sets.
- Only sessions with this valid source snapshot, exactly one Saitama Foundation routine, all original exercises and sets completed, and each original repetition target met qualify. An early finish, exercise swap, freestyle, mixed session, partial sets, saved-history edit under the target, or a different program gets no RPG credit.
- Base completion: +100 XP. First qualifying workout each local calendar day: +30 XP. Third completed workout of a Monday–Sunday week: +75 XP. Milestones: 1/3/5/6/10 workouts with +50/+60/+100/+120/+150 XP once respectively.
- Beginner ranks: Hero Candidate (0–5), C-Class Hero (6–11), B-Class Candidate (12+). Two arcs of six qualifying sessions each. These are *game labels*, not health assessments.

## Intentional limitations

- RPG tracking begins only for workouts **started after Phase 3 is integrated**; historical Phase 1/2 workouts have no immutable completion snapshot and cannot safely be credited retroactively. No database backfill is performed.
- Currently only Saitama is enabled. Goku and Jinwoo remain Phase 4. RPG quests count qualified completed Saitama workouts, not signature push-up challenges; the latter needs reviewed exact exercise mappings.
- The strict rep-based proof is for starter sessions with standard repetition sets. Timed cardio/holds, warmups, per-side exercises and custom intensifiers have not yet been incorporated into RPG credit. No XP is awarded when the proof cannot safely be constructed.
- Modifying an exercise or its prescription mid-session makes the current Saitama RPG proof ineligible even if openGym considers the workout completed. This is intentional and conservative for the prototype; a future revision will support approved substitutions.
- Data can still be sync-conflicted at the openGym level. The RPG is recomputed from whichever verified workout history openGym settles on, so there is no independent prize state to repair.
- No independent Google authentication, payment, external XP service, or data migration from the old Anime Ascension project is included.

## Apply and verify

```bash
# From openGym repository root, with Phase 2 already committed or applied
git apply --check anime-ascension-opengym-phase3.patch
git apply anime-ascension-opengym-phase3.patch
node scripts/install-anime-ascension-phase3.mjs
node scripts/install-anime-ascension-phase3.mjs # must be idempotent
cd frontend
npm test
npm run build
cd ..
git diff --check
git diff --stat
```

## Functional acceptance checks

1. Visit `#/anime`, click **View Hero status**, verify the `/anime/rpg` page renders.
2. Verify no XP is awarded for historical workouts without a Phase 3 proof.
3. Select Saitama Hero Foundation, start and fully complete a new workout with all original exercises and prescribed reps. Reload `/anime/rpg`: one +100 XP workout and one +30 XP daily quest, plus first-workout +50 XP.
4. Complete an additional Saitama workout the same day: +100 XP only (no duplicate daily quest). A third workout within the same Monday–Sunday week adds the +75 XP weekly bonus.
5. Finish a new Saitama workout early, omit an exercise, or log below target: no new RPG credit, although native openGym history still records it.
6. Log a non-Saitama workout, a freestyle workout, or a mixed session: no Saitama credit.
7. Edit a previously credited workout below prescription or delete it. RPG credits should recalculate down, with no duplicate transactions.
8. Return to the page after logout/login and sync; verified workouts remain your openGym account's source of truth.
9. Confirm existing openGym training, media, calendar, authentication, and rest timer screens are unchanged.

## Upstream integration note

The patch itself adds new files and modifies the Phase 2 `AnimeAscension.jsx` entry point. The **installer** makes the required small changes in `App.jsx`, `sheets.jsx`, and `lib/finish-workout.js`. It fails closed if any anchor differs. Review and commit those installer-modified files along with the patch files. No `node_modules`, `.env`, credentials, or media assets are included.
