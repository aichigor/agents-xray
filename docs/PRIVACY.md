# Privacy and security boundaries

## What is read

The browser receives access only to files the user explicitly selects. This application reads the contents of recognized instruction files and `package.json`. It uses other supplied filenames as an inventory; it does not read their bodies. Generic source files, .env contents, binaries and images are not read by the analyzer. A custom fallback name is an explicit additional file-content selection.

The CLI enumerates the chosen folder, excludes documented dependency/output folders, does not follow symbolic links, and uses bounded text reads for the same recognized filenames. It never invokes the commands written in instructions or package scripts. It does not automatically load home-directory instructions, inspect environment variables, or read Codex config files.

Skipped and unreadable instruction contents are reported. A malicious or concurrently modified filesystem is not a sandboxed target; run the tool only with the OS access you intend to grant it.

## Where the data goes

The app has no API integration, remote analytics, external font requests or persistent browser storage. It does not transmit inspected content to OpenAI, GitHub, or an analysis server. A restrictive Content Security Policy disables outbound fetch connections and unapproved script execution. Inspected text is rendered with `textContent`, not executed or interpreted as HTML.

When hosted on GitHub Pages, the initial website/asset requests are still served by GitHub. Hosting-provider logging and browser extensions are outside this application's control. “Local analysis” is not a claim that a hosted webpage causes no network traffic at all.

## Exports and public repositories

Markdown reports contain evidence excerpts and filenames. JSON reports additionally include simulated merged instruction content. Both can contain personal information, secrets, internal project names or proprietary instructions. Review them before sharing. Local downloads are initiated only after confirmation in the browser edition.

Uploading AGENTS X-Ray's source repository to GitHub is separate from choosing a folder to inspect. Do not add your actual proprietary projects or private audit reports to the public source repository. `.gitignore` is not a filter for GitHub's browser upload interface.

Refresh/close the browser tab to release the application state. Exported report files remain wherever you saved them. No secure deletion is promised.

## Reporting an issue

Use a minimal, synthetic reproduction. Do not paste real credentials, private repository paths or unredacted reports into a public Issue. For a security vulnerability, use GitHub's private vulnerability reporting if the repository owner has enabled it; otherwise request a private contact route without disclosing exploit details publicly.
