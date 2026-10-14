# Anime Ascension — MVP Stabilization Pass 1

This revision fixes the two acceptance issues identified after Phase 5 MVP Challenges. It does not add characters, equipment controls, another workout logger, or any new mutable XP ledger.

## Session-by-session challenges

- New 7-, 14-, and 30-day challenge attempts have **3, 6, and 12 unique prescribed workouts** respectively, with distinct routine IDs and frozen exercise targets.
- A 14- or 30-day attempt displays **only the current block** (3–5 sessions, depending on the tier and character) in openGym's existing Fixed Week plan.
- After completing the current block's verified workouts, return to `/anime` to install the next block. No calendar updates occur while openGym has an active workout.
- The checkpoint and final assessment each have their own unique template. Their elevated prescriptions cannot be accidentally assigned to an earlier session via repeated Fixed Week routines.
- The final block may display its pending final assessment ahead of the assessment date, but that session is not credited until its unique workout ID is completed in the correct challenge sequence.
- A failed final performance target can be retried without restarting or receiving a duplicate completion bonus.

## Automatically return to training arc

When the saved final assessment passes verification and no workout is active, returning to `/anime` automatically removes all generated challenge routines and restores the pre-challenge calendar (with the existing manual-edit protection). The completion screen also shows the badge and reward confirmation. The manual finish button remains as a fallback while the challenge view is open.

## Compatibility and boundaries

- Existing v1/v2/v3 challenge attempts and old badges remain readable. Only **new** enrollments receive staged mode v2 (and a v3 workout-proof receipt listing all unique sessions).
- The original arc's week does not advance on challenge workouts. Workout history is never deleted by routine cleanup.
- New 14-/30-day challenges cannot show the entire future date-specific calendar at once: openGym's Fixed Week UI can only show the **current weekly block**. After finishing a block, revisit `/anime` before continuing.
- Starting a challenge, cancelling it, or loading another plan remains blocked during an active openGym workout.
- Timed cardio, actual running distance, and external martial-arts sessions are still not verified by the MVP proof checker and cannot grant challenge-performance rewards.
- This is a code-level stabilization, not a substitute for testing an actual browser session, mobile viewport or an isolated backup/restore.

## Fedora validation

Run these from the repository root after applying the incremental patch:

```bash
node scripts/phase5-challenge-mode-check.mjs
node scripts/phase5-mvp-challenge-check.mjs
node scripts/anime-mvp-acceptance-audit.mjs
cd frontend
npx vitest run src/lib/anime/challenge-mode.test.js src/lib/anime/challenge-objectives.test.js src/lib/anime/challenges.test.js
npm test
npm run build
cd ..
git diff --check
git diff --stat
docker compose up -d --build
docker compose ps
```

## Manual smoke test (without altering the computer clock)

1. In a separate test profile, review your current weekday plan and start a new Tier I challenge. Confirm Day 1 matches today and only the currently due sessions are scheduled.
2. Cancel and confirm original calendar restoration and deletion of generated trial routines, without changing completed workout history.
3. For tier II/III, use the standalone simulator to test all 6/12 sessions immediately. On your real account, complete the first block normally, then return to `/anime` to verify the next block's new prescriptions appear.
4. After a genuine final qualifying session, visit `/anime` and verify automatic restoration and reward confirmation. Verify a second visit does not duplicate rewards or change the calendar.
5. Refresh and confirm challenge badges, XP, history and arc progress persist; test a backup/restore in a separate throwaway environment before MVP sign-off.
