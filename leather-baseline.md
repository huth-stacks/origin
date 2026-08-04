# Leather Local Baseline

Baseline established on August 4, 2026 before any Origin source changes.

## Source

- Repository: `leather-io/mono`
- Branch: `dev`
- Commit: `d98bd9a61b2f066041082b85256da9a96519d7b6`
- Local path: `/Users/alexander/Code/leather-origin-demo`
- Worktree after verification: clean

## Toolchain

- Node: `22.22.0`
- Repository minimum: `>=22.15.0`
- pnpm: `10.33.0`
- Extension: `@leather.io/extension` `6.107.0`

Node 22 is selected explicitly for Leather commands:

```sh
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin
```

## Install

Command:

```sh
pnpm install --frozen-lockfile
```

Result: succeeded across all 28 workspace projects with the committed lockfile.

## Production extension build

Command:

```sh
pnpm build:extension
```

Result: passed, 20 of 20 Turborepo tasks successful. The generated extension is at:

```text
/Users/alexander/Code/leather-origin-demo/apps/extension/dist
```

The generated manifest is Manifest V3, identifies itself as `Leather Dev`, and registers `background.js` as a module service worker.

## Unit tests

Command:

```sh
pnpm --filter @leather.io/extension test:unit
```

Result:

- 87 test files passed
- 573 tests passed
- 0 failures

## Development process

Command:

```sh
PORT=8080 pnpm --filter @leather.io/extension dev
```

Result:

- Webpack development build completed successfully
- Extension development server listening on `http://localhost:8080`
- Redux DevTools listening on `http://localhost:8000`
- `manifest.json`, `index.html`, and `background.js` return HTTP 200

## Chromium smoke test

A clean Playwright Chromium persistent context loaded `apps/extension/dist` as an unpacked extension.

Verified:

- Manifest V3 service worker registered from `background.js`
- Extension `index.html` opened under a `chrome-extension://` URL
- Page title was `Leather`

The extension ID is generated from the temporary browser profile and is not a stable fixture.

## Existing baseline warnings

The unmodified production build succeeds with existing warnings that should not be attributed to Origin:

- `HiroMessage` is re-exported by the extension but absent from the current `@leather.io/query` build exports.
- Several generated bundles exceed webpack's recommended asset-size threshold.
- Browserslist data is reported as stale.
- The build logs that a root `.env` file is absent, but the local development and production builds still succeed.
- The current SVG build emits repeated `removeViewBox` configuration warnings.

Origin work must keep these separate from any new warnings or failures introduced by the feature branch.
