# Anime Ascension / openGym — fork feasibility and Saitama POC

Status: **prototype source integration**, not a verified production build.

## Pinned upstream

- Source: https://github.com/DuarteSantos8/openGym
- Base release: **v1.4.0** (`28b7e4d`, Oct 9 2026)
- License: upstream **AGPL-3.0**. Keep LICENSE and NOTICE.md.
- Exercise media belongs to Gym visual and has extra conditions; consult upstream NOTICE.md. The small prototype does not introduce, download, extract, or generate media.

## Source integrations

- `frontend/src/lib/anime/saitama.js`: pure mapping of conservative training slots to actual openGym catalogue exercise IDs.
- `scripts/install-anime-ascension-poc.mjs`: safely integrates the starter-plan registration into `frontend/src/lib/starter.js`.
- The installer adds the entry to `frontend/src/sheets.jsx` so it appears in Plan → Load starter plan.
- `frontend/src/lib/anime/saitama.test.mjs`: deterministic fixture tests.

The generated routines use the **existing openGym routine model and workout logger**. They appear in Plan on Monday/Wednesday/Friday after confirmation; the user can switch to openGym's rotating schedule after loading. Loading an existing weekday plan may replace the day's scheduled routine, so use a throwaway test profile initially.

## Important POC boundaries

- This version is a **beginner demonstration**, not a personalized training prescription. Do a readiness assessment before training. Users with limitations should seek professional guidance.
- The plan uses conservative bodyweight push, squat, bridge and core slots. A dumbbell row is included only if the current equipment profile permits it.
- If the installed exercise catalogue lacks any mandatory slot, the builder returns `null`: it does not insert an unknown exercise or mislabel a different movement.
- Bodyweight-only cannot guarantee equivalent pulling equipment. This pilot does not fake a row using an unrelated exercise. Add a safe back exercise to the library after movement review.
- Rest days are Tuesday, Thursday, Saturday, Sunday in the fixed-week template. A walk is optional; full 10 km running progression is **not** implemented here.
- No age/height/weight-based customization, load adaptation, injury-screening UI, trainer-approved movement progression, session midnight expiration, character-specific saved-session handling, historical data migration, Google login, XP, ranks or quests is implemented yet.
- No anime-specific reward is granted here. We must hook into **verified workout completion** rather than counting routine starts or checked individual sets before adding XP.

## Installation (on Fedora)

1. **Do not overwrite your current Anime Ascension repository.** Back it up and keep using it until a fork prototype passes acceptance testing.
2. Fork DuarteSantos8/openGym on GitHub, or clone upstream into a separate directory.
3. Check out the pinned tag and create a new feature branch:

   ```bash
   git clone https://github.com/DuarteSantos8/openGym.git anime-ascension-opengym
   cd anime-ascension-opengym
   git checkout v1.4.0
   git switch -c feature/anime-ascension-poc
   ```
4. Copy `anime-ascension-opengym-saitama-poc.patch` to that directory; run `git apply --check` followed by `git apply` only if the check succeeds. The patch adds a modular proof-of-concept and an integration installer.
5. Run `node scripts/install-anime-ascension-poc.mjs` from the repository root. It validates the v1.4.0 source before changing existing files; then inspect `git diff`.
6. Run tests:

   ```bash
   cd frontend && npm ci && npm test && npm run build
   cd ..
   ```
7. Start the self-built fork. Because prebuilt images are upstream binaries and do **not** include our changes, build locally:

   ```bash
   cp .env.example .env
   docker compose build
   docker compose up -d
   docker compose logs --tail=100
   ```
8. Open `http://localhost:8080`, create an isolated tester profile, add an equipment profile, then Plan → Routines → Load starter plan → Saitama · Hero Foundation. Confirm scheduling.
9. Ensure all exercises show real names/demonstrations and run a test workout; check rest timer, actual set logging, and history.

## Acceptance test / go-no-go

- [ ] `git apply --check` passes on v1.4.0 and integration installer runs successfully.
- [ ] Frontend tests and build pass on Fedora.
- [ ] Saitama appears in the native starter-plan chooser.
- [ ] Profile with bodyweight only generates 3 routines and no loaded equipment exercises.
- [ ] Profile with dumbbells adds an appropriate dumbbell row only if eligible.
- [ ] Exercise animations and instructions render where upstream rights permit.
- [ ] A complete test workout is saved to this test profile, history can be reopened, no phantom exercises.
- [ ] Scheduling and missed-day behavior is acceptable, without overwriting other user plans.
- [ ] Fork license, attribution, and media notice are retained.

If any critical checkbox fails, pause porting. Do not migrate users or delete the existing Anime Ascension repository.

## Integration map for future milestones

| Anime Ascension feature | Upstream integration point | Work required |
|---|---|---|
| Anime characters / training arcs | `frontend/src/lib/starter.js`, rotation and schedule | Program definition/arc state and reviewable prescriptions |
| Equipment-aware alternatives | `lib/equipment.js`, `lib/starter.js`, exercise catalogue | Strict slot-to-variant mapping; retain per-exercise history |
| Exercise instructions | `lib/exercises.js`, existing exercise details | Reuse existing media with license compliance |
| Save/resume and expiry | Workout session state, sync APIs | Character scoping and Asia/Manila midnight policy |
| XP / quests / achievements | Verified completion event / history | Durable idempotent reward ledger; server-side validation |
| Google login and email/password | `api/` passkey and password auth | Secure provider linking, verified email, rate limits |
| Migration from PostgreSQL | JSON export/import boundary | Field-by-field conversion and read-only dry run |

## Audit observations

**Good fit:** existing PWA + Android, native workout logging, exercise catalogue, equipment profiles, progression helpers, scheduling, backups, sync, passkeys. Keeping these reduces duplication.

**Architectural risk:** the repo is React + Vite, Node http, per-user JSON files, unlike our existing Next.js + Prisma + PostgreSQL. Most RPG code cannot be copied unchanged; port business rules, not DB models. User identity and XP transactions need deliberate designs.

**UX risk:** a fixed-week starter routine may repeat or reschedule differently than our rolling anime arcs. Verify native rotation mode before promising adaptive recovery-aware scheduling.

**Security:** inherit upstream's maintained authentication and sync architecture, but audit new Google/credential endpoints and never weaken its CSRF/origin checks.

**Maintenance:** pin the release, keep the fork changes modular, and periodically merge upstream security fixes. Favor source integration over copying the upstream catalogue/media.
