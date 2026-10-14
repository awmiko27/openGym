# Anime Ascension — MVP Challenge Assessments

This is an incremental revision to Phase 5 Temporary Challenge Mode. It **does not** modify the native openGym workout logger, user equipment settings, or the existing active-workout guard.

## Why change the challenges?

The older implementation only counted completed workouts. New `v:3` attempts capture a measurable starting assessment and require a stronger closing performance on the **same exercise ID**. Longer tiers include a checkpoint.

| Tier | Sessions | Assessment |
| --- | ---: | --- |
| 7-day | 3 | Baseline in session 1, character-themed preparation, improvement in final session |
| 14-day | 6 | Baseline in session 1, checkpoint in session 4, improved final trial in session 6 |
| 30-day | 12 | Baseline in session 1, checkpoint at session 7 for Goku / 8 for Saitama and Jinwoo, final assessment in session 12 |

Challenge lengths are **flexible windows**, not guarantees that all sessions must finish within the named dates. Skipped sessions don't destroy history; they extend the attempt.

## Nine distinct themes

- **Saitama:** Hero Entrance Examination (push-ups); Hero Endurance Circuit (squats); One-Punch Hero Assessment (full-body endurance).
- **Goku:** Turtle School Entrance Test (leg endurance); Saiyan Strength Trials (upper-body work); Gravity Chamber Assessment (leg training volume).
- **Jinwoo:** System Awakening Trial (daily-quest push-ups); Dungeon Survival Trial (hunter movement); Hunter Promotion Raid (system endurance).

The actual assessment exercise ID comes from the eligible openGym catalogue and is frozen in the active challenge receipt; variants may change according to equipment availability and starting experience. Character labels describe original canon-inspired themes, not the copyrighted contents of any external training program.

## Verification and reward rules

1. Start a challenge with no active openGym workout. The initial session is assigned to **today** in Fixed Week mode.
2. Challenge-specific routines replace the calendar. The previous calendar and arc progress remain in a reversible receipt.
3. A full, saved and verified **first session** provides the baseline. All subsequent credited sessions must be on distinct dates and in the prescribed routine order.
4. In longer tiers, the prescribed checkpoint must exceed the actual starting benchmark, and the final test must exceed it by the stored minimum. Completing a session without meeting the benchmark can still earn normal workout XP, but **does not advance the challenge**.
5. Completing the full sequence grants the existing tier bonus once (+60, +150, +350 XP). Refreshes or edits cannot double-award bonuses; they're derived from history.
6. Finish or cancel restores the old schedule and removes temporary templates, while retaining workout history. Challenge workouts never advance the paused main training arc.

The assessment currently uses **total verified repetitions for one signature exercise**. Neither running distance nor load-based personal records are verified yet. Do not describe these as verified achievements in the UI.

### Migration

- Completed older challenges keep their completion badge and rewards; tiers retain the same IDs.
- Existing active `v:1` and `v:2` challenge attempts continue using their prior counting logic. Their workout plans are **not** silently changed mid-attempt.
- To use the new benchmark system, finish an older attempt or cancel it, then start a new eligible attempt. Completion of an older tier still unlocks the next tier.

### Fedora validation

```bash
cd ~/Desktop/projects/openGym
git apply --check anime-ascension-opengym-phase5-mvp-challenges.patch
git apply anime-ascension-opengym-phase5-mvp-challenges.patch
node scripts/phase5-mvp-challenge-check.mjs
cd frontend
npx vitest run src/lib/anime/challenge-objectives.test.js src/lib/anime/challenges.test.js src/lib/anime/challenge-mode.test.js
npm test
npm run build
cd ..
git diff --check
git diff --stat
docker compose up -d --build
docker compose ps
```

**Manual safety test:** Begin Tier I on the current weekday; inspect the exercise preview and the final trial prescription; save a qualifying opening workout (baseline). Cancel and verify the original calendar is restored and trial templates removed. For the full tier-unlock test, use the standalone simulated test, **not date manipulation or dummy workouts in your real account**.
