# Hero Path — Exercise Quality + PPLUL

**Scope:** Saitama / Goku / Sung Jinwoo exercise selection, read-only preview, and optional coaching copy. This does **not** rename exercise IDs, edit saved workout records, change training arc lengths (5/4/5 days), rewrite old challenge receipts, modify XP proofs, or alter OpenGym equipment settings.

## Improvements

- Prefer a genuine dumbbell, band, or cable resistance row wherever OpenGym's active equipment profile permits it. No hidden equipment overrides.
- For bodyweight-only training, choose safe floor-based upper-back work such as lying prone W-to-T or Y raises, where available. This is **not equivalent to a resistance row**; the plan preview says so. Never auto-select an inverted row that needs a bar/table/chair anchor solely because the catalogue calls it "body weight".
- Saitama: more upper-back work in push/circuit/endurance slots; reduce unnecessary repeat squatting in light days. Keep core, lunge, run-preparation and calf work.
- Goku: retain lower/upper strength split; introduce pulling into the conditioning slot where equipment supports it; avoid adding another squat/push to that slot.
- Jinwoo: add upper-back and core stability into hunter/agility work; distinguish dungeon strength from system endurance rather than replicating Saitama's daily repetitions.
- Minimal catalogues still receive distinct native OpenGym movements. Same starting assessment exercise remains at the front of each character's tier-I program.
- More actionable **optional** walking/jogging or footwork guidance; it does not earn XP or replace logged workouts. Timed-cardio verification is **not** implemented.

## Safety and compatibility

- Existing saved routines, XP, and in-progress challenge sessions keep their frozen prescriptions. **Only loading a new training plan or starting a new challenge** uses the revised generator. Do not reload a training plan during an active challenge.
- The fixed 5/4/5 schedule is unchanged to avoid breaking existing training-arc credit. Beginners can edit individual routine volumes in OpenGym, but edited prescriptions must still be completed as saved for anime XP.
- `trainingPrescriptionDelta` stays unchanged: next training week already requires qualifying proof of each preceding session. No automatic weight increases or unmeasurable exercise achievements.
- This is a program-quality improvement, not a personalized medical screening. Users can adjust to their ability and should avoid exercises causing pain.

## Fedora verification (no reset)

Run on the same `feature/anime-ascension-poc` branch, with your local UI/branding changes left in place:

```sh
cd ~/Desktop/projects/openGym
git branch --show-current
git status --short
git apply --check ~/Downloads/hero-path-exercise-quality-and-pplul.patch
git apply ~/Downloads/hero-path-exercise-quality-and-pplul.patch

git diff --check
cd frontend
npx vitest run src/lib/pplul.test.js src/lib/anime/back-movements.test.js src/lib/anime/saitama.test.mjs src/lib/anime/character-paths.test.js src/lib/anime/plan-preview.test.js src/lib/anime/challenge-objectives.test.js
npm test
npm run build
cd ..
node scripts/phase5-mvp-challenge-check.mjs
node scripts/anime-mvp-acceptance-audit.mjs
```

Then review the **new** preview for all three characters, first with bodyweight-only, then with dumbbells or band enabled in OpenGym Settings. Verify the warning appears only for non-row equipment profiles, descriptions match the actual catalog, and the old workouts are untouched. To get new routines into the actual calendar, deliberately load the newly previewed plan when no workout or challenge is active. Do not reset or reimport your main account.

For a new APK after all checks, rebuild via `cd frontend && npm run build:mobile && cd android && ./gradlew assembleRelease`; align and sign with your existing keystore.
