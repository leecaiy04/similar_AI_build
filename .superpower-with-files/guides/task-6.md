# Guide - Task 6: Integrate Pages, Storage Migration, and CI Verification

## Files

- Create: `src/core/state/storageKeys.ts`
- Create: `src/core/state/migrations/v2.ts`
- Create: `src/core/state/versionedStorage.ts`
- Create: `src/core/state/__tests__/versionedStorage.spec.ts`
- Modify: `.github/workflows/pages.yml`
- Modify: `.github/workflows/deploy.yml`
- Modify: `README.md`

## Step 1: Write failing migration and regression tests

Add tests that validate:
1. old storage payload migration into new schema
2. missing fields fallback behavior

## Step 2: Run tests to fail

Run: `npm test -- src/core/state/__tests__/versionedStorage.spec.ts`
Expected: FAIL because migration helpers are missing.

## Step 3: Implement migration and CI hooks

1. Add versioned storage helpers and migration map.
2. Update CI workflows to run `npm test` before build jobs.
3. Document new architecture and testing command in README.

## Step 4: Re-run tests and build

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

## Step 5: Optional Rust verification (only if Rust was touched)

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS.

## Step 6: Commit

```bash
git add src/core/state .github/workflows/pages.yml .github/workflows/deploy.yml README.md
git commit -m "chore: add storage migration and test gate in ci"
```
