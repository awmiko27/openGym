# Phase 4 — Goku and Sung Jinwoo training paths

Anime Ascension adds two fictional-character-inspired **practical** training paths to openGym without introducing another equipment setting, weight record, or workout logger.

## Programs

| Character | Monday | Wednesday | Friday |
| --- | --- | --- | --- |
| Saitama | Strength | Endurance | Conditioning |
| Goku | Saiyan Strength | Controlled Power | Conditioning |
| Sung Jinwoo | Hunter Strength | Agility | Endurance |

Every day uses openGym catalogue exercises, standard repetition-based sets, and existing video demonstrations. Program creation reuses openGym's `activeProfile(S)` and `loadStarterPlan(planId, profile, animeProfile)` established in Phase 3 Revision 4. Filter off means no restriction; filter on honors openGym's active equipment profile. There are no bodyweight-only or other equipment controls in Anime Ascension.

Age (70+ volume cap), goal and experience affect **starting** set/repetition ranges; height is informational. No fictional extreme prescriptions, timed-only circuits or automatic week-to-week overload. The equipment-eligible exercise selection is intentionally conservative: if a minimum safe catalogue is missing, plan construction returns `null` and does not change the weekly plan.

Loading a different path reassigns **Monday / Wednesday / Friday** in the fixed-week schedule but retains previous routines and workout history. Only one Anime Ascension path is active for session snapshots; users can inspect XP for any character with tabs on the RPG page. XP remains based on actual saved workout proof. Earlier Saitama snapshots and earned XP remain recognized.

## Fedora verification

```bash
cd ~/Desktop/projects/openGym
git apply --check anime-ascension-opengym-phase4.patch
git apply anime-ascension-opengym-phase4.patch
cd frontend
npx vitest run src/lib/anime/character-paths.test.js src/lib/anime/profile.test.js src/lib/anime/rpg.test.js src/lib/anime/saitama.test.mjs
npm test
npm run build
```

After rebuilding Docker, open `#/anime` to select Goku or Jinwoo, load the plan and inspect its three workouts in Plan. Start a new workout, inspect potential XP and finish a complete and incomplete workout; inspect each character's totals via `#/anime/rpg` tabs. Legacy Saitama workouts still count **only** in the Saitama tab.

## Scope / future work

The old XP rules remain strict: substitutions and timed sets do not qualify. The plan generator does not set personal working weights, automatically increase loads every week, or alter openGym's existing equipment settings. Character names are themed descriptions, not licensed training regimens.
