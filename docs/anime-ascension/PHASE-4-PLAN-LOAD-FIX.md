# Phase 4 — Character plan load error

Goku and Jinwoo were dispatched by `buildStarterPlan()` but not registered in
`sheets.jsx`'s `PLAN_COPY`. openGym's `loadStarterPlan()` calls
`PLAN_COPY[planId]().name` to show a success toast *after* updating the plan.
For those two identifiers, that expression threw `TypeError` and the Anime
Ascension page misleadingly reported that the program could not be loaded.

The repair script adds only the two name/description entries to `PLAN_COPY`.
It does not alter existing openGym settings, workouts, Saitama, or the RPG
integration. It can safely be rerun. The Anime Ascension error handler now logs
unexpected failures to the browser console instead of hiding the cause.

Apply the Git patch from the repository root and run:

```
node scripts/repair-anime-ascension-phase4-plan-copy.mjs
node scripts/repair-anime-ascension-phase4-plan-copy.mjs
node --test scripts/repair-anime-ascension-phase4-plan-copy.test.mjs
cd frontend && npm test && npm run build
```

**Important:** The prior attempt may have inserted the character routines and
updated the weekdays before its toast threw. Re-running the repaired loader
uses the existing openGym routine matching logic to reuse matching routines.
Check Monday/Wednesday/Friday after loading; do not delete workouts or reset
profiles to address this issue.
