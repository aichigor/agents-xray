# Rule reference — v0.1.0

Rules are deterministic heuristics or snapshot checks, not AI-generated verdicts. Source line numbers are one-based. Rule identifiers are stable within the v0.1 series. No automatic fixes or suppression syntax are implemented yet.

| Code | Default severity | Evidence and boundaries |
| --- | --- | --- |
| RX001 | info | Repeated normalized line in one document, at least 24 UTF-16 code units. Trims list markers and collapses whitespace; preserves case and punctuation. Code, blockquotes, table rows and example sections are excluded. Repetition can be intentional. |
| RX002 | info | Same normalized line across files in the simulated loaded chain. Does not compare unloaded siblings. |
| RX003 | info | Matches a small list of standalone generic English/Traditional Chinese role or encouragement sentences. Not a general semantic detector; useful statements can be matched. |
| RX004 | info | File exceeds an arbitrary review threshold of 8,192 UTF-8 bytes. Length is not a defect. This threshold is different from the project loading budget. |
| RX005 | info | A recognized history/conversation/progress heading contains at least six nonempty body lines. Important enduring decisions should remain discoverable. |
| RX006 | info | A line exceeds 8,192 UTF-16 code units. Fine-grained linting for that line is skipped to bound regex work. The file still participates in size/loading checks. |
| RX101 | info | A nonempty higher-priority same-directory file was selected. A nested override does not discard parent instruction documents. Unreadable higher-priority candidates produce an uncertain state instead. |
| RX102 | warning | The simulated raw project-file byte budget excludes or truncates a selected document. The default budget is 32,768; not a token count or exact runtime trace. |
| RX103 | warning | An instruction filename was listed but its contents are unavailable. Later inclusion/budget can become uncertain. |
| RX201 | warning | A simple explicit `npm run NAME`, `pnpm run NAME`, or `yarn run NAME` has no string-valued script of that name in the nearest package.json above the selected cwd. Only loaded command lines are checked. This is a cwd-specific finding, not proof of runtime failure. |
| RX202 | warning | A simple local path is absent from the supplied inventory. Markdown links resolve relative to their instruction file; inline code references can resolve from that directory or the chosen project root. Only project mode enables this check. |
| RX203 | info | A parsed script snippet includes recognized workspace/directory/optional flags or shell operators. Scope is not evaluated; manually review it. |
| RX204 | error | The relevant supplied package.json cannot be parsed as a JSON object. Script checks are skipped. |

## Discovery profile

The selected folder is explicitly assumed to be the project root. Walk only from that root to the configured cwd. At each level try `AGENTS.override.md`, then `AGENTS.md`, then configured fallback names; skip blank candidates and select at most one nonempty candidate. The chain is ordered from root to cwd.

States are `active`, `truncated`, `budget-exhausted`, `overridden`, `empty`, `out-of-scope`, `unreadable`, or `uncertain`. They describe **this snapshot and these settings**. The profile is project-only and intentionally does not claim to expose a real agent session.

Raw source bytes are added without runtime wrappers/separators. A truncated preview retains only complete UTF-8 characters. If a cutoff splits a character, the corresponding unused tail bytes are not reassigned to a later file. A real Codex release may have different boundary behavior. Global rules and config/profile/trust discovery are not implemented.

Official discovery reference, reviewed 2026-09-16: <https://developers.openai.com/codex/guides/agents-md>.

## Deliberate non-goals

No analysis of code symbol existence, imports, command exit status, URLs, arbitrary natural-language contradictions, every language's package manager, or prompt effectiveness. No instructions are automatically deleted. No LLM is called to judge whether another LLM needs a rule.

Path checks skip external/absolute paths, URL-like values, globs/placeholders, excluded dependency/output directories and obvious creation/example statements. A generated file outside those directories may still be reported; confirm its lifecycle yourself. Markdown parsing is deliberately lightweight, not a complete CommonMark implementation.

Command checks support simple explicit run snippets only. Shorthand commands, shell variables, directory changes across preceding lines, custom package-manager settings, workspace resolution and agent execution behavior are not modeled. The engine assumes the selected cwd when it can match a command; conclusions remain contextual.

## Size and input guards

At most 30,000 inventory entries, 1 MiB per read text file, and 8 MiB combined read text. Only the first 20,000 source lines per instruction file receive fine-grained lint checks; report notes disclose skipped lines. Very long individual lines produce RX006. All these are project implementation limits, not limits imposed on your AI provider.

The browser displays at most 300 findings at a time; JSON/Markdown exports contain the complete report generated by the bounded lint pass. Browser folder selection cannot represent empty directories. The CLI records empty directories but skips symbolic links.

## Metrics

`loadedBytes` is the sum of included raw source-byte prefixes. `sourceBytes` counts supplied readable instruction files, including those outside the current chain. `reviewCandidateBytes` is the union of loaded complete lines marked by RX001/RX002/RX003. Lines flagged by multiple rules count only once. Line endings are not counted in this candidate metric.

It is **not** a validated deletion amount, model-token count, monetary estimate or measured latency improvement. Repeated security or workflow constraints may deserve to stay.
