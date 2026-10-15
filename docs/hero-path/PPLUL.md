# PPLUL — five-day strength + hypertrophy starter

This **separate OpenGym starter plan** is designed for an intermediate trainee with access to a basic gym, approximately 60–75 minutes per session. It does not count as an Anime Ascension training path and does not generate Hero XP or challenge credit.

| Day | Session | Focus |
|---|---|---|
| Monday | Push | Bench, incline pressing, shoulders, lateral raises, triceps |
| Tuesday | Pull | Pulldown/pull-up, two row patterns, rear delts, biceps |
| Wednesday | Legs A | Squat, Romanian deadlift, lunge, leg curl, calves |
| Thursday | Upper | Chest, back, shoulders, triceps, biceps |
| Friday | Lower B | Leg press, Bulgarian split squat, leg extension, seated/lying leg curl, calf raise, kneeling cable crunch |
| Saturday / Sunday | Recovery | No scheduled routine |

Friday is the requested six-exercise Lower B session (not the earlier hip-thrust/weighted-crunch version):

| Exercise | Prescription | RIR | Rest |
|---|---|---|---|
| Leg press | 3 × 8–12 | 2 | 2–3 min |
| Bulgarian split squat | 2 × 8–12 / leg | 2 | 2 min |
| Leg extension | 2 × 10–15 | 1–2 | 90 sec |
| Seated/lying leg curl | 3 × 10–15 | 1–2 | 90 sec |
| Calf raise | 3 × 12–20 | 1–2 | 60–90 sec |
| Kneeling cable crunch | 2 × 10–15 | 1–2 | 60–90 sec |

The leg press requires sled-machine equipment in the selected profile; it no longer silently becomes a front squat.

## How it works

In **Plan → Load starter plan**, choose **PPLUL · Strength & Hypertrophy**. OpenGym creates five ordinary routines and schedules Monday–Friday on Fixed Week. You can choose **As written** or your existing OpenGym equipment profile. With a profile, a plan is created **only if every slot has a suitable explicitly listed exercise**; it does not silently substitute an unrelated lift. The profile is already maintained in OpenGym Settings.

Every lift starts at the **bottom of the prescribed repetition range**; for example a 3 × 6–10 exercise gets three sets targeting six reps. OpenGym's per-exercise **note** shows its entire range, RIR (reps in reserve), and rest period. For single-leg moves the note says “per leg”.

**Double progression over eight weeks:** keep an appropriate working weight and aim to add reps with sound technique, while meeting the prescribed RIR. When every working set reaches the top of its rep range at the intended RIR, increase the weight by the smallest practical increment, then work back up from the range minimum. Do not increase load automatically from a calendar week. Compound lifts generally target about 2 RIR; accessories target 1–2 RIR. If fatigue accumulates, take a deload with ~30–50% fewer working sets and/or lighter effort. Never force painful movements.

Routine exercise IDs, sets, reps, and note text follow OpenGym's normal plan schema. Changing a routine, doing an incomplete workout, or importing a backup works as it does for any other OpenGym starter; no separate PPLUL store or progression balance is created. The five-day plan is **not a replacement for the existing Saitama/Goku/Jinwoo character plans**.

## Verification

```sh
cd ~/Desktop/projects/openGym
node scripts/phase5-mvp-challenge-check.mjs
cd frontend
npx vitest run src/lib/pplul.test.js src/lib/anime/back-movements.test.js src/lib/anime/saitama.test.mjs src/lib/anime/character-paths.test.js src/lib/anime/challenge-objectives.test.js
npm test
npm run build
```

Loading any starter overwrites only its scheduled weekdays, not workout history. **Don't load a different starter during an active Hero Path challenge**, since the challenge temporarily owns your Fixed Week schedule. Back up your data before making major changes.
