# Anime Ascension — Phase 3 Revision 3: remove duplicate weight and equipment UI

No new installer, route, state key, or workout engine changes. Applied on top
of Revision 2, on the existing `feature/anime-ascension-poc` branch.

## Changes

- Remove the entire Anime Ascension equipment selector, including the
  bodyweight-only choice and one-time profile overrides.
- Remove the Anime Ascension body-weight display, legacy-weight hint and
  weigh-in button. All weight logs remain in openGym.
- Call native `activeProfile(S)` from `lib/equipment.js` immediately before
  loading a Saitama starter plan. `activeProfile` respects `equipFilterOn`:
  when filtering is disabled, `null` passes through to `loadStarterPlan`,
  which loads the program as written without equipment fitting. When
  filtering is enabled, the current active profile is passed to openGym,
  which handles the fitting.
- Remove obsolete equipment resolver code, tests, and CSS. Keep only age,
  height, goal, experience, and character-specific preferences.
- Existing saved openGym equipment, body-weight records, workouts, and RPG
  rewards remain untouched. Previous legacy Anime Ascension weight and
  equipment fields retire on the next successful plan save.

## Verification on Fedora

```bash
cd ~/Desktop/projects/openGym
git apply --check anime-ascension-opengym-phase3-revision3.patch
git apply anime-ascension-opengym-phase3-revision3.patch
cd frontend
npx vitest run src/lib/anime/profile.test.js
npm test
npm run build
```

## Browser checks

1. `#/anime` displays age, height, goal and experience only.
2. No equipment selector, bodyweight-only option or weight card appears.
3. In openGym Settings, turn equipment filtering **off** (all exercises).
   Load Saitama. The loader passes no fitting profile; the plan is not
   restricted by an equipment profile.
4. Turn equipment filtering **on**, choose a profile in openGym Settings,
   then load Saitama again. The loader respects openGym's active profile.
5. Verify `#/anime/rpg`, XP previews, and workout completion remain normal.

Note: enabling equipment filtering does not retroactively edit already
created routines. Reload the plan to fit new routines to a profile.
