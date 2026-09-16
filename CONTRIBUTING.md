# Contributing

Thank you for helping make instruction files easier to understand.

Before proposing a rule, describe a real failure mode and provide a minimal synthetic example. For false positives, include the rule code, selected cwd, configured fallback names and expected behavior; remove private paths and secrets.

Use Node.js 22 or newer. There are no runtime packages to install. Run `npm run check`, `npm test` and `npm run build:standalone` before submitting changes. Browser checks should cover text input, directory input, language switching, report export and narrow-screen layout. The optional browser smoke script uses Python Playwright; it is not required to run the product.

For changes to detection logic, include both a positive case and a case that must not be flagged. Keep stable rule identifiers, source-line evidence, documented assumptions and deterministic results. UI text should support English and Traditional Chinese. Do not add analytics, network calls or automatic edits without an explicit design discussion.

Use small pull requests. Explain what changed and what you tested. Do not inflate usage metrics, create artificial stars or describe planned capabilities as released features.
