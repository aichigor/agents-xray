# Validation record — v0.1.0

Prepared on 2026-09-16. This records checks that were actually performed; it is not a claim about every browser, OS, agent release or real-world project.

## Branding and bilingual UI update

The initial v0.1.0 package was renamed to **AGENTS X-Ray**. Browser branding, Node CLI filename, package metadata, exported report names, standalone build output and documentation were updated together. The web UI is English-first with a Traditional Chinese switch. The existing RX rule identifiers remain stable.

## Passed before publication

- **60 Node.js automated tests**, run in the original build environment on Node.js v22.16.0 / Linux. No failures or skips in that run. Coverage includes command-line invocation, import errors, context-sensitive script checks, duplicate detection, UTF-8 budgets, unknown/unreadable files, local-path handling, input limits, inert data and deterministic output.
- JavaScript syntax checks for the analyzer, browser adapter, CLI and standalone builder.
- A fresh standalone HTML build using CSP hashes.
- **10 browser smoke checks**, using Chromium through Python Playwright: synthetic demo output, English/Traditional Chinese switching, filtering, input invalidation, actual folder-file import, JSON download/parsing, inert pasted HTML with no external HTTP requests in tested flows, explicit text-only limitations, a 390-pixel layout without horizontal overflow, and no browser JavaScript errors.

The synthetic demo at `apps/web` returns **2 warnings + 6 suggestions**, 767 previewed source bytes and 195 review-candidate bytes. These numbers describe the supplied fixture, not a real project or measured improvement in model performance.

## GitHub Actions verification

After publication to `aichigor/agents-xray`, the repository workflow ran successfully on **2026-09-16** across all four configured combinations:

- Node 22 / Ubuntu — passed
- Node 22 / Windows — passed
- Node 24 / Ubuntu — passed
- Node 24 / Windows — passed

Each job completed the JavaScript syntax check, regression test suite and standalone-browser build. This verifies the current repository can pass its configured CI matrix; it is not a security audit or a guarantee about untested platforms.

## Browser test method and limits

The local smoke test loads the generated standalone HTML with Playwright's `page.set_content`, preserving its embedded JavaScript, CSS and Content Security Policy. Folder selection used Playwright's native file-input API with the actual synthetic project folder; JSON export used the normal Blob download flow.

The GitHub Pages site is publicly reachable at <https://aichigor.github.io/agents-xray/>. Publication itself has been confirmed by the repository owner. The automated browser harness has **not** yet been run directly against that deployed URL, Safari or Firefox. The mobile check verifies responsive layout, not mobile folder-picker support.

## Not claimed

No live Codex session was traced. No model latency, answer-quality, exact tokenizer, prompt-cache, billed-token or cost benchmark was performed. No real external-project adoption, download count, or Codex for Open Source acceptance has been established.

The tests are regression checks for the documented v0.1 behavior, not proof of semantic accuracy for every instruction file.

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
