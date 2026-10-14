# Phase 5 UI Revision 2 — Distinct arc and challenge pages

The dashboard's **Training Arc** and **Challenges** actions now open separate views.

- **Training Arc** is about the weekly program, phase timeline, and weekly exercise split. It retains the native openGym loading guard and review workflow. It does not contain optional challenge enrollment.
- **Challenges** is an optional three-tier ladder: complete the 7-day challenge to unlock 14 days, then complete 14 days to unlock 30 days. Unlocks depend on verified workout history, not simply elapsed days or manual checkboxes.
- Each challenge only counts qualifying workouts **after its own start time** on separate dates. Starting a new tier never removes records, changes the weekly plan, or recreates XP. The original seven-, fourteen-, and thirty-day challenge configurations and bonus XP are unchanged.
- Challenge tier state derives from existing `S.animeAscension.challenges[path]` and `S.workouts`. No migration or new persistent field is required. Earlier started out-of-order challenges are retained and can finish, but further enrollment obeys the ordered ladder.
- A tier cannot start while another tier for that character is in progress, or while openGym has an active workout. Other characters' challenge ladders remain independent.

## Fedora verification

```bash
cd ~/Desktop/projects/openGym

git apply --check anime-ascension-opengym-phase5-ui-revision2.patch
git apply anime-ascension-opengym-phase5-ui-revision2.patch
cd frontend
npx vitest run src/lib/anime/challenges.test.js src/lib/anime/training.test.js
npm test
npm run build
```

After rebuilding, test the two dashboard cards separately, start the 7-day tier, verify 14/30 remain locked, and complete a 7-day trial with qualifying workouts (or use automated fixtures). Check the 14-day tier unlocks while the 30-day tier remains locked. Switching characters should show separate progress.
