# Validation record — v0.1.0

Prepared on 2026-09-16. This records the checks actually performed in the build environment, not a claim about every browser, OS or agent release.

## Branding update

The initial, unpublished v0.1.0 package has been renamed to **AGENTS X-Ray**. Browser branding, Node CLI filename, package metadata, exported report names, standalone build output and documentation were updated together. All 60 Node tests, syntax checks, the standalone build and all 10 browser smoke checks were rerun successfully after this rename on 2026-09-16. The README screenshot was regenerated from that tested build. The existing RX rule identifiers remain stable. This does not verify the owner's GitHub deployment.

## Passed

- **60 Node.js automated tests**, run on Node.js v22.16.0 / Linux. No failures or skips in that run. Includes command-line invocation, import errors, context-sensitive script checks, duplicate detection, UTF-8 budgets, unknown/unreadable files, local-path handling, input limits, inert data and deterministic output.
- JavaScript syntax checks for the analyzer, browser adapter, CLI and standalone builder.
- A fresh standalone HTML build using CSP hashes.
- **10 browser smoke checks**, using Chromium through Python Playwright: synthetic demo output, English/Traditional Chinese switching, filtering, input invalidation, actual folder-file import, JSON download/parsing, inert pasted HTML with no external HTTP requests in tested flows, explicit text-only limitations, a 390-pixel layout without horizontal overflow, and no browser JavaScript errors.

The synthetic demo at `apps/web` returns **2 warnings + 6 suggestions**, 767 previewed source bytes and 195 review-candidate bytes. These numbers describe the supplied fixture, not a real project or measured improvement in model performance.

## Browser test method and limits

The test loads the generated standalone HTML with Playwright's `page.set_content`, preserving its real embedded JavaScript, CSS and Content Security Policy. Browser policy in the build environment blocked ordinary file/localhost navigation. Folder selection used Playwright's native file-input API with the actual synthetic project folder; JSON export used the normal Blob download flow.

Therefore, OS double-click launch, a deployed GitHub Pages URL, Safari, Firefox and Windows/macOS desktop integration were **not** end-to-end verified here. The product is designed for local HTML use and static hosting, but those environments should be checked after deployment. The mobile check verifies responsive layout, not mobile folder-picker support.

## Not claimed

No live Codex session was traced. No model latency, model answer-quality, exact tokenizer, prompt-cache, billed-token or cost benchmark was performed. No real external project adoption, GitHub star count, download count or Codex for Open Source acceptance has been established. GitHub Actions is configured but has not yet run in the owner's repository.

The tests are regression checks for the documented v0.1 behavior, not a complete security audit or proof of semantic accuracy.

## Reproduce

For the required automated suite:

```sh
npm test
npm run check
npm run build:standalone
```

The optional browser harness is `test/browser-smoke.py`. It needs Python and Playwright installed separately; these are **not required to use the product or run the Node tests**. Install the appropriate Chromium runtime for your environment. `XR_CHROMIUM_EXECUTABLE` can point to an existing compatible browser executable. The harness writes its results and screenshots to ignored `artifacts/`.

```sh
python test/browser-smoke.py
```
