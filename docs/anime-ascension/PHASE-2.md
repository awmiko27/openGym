# Anime Ascension / openGym — Phase 2: UI + onboarding

## Baseline
- openGym upstream v1.4.0 and the Saitama POC **plus the corrective POC test patch** installed.
- Keep existing `feature/anime-ascension-poc` branch. Do not replace openGym's workout engine or clone our old Next.js project into this tree.
- This commit adds source files and an **idempotent, fail-closed integration script**. The script edits existing upstream views after confirming its expected anchors. Commit these edits with the source files.

## Install

```bash
# Run from repository root, after applying the Phase 2 patch
node scripts/install-anime-ascension-phase2.mjs
git diff --check
cd frontend
npm test
npm run build
cd ..
```

The installation updates `App.jsx` (adds `#/anime`), Home, Plan menu, Login header, and the web page/PWA name. Icon image files, upstream license and NOTICE.md remain untouched. Internal API/storage names remain `openGym`; **do not rename them** in this phase.

## Features
- Self-contained anime path screen (`#/anime`), mobile responsive.
- Saitama available; Goku and Sung Jinwoo explicitly labelled upcoming and not selectable.
- Profile captures **optional** age, height and weight, plus goal, experience and a specific existing openGym equipment profile. Missing equipment profile means bodyweight only.
- Profile values are stored under the top-level `S.animeAscension` value using openGym's usual state update and sync engine, not unkeyed browser localStorage. An existing record prefills when revisiting.
- Every use requires new readiness acknowledgment; selecting an injury/limitation blocks automatic plan installation rather than treating it as exercise clearance.
- Review clearly warns that the plan reassigns Mon/Wed/Fri; no workout history is deleted. Loading checks for an active workout, refuses to modify a running rotation, and fails closed if no exercises could be resolved.
- Invokes native `loadStarterPlan('saitama-foundation', equipmentProfile)`, which reuses existing plans, schedule, logging, and exercise media.

## Explicit limitations
- No personalized sets/reps based on age, body measurements, goal or experience yet. This remains a **beginner prototype**.
- No character-specific XP, rank, quests, Google OAuth, or session midnight expiry yet.
- No separate exercise-image rights are granted by this patch; existing openGym asset notice applies.
- A new title and manifest name are not a complete Android rebrand. The PWA icon images remain the originals until a separate appropriately licensed icon is created.
- Bodyweight-only does not guarantee a valid pulling option. The Saitama builder refuses missing mandatory slots, it does not fabricate substitutes.
- Stored profile fields are not a medical clearance. Any identified exercise limitation requires appropriate assessment or a properly adapted program before use.

## Manual smoke test
1. Register/sign in or enter a test profile; open Home → Training paths.
2. Saitama is available; Goku and Jinwoo cannot be selected.
3. Fill details, choose Home equipment profile if available, confirm readiness, review and load.
4. If Mon/Wed/Fri already have plans, verify the warning is shown before load and existing workouts/history remain.
5. Return to `#/anime` and check profile values stick (readiness checkbox is deliberately reset).
6. Use a bodyweight-only test account; confirm no dumbbell exercises and verified exercise catalog IDs.
7. Start a workout, log sets, and verify it appears in openGym's history.
8. Check sign-in header, Home and PWA name; check mobile width 320px and keyboard navigation.
9. Test with a flagged limitation; it must block loading.
10. Run `node scripts/install-anime-ascension-phase2.mjs` again: it must make no duplicate edits.

## Rollback
Revert the commit containing both added files and the installer-applied modifications (or, before committing, restore only the changed files from Git after reviewing your working tree). Do **not** delete workouts or data volumes.
