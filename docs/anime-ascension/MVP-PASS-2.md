# Anime Ascension — MVP Stabilization Pass 2

## Scope

This patch adds **read-only reward and qualification feedback** to openGym’s existing workout-completion panel, the Anime dashboard, and the Challenges page. It does not change XP formulas, challenge tiers, training schedules, the workout finish flow, backup schema, or openGym's workout records. It contains no same-day QA bypass.

- During a trial, the native workout reward panel warns immediately if no Anime proof snapshot exists. After saving, the native completion summary also explains missing proof or incomplete prescription; normal XP and challenge completion are reported separately.
- After saving a challenge workout and returning to `#/anime` → Challenges, the latest relevant saved session is marked *credited* or *saved but not credited*, with a targeted explanation (missing snapshot, modified/uncompleted set, fewer reps than prescribed, sequence, same calendar day, assessment target).
- After automatic challenge return, the dashboard shows the completed challenge name, derived XP, badge date, unlocked tier, and calendar restoration. If a prior workout is later edited/deleted, the display stops claiming the XP is still qualified.
- Challenge-completion tiers also display the verified final assessment score when present.
- Mobile layouts wrap long challenge names/rewards and provide full-width, tappable challenge buttons on small screens.

## Manual acceptance tests (use a disposable profile / backed-up data)

1. Start a challenge and log one fully completed prescribed session. Visit Challenges: a confirmation should show Trial 1 credited and the corresponding `1/N` progress.
2. Start another session but leave a set unchecked, or log fewer reps than prescribed. Save it through openGym, then revisit Challenges: it should say **saved, but not credited**, giving the precise exercise/set reason. History still shows Done; challenge progress does not increase.
3. Use a legitimate plan workout; verify normal working repetitions. A cardio/time exercise in a rep trial must not be credited or awarded anime XP. No new duplicate XP should appear after refresh.
4. Meet the final assessment after the required distinct training dates. Return to `/anime`: the normal training week should restore automatically. Verify the receipt's earned XP and next tier; reload to verify the message is stable.
5. Edit or delete the saved final workout and return to `/anime`: no stale earned-XP claim should remain. Restore the workout/backup; the derived tier state should recover correctly.
6. Cancel a newly started challenge. The last success receipt should not appear as though a cancelled attempt earned XP; the original plan and workout history remain intact.
7. Test at 320, 375, and 768 CSS px and desktop; check buttons, titles, progress, and assessment details for horizontal overflow and keyboard focus.
8. Export a full openGym backup, restart the Docker stack, refresh and compare character XP, arc week, challenge history, original routine schedule. Restore the backup in a disposable profile and repeat. Do not perform test imports or deletes on your actual training account.
9. Verify three characters remain isolated; a Saitama trial cannot advance Jinwoo or Goku tiers; XP remains derived exactly once per workout ID.

## Expected regression commands

From the project root:

```sh
node scripts/phase5-cardio-proof-regression.mjs
node scripts/phase5-mvp-challenge-check.mjs
node scripts/anime-mvp-acceptance-audit.mjs
cd frontend
npx vitest run src/lib/anime/challenge-feedback.test.js src/lib/anime/challenges.test.js src/lib/anime/challenge-mode.test.js
npm test
npm run build
cd ..
git diff --check
git diff --stat
docker compose up -d --build
docker compose ps
```

The direct browser and full Fedora tests are the final release gates. This patch must be applied **after** the permanent cardio proof fix and **after** removing both temporary QA patches.
