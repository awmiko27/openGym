# Phase 5 UI revision — cleaner `/anime` dashboard and precise workout review

The `/anime` landing page now shows compact character selection, one selected-program card, and short summaries for arc progress and challenges. Profile editing and full challenges are separate steps, so the landing page does not duplicate the week schedule and story benchmark in three places.

## Review training plan

`AnimePlanReview.jsx` renders an expanded/collapsed list of the *actual* exercises selected by the Saitama, Goku, or Jinwoo foundation builder for the current training week. Each day lists openGym catalogue names and prescribed working sets × repetitions. Rest days are shown separately, and story-inspired cardio is explicitly optional and **not** counted for XP. Totals are calculated from generated data, not invented durations or placeholder exercises.

`plan-preview.js` is read-only and calls the same pure exercise generators used by the native openGym starter loader. The UI passes the existing openGym `EXIDX`, `activeProfile(S)` and `eqAvailable` function. No new equipment controls, weight fields, exercise log, or reward balances are introduced.

Loading still goes through the existing `loadStarterPlan` function and preserves the active-workout guard, Fixed Week guard, stored workout history, and existing managed-schedule reconciliation.

## Test / build on Fedora

```bash
cd ~/Desktop/projects/openGym
# patch is incremental to Phase 5 canon revision
# git apply --check anime-ascension-opengym-phase5-ui-revision.patch
# git apply anime-ascension-opengym-phase5-ui-revision.patch
cd frontend
npx vitest run src/lib/anime/plan-preview.test.js
npm test
npm run build
cd ..
git diff --check
docker compose up -d --build
```

Review all three characters, try filtering on/off through openGym Settings, and check an advanced experience level or a later unlocked training week. The preview should always match the native plan after loading. Exercise availability or schedule behavior can still differ if the underlying upstream source has diverged from the recorded Phase 5 source; do not force a patch on mismatch.
