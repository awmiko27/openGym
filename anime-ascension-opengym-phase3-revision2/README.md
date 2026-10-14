# Anime Ascension Phase 3 — Revision 2

Simplifies onboarding without a new installation script.

## Apply

```
cd ~/Desktop/projects/openGym
git apply --check anime-ascension-opengym-phase3-revision2.patch
git apply anime-ascension-opengym-phase3-revision2.patch
cd frontend
npx vitest run src/lib/anime/profile.test.js
npm test
npm run build
```

The patch expects Phase 2 onboarding and Phase 3 RPG navigation installed. It
changes only the Anime Ascension onboarding view, profile module, tests, CSS,
and a new documentation file. It does not touch the original workout engine.

See docs/anime-ascension/PHASE-3-REVISION-2.md for migration and manual checks.
