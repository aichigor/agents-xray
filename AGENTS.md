# Working agreements

- Keep the shared analysis engine dependency-free and deterministic.
- Do not execute inspected commands, upload inspected text, or automatically delete instructions.
- Treat findings as evidence for review; do not claim measured token savings or better model performance.
- Run `npm run check` and `npm test` after changes.
- Add positive and negative regression fixtures for every new rule.
- Keep the browser adapter compatible with a standalone local HTML build.
- Preserve deliberate defects in `examples/demo-project/`; they are test fixtures.
- Document detection limits in `docs/RULES.md`.
