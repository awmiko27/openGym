# Phase 5 — Canon-inspired training revision

**Scope:** A direct incremental patch on `feature/anime-ascension-poc` following Phase 5A/B and the corrected Phase 5 RPG snapshot test. No native openGym starter/finish code or settings are replaced. Original Anime Ascension-only program descriptions, not a copy of OtakuAthlete.

## Program identity and pacing

| Character | Source inspiration | Practical weekly schedule | Phases |
|---|---|---|---|
| Saitama | One-Punch Man: 100 push-ups/sit-ups/squats + 10km | Mon push-up, Tue squats/core, Thu run preparation, Fri circuit, Sat endurance | 9 weeks; 3 phases |
| Goku | Dragon Ball: Roshi conditioning, progressive resistance, martial arts | Mon Turtle School, Tue upper strength, Thu legs/power, Fri conditioning | 10 weeks; 2 phases |
| Jinwoo | Solo Leveling: the System's 100/100/100 + 10km daily quest | Mon quest push, Tue squats/core, Thu agility, Fri dungeon strength, Sat endurance | 9 weeks; 3 phases |

**Wednesday and Sunday** are reserved as rest/optional easy activity for Saitama and Jinwoo; Goku also has Saturday off. Each session is a different openGym rep-based prescription, selected from the user's real openGym exercise catalogue and equipment policy. Optional equipment is never mandatory; bodyweight-only isn't a separate setting in Anime Ascension. Experience, goal and week adjust starting training volume.

The **fictional benchmark is an inspiration, not an instruction to perform extreme daily training**. Running/walking guidance and martial-arts skill sessions are displayed as optional, **not automatically logged, validated, or counted for XP**. Their logged-distance/timed verification is future work. This patch does not claim to deliver the complete fictional program. It does not reproduce the OtakuAthlete session data.

## Week unlock and challenge rules

- Training weeks now require **5 distinct verified slots for Saitama and Jinwoo** or **4 for Goku**, on separate workout dates, with the prescribed training week attached to the workout snapshot. Week 2 requires explicitly loading the new native plan.
- For five-day programs, the five qualified sessions must span six or more calendar dates to enforce at least one day without a credited session; other recovery cannot be inferred from history alone.
- Legacy A/B/C history and XP remain recognized by the RPG engine. Old three-day workouts can count for their named slots toward the new first week, but **they do not unlock the next week without the additional D/E (or D) sessions**. Old historical workouts before the training arc started remain excluded.
- The existing 7/14/30-day character challenges continue tracking fully saved sessions; because split days can be consecutive, challenge verification requires unique calendar dates instead of a blanket two-day separation.
- The loader continues to refuse replacing a plan during an active session, and respects native openGym equipment filtering and fixed-week mode.
- New managed-plan receipts allow clearing **only unchanged, previously Anime Ascension-managed** weekdays when switching characters. Custom day assignments and old untracked days are preserved. Review your first switch from an older three-day plan in the Plan UI for a leftover Wednesday routine.

## Apply / test (Fedora)

```bash
cd ~/Desktop/projects/openGym
git branch --show-current
git status --short
git apply --check anime-ascension-opengym-phase5-canon-revision.patch
git apply anime-ascension-opengym-phase5-canon-revision.patch
node scripts/phase5-canon-offline-check.mjs
cd frontend
npx vitest run src/lib/anime/canon-programs.test.js src/lib/anime/schedule.test.js src/lib/anime/saitama.test.mjs src/lib/anime/character-paths.test.js src/lib/anime/training.test.js src/lib/anime/challenges.test.js src/lib/anime/phase5-builder.test.js src/lib/anime/rpg.test.js
npm test
npm run build
cd ..
git diff --check
docker compose up -d --build
```

After rebuilding, **Load Training Plan** again, inspect each day in Plan, and check an active session's XP preview. A newly loaded program does **not** change past workout records. Switch to a different character only after finishing/discarding the active workout, as before. Test Phase 5 unlocks in the automated suite, not by fabricating personal workout history.

If the generic openGym `starter.test.js` still hard-codes `{ id: 'saitama-foundation', days: 3 }` from the original proof of concept, update that expected count to 5: the code now truthfully schedules five distinct sessions. Any test asserting exactly three generated character workouts likewise needs its expected schedule aligned with the new 5/4/5 program design.

## Verification scope

- Local smoke tests exercise real exported JavaScript functions from the Phase 5 source bundle, and validate all new snapshot slots and week unlocks.
- This patch is based on the **previously delivered Phase 5 ZIP source**, plus the earlier Phase 4 character and Saitama tests (reconstructed from shipped patch files), *not the exact current Fedora checkout*. Full Vitest, Vite, and browser checks remain required there.
