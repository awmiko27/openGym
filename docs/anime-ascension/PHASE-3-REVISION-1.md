# Anime Ascension — Phase 3 Revision 1: XP feedback

Adds **potential XP** during active Saitama Hero Foundation workouts and **earned XP** on openGym's existing workout-complete screen. The source of truth remains `deriveAnimeRpg()` over saved workouts.

## Eligibility

- Shows only on Saitama training sessions started with Phase 3 snapshot metadata.
- Base workout: +100 XP. Conditional bonuses: first qualified workout on a day (+30), third qualified workout of the week (+75), achievement thresholds (see RPG page).
- The preview estimates rewards **if the user completes the original prescription**. The number updates as history changes; it does not grant anything.
- Current completed sets must meet prescribed repetitions. Swapped or structurally changed exercises aren't eligible under current Phase 3 rules.
- The completion screen derives actual XP from the saved record (including +0 for under-target workouts).
- Previously completed non-snapshot workouts don't gain rewards retroactively.
- No database, server, session finish semantics, or workout engine changes.

## Fedora installation

Stay on the same branch (`feature/anime-ascension-poc`) and run from the repository root:

```bash
git apply --check anime-ascension-opengym-phase3-revision1.patch
git apply anime-ascension-opengym-phase3-revision1.patch
node scripts/install-anime-ascension-phase3-xp.mjs
node scripts/install-anime-ascension-phase3-xp.mjs  # should report already installed
cd frontend
npx vitest run src/lib/anime/rpg.test.js
npm test
npm run build
```

Then rebuild your container and confirm the preview in an active Saitama workout, and the earned reward summary after saving the workout. A quick finish should show +0 RPG XP.

## Notes

The install script validates both target components before writing. If your `Workout.jsx` or `sheets.jsx` has diverged from v1.4.0, it will stop without making changes; share your current files rather than forcing insertion. The fork's existing licensed media and auth implementation are untouched.
