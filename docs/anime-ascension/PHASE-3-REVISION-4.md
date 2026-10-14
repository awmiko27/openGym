# Anime Ascension — Phase 3 Revision 4: differentiated Saitama A/B/C

This revision is incremental to Phase 3 Revision 3 and retains the existing
`feature/anime-ascension-poc` branch. It uses existing openGym catalogue IDs,
equipment Settings, native workout plans/history, and Phase 3's RPG ledger.
No new equipment/weight selectors or extra database records are introduced.

## Schedule and routine focus

- **Monday — A · Strength:** controlled push, squat, optional dumbbell row,
  glute bridge, and trunk exercise; lower repetitions.
- **Wednesday — B · Endurance:** higher-repetition squat and push, optional
  lunge, alternate trunk exercise, and bridge.
- **Friday — C · Conditioning:** low-impact glute bridge, optional mountain
  climber and calf raise, squat, push, and trunk exercises. These are native
  rep-based exercises, **not a timed circuit**.

Optional movements are skipped if unavailable in the catalogue or excluded
by openGym equipment filtering; the four safe base movement patterns are
mandatory. The original openGym exercise videos/media remain in use.

## Personalization

- Experience (beginner/intermediate/advanced) adjusts sets and repetitions.
- Goal (general/strength/endurance/conditioning) biases repetitions or
  strength-session set counts. Sets are bounded to 2–4, reps to 5–18.
- Age 70+ acts only as a conservative volume cap for an *advanced*-selected
  plan; it is not a fitness assessment. Height is informational. No weight
  calculations or medical recommendations are made.
- Equipment is **only** read from openGym Settings. Filtering off means
  unrestricted catalogue exercises. Filtering on uses its active equipment
  profile including accessory requirements. No separate bodyweight toggle.

Plan loading now passes the validated Anime Ascension goal/experience/age
into the normal openGym starter-plan generation. Other starter plans ignore
this extra optional argument and retain their behavior.

## RPG and compatibility

New routine titles carry their focus (e.g. `Saitama · Hero Foundation A — Strength`).
Phase 3's RPG verifier accepts both these titles and the legacy
`Saitama · Hero Foundation A/B/C` titles. The original workout snapshots,
completion rules and XP amounts do not change. All sets are rep-based to
preserve Phase 3's completed-workout proof logic.

Loading the updated plan updates only Monday/Wednesday/Friday assignments,
retaining existing history. openGym may keep the previous routines alongside
the new ones; **newly loaded sessions** use the new plan. Finish any active
workout before loading the replacement.

## Fedora verification

```bash
cd ~/Desktop/projects/openGym
git branch --show-current
git status --short
git apply --check anime-ascension-opengym-phase3-revision4-compat.patch
git apply anime-ascension-opengym-phase3-revision4-compat.patch
node scripts/upgrade-anime-ascension-r4-sheets.mjs
cd frontend
npx vitest run src/lib/anime/saitama.test.mjs src/lib/anime/rpg.test.js src/lib/starter.test.js
npm test
npm run build
cd ..
git diff --check
```

Rebuild Docker and in `#/anime` select the goal/experience, load the new
training plan, and compare A, B and C. Fully complete each and verify XP;
finish an incomplete workout and verify no full XP. Existing saved workouts
are never rewritten by this revision.

## Limitations

This is **initial prescription scaling**, not an automatic month-by-month
periodized overload algorithm. The conditioning workout is reps-based, not
a structured timed circuit, to remain compatible with openGym's native plan
and the Phase 3 proof model. Full upstream Vitest/build and catalogue exercise
coverage must be verified on the actual Fedora checkout.
