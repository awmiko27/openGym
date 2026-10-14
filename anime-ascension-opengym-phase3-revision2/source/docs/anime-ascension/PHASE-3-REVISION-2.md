# Anime Ascension — Phase 3 Revision 2: reuse openGym profile data

This revision simplifies the existing `#/anime` onboarding. No new route,
installer, database migration, workout mechanic or XP rule is introduced.

## Changes

- Keep character selection, required adult age, optional height, fitness goal
  and experience in `S.animeAscension`.
- Remove the duplicate Anime Ascension weight field. Display the current
  openGym weigh-in through `lastBW(S)` and open openGym's `bwSheet()` when the
  user wants to log body weight. Respect openGym's selected `S.unit`.
- Use `S.activeEquipId` + `S.equipProfiles` by default. Offer an **unsaved**
  override for a different existing equipment profile or bodyweight-only.
  No Anime Ascension equipment-profile ID is persisted.
- Remove *both* checkboxes (injury/limitation and acknowledgment), their
  validation, and the readiness timestamp. No hidden attestation remains.
- Update the Anime Ascension profile contract from `v: 1` to `v: 2` when a
  plan is loaded successfully. The RPG engine currently checks only
  `S.animeAscension.path`, so this version change does not change rewards.
- Remove the obsolete Phase 2 message claiming the RPG system is unavailable.

## Existing-data behavior

- Previously saved age, height, goal, and experience remain available in the
  form when revisiting. They are saved as the v2 shape **only after** a plan
  loads successfully.
- A legacy `S.animeAscension.weightKg` is **not** silently inserted into
  `S.bodyweight`: it was only an onboarding value, not an actual dated weigh-in.
  If no openGym weigh-in exists, the screen shows the old entry with a way to
  log it using openGym before the next plan load. The old profile is replaced
  with the smaller v2 shape on that next successful load.
- Existing `S.bodyweight`, `S.equipProfiles`, `S.activeEquipId`, routines and
  historical workouts are unchanged by this revision.
- Equipment overrides are used only when the user loads that plan, not kept
  as a second setting. Switching openGym's active equipment later changes the
  default selection, not an already-created workout.

## Apply (existing feature branch)

```bash
cd ~/Desktop/projects/openGym
git apply --check anime-ascension-opengym-phase3-revision2.patch
git apply anime-ascension-opengym-phase3-revision2.patch
cd frontend
npx vitest run src/lib/anime/profile.test.js
npm test
npm run build
```

No integration installer is necessary. The patch changes only the Anime
Ascension view, its pure profile functions/tests, the scoped stylesheet, and
this note. If the patch check fails, don't force it: supply the current four
files for a patch generated from the exact working tree.

## Manual checks

1. Open `#/anime`: there is no separate weight input and neither checkbox.
2. Log a weigh-in using the embedded button. The displayed value matches
   openGym Home/Stats, including the current kg/lb unit.
3. Change openGym's active equipment profile. Re-open `#/anime` and verify
   it is the default, with an optional one-time bodyweight or other-profile
   override.
4. Load Saitama; verify it uses the selected equipment and that the saved
   `S.animeAscension` contains only v2 profile fields.
5. Check `#/anime/rpg`, workout XP preview and completion rewards still work.
6. Existing saved profiles from earlier phases prefill age, height, goal and
   experience. Any old weight-only value is explained, not imported silently.
