# Phase 5 — Temporary Major Challenge Mode (revision)

This patch changes *new* major challenge enrollments into opt-in schedule replacements. Existing v1 side-quest enrollments are preserved; incomplete old-style challenges may be cancelled from the challenge page before starting the new mode. No migration removes completed badges or workout history.

## Behavior

- From `#/anime` → **Challenges**, select a character challenge, **Review challenge workouts**, then **Start**. Only Tier I is initially available; Tier II and III unlock after verified completion of the previous tier.
- Requires openGym **Fixed Week** mode and no active workout. The current weekly schedule, its assigned routine IDs, the active anime character, and the currently loaded training-week state are preserved in `S.animeAscension.challengeMode`.
- Challenge Day 1 is **the user's local day when they press Start**. The selected workouts are rotated around that day, preserving relative recovery spacing. A Wednesday start schedules the first trial on Wednesday, regardless of which weekday the main arc uses. Fixed Week repeats the trial template until the challenge finishes; 7/14/30 days are soft target windows, not a day-by-day dated scheduler.
- Challenge sessions are built using the same openGym exercise catalog and `activeProfile(S)`/`eqAvailable` equipment rules as the anime starter programs. Tier I installs 3 character-themed sessions, Tier II 4, Tier III 4 (Goku) or 5 (Saitama/Jinwoo). Repetition targets scale modestly, with capped sets and reps. Other days are recovery days.
- Challenge workouts have dedicated routine names ending ` · Trial <id>`. Their saved RPG snapshot contains `challengeId` and can award normal **base** workout XP only once. For new challenge attempts, **only** verified snapshots carrying the matching `challengeId` count toward its bonus or tier unlock; each scheduled workout slot must be attempted before repeating that slot for progress.
- Regular training-arc progress is paused during challenge mode: challenge-tagged workout records never count toward training-week advancement. The original training `programs` records, including its `startedAt` and `loadedWeek`, remain intact.
- On verified completion, visiting `#/anime` automatically restores the saved weekly calendar (if the user has no active workout). It also can be finalized from the Challenges page. Cancelling from that page restores immediately and withholds the challenge bonus; cancelled tiers may be restarted.
- If a weekday was manually edited in openGym after challenge activation, the restore **does not overwrite** that day's unrelated assignments; any references to the challenge's temporary routines are stripped so there are no dangling calendar entries. The dashboard displays a warning to review preserved manual edits.
- On completion/cancellation, **all temporary challenge templates created by that attempt are removed from `S.routines`** using the stored routine ID receipt. `S.workouts` is not modified: the saved exercise rows, names, and RPG evidence remain in History. Existing user routines are preserved.
- One major challenge globally at a time. Loading normal Anime Ascension training is blocked during challenge mode. Ordinary workout-derived daily and weekly XP quests continue; the same saved workout never earns duplicate base workout XP.
- 7/14/30 days are thematic target windows, **not hard calendar deadlines**. Missed sessions extend the attempt. Running distance and martial-arts practice remain unverified and confer no XP.

## Known boundaries

- Restoration occurs upon returning to `#/anime`, not while another openGym page stays mounted. A new training plan cannot load until challenge mode ends.
- This revision uses proven repetition-based exercises. It does **not** track timed workouts, actual running distance, resistance changes, or fictional 100/100/100 benchmarks.
- The program is an original, canon-inspired implementation. It does not import copyrighted workout text or media from OtakuAthlete.
- Although full openGym test/build verification must happen in the user's Fedora checkout, the patch changes only Anime Ascension-owned modules and UI. It does not edit `sheets.jsx`, `starter.js`, the openGym workout logger, or the equipment settings.

## Fedora check

```bash
cd ~/Desktop/projects/openGym
git apply --check anime-ascension-opengym-phase5-challenge-mode.patch
git apply anime-ascension-opengym-phase5-challenge-mode.patch
node scripts/phase5-challenge-mode-check.mjs
cd frontend
npx vitest run src/lib/anime/challenge-mode.test.js src/lib/anime/challenges.test.js src/lib/anime/training.test.js src/lib/anime/rpg.test.js src/lib/anime/plan-preview.test.js
npm test
npm run build
cd ..
git diff --check
git diff --stat
docker compose up -d --build
docker compose ps
```

## Manual checklist

1. With no workout running, start Saitama Tier I. Confirm openGym Plan changes to the three review-listed trial routines and rest days. Confirm normal Week N appears paused on `/anime`.
2. Finish a full trial workout and check the RPG workout reward. Partially finishing a workout must not count toward the trial.
3. Verify Day 1 is the weekday you started (for example, Wednesday); the first challenge routine must appear there. Complete three **different** trial routine slots on different dates. Return to `/anime`: normal weekly plan should return, all challenge-only routine templates should disappear, Tier I badge should be earned, and Tier II should unlock. For immediate testing, run the deterministic Vitest integration test, which simulates fully completed workout snapshots on three different days WITHOUT adding fake history to your account.
4. Start Tier II, then cancel. Original calendar must return, workout history remain, and no Tier II bonus XP appear. Tier II should be available to retry.
5. While another trial is active, try to load a normal training plan or start another trial. Both should be blocked. A running workout must prevent cancelling or returning to the arc.
6. Test a manually edited weekday during a challenge: it should survive restoration; other untouched weekdays return to their previous assignments.
7. Test changing characters and equipment filter: only openGym Settings controls available equipment; no duplicate Anime Ascension equipment choice exists.

## Testing without waiting seven days

The 7-day tier needs **three verified sessions on distinct dates**, not seven daily sessions. It cannot be legitimately completed in one calendar day through the normal UI, and manual backfills do not contain the strict Anime Ascension snapshot proof. Avoid changing your system clock or editing production workout records.

Run the focused simulator instead:

```bash
cd frontend
npx vitest run src/lib/anime/challenge-mode.test.js
```

The test `finishes Tier I and unlocks Tier II from three simulated saved sessions` constructs three full workouts on separate simulated dates, checks the reward and next-tier unlock, verifies the restored calendar and confirms that the temporary routines were deleted while history remained. It does not touch your real app data.

For the real browser smoke test, start a challenge, verify the first scheduled day matches today's weekday, then cancel it to verify restoration and cleanup. For a real full completion, train on the three scheduled workout days.
