# Saitama POC test fixes

Applies after the original Saitama POC patch **and** `node scripts/install-anime-ascension-poc.mjs` have been run on openGym v1.4.0.

## What changed

- Saitama's test uses the upstream **Vitest** runner rather than Node's native `node:test` runner. Vitest previously found the `.test.mjs` file but reported an empty suite.
- The existing starter-plan tests now expect the added fifth starter plan.
- Saitama's equipment resolver always calls openGym's `eqAvailable`, including for bodyweight exercises that require accessories, e.g. a bench or pull-up bar.
- Three upstream tests that depended on the host timezone now assert the intended **local** date or use a local test clock. No production time/date logic was changed.

## Run on Fedora

```bash
cd frontend
npm test
npm run build
```

The test runner can use `Asia/Manila`, `UTC`, or other system timezones; there is no need to change your machine's timezone.

## Review before moving forward

- All tests must pass on your machine.
- Load Saitama's plan into a **throwaway** profile and confirm equipment eligibility, images, and scheduling.
- This POC does not yet implement anime XP, verified completion, or the final personalized workout algorithm.
