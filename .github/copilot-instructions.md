## Purpose

These instructions help an AI coding assistant become productive in this repository quickly. They focus on the runtime, architecture, developer workflows, integration points, and code patterns that recur across the project.

## Quick summary

- Runtime: Bun. Run generators with `bun run start` (see [package.json](package.json)).
- Formatting / linting: Biome (`bunx biome format`, `bunx biome lint`).
- Main entry: `src/index.ts` orchestrates generation; output is `README.md`.
- GitHub access: uses `@octokit/rest` and respects `GITHUB_TOKEN` / `GH_TOKEN` env vars.

## Project Purpose

This repository generates an automated GitHub profile `README.md` for the configured user. The application:

- Fetches the user's public GitHub profile, repositories, and recent events via `@octokit/rest`.
- Pulls latest blog/gist posts from a JSON feed (default `https://sametcc.me/feed.json`).
- Aggregates data into a context object then renders `README.md.hbs` using Handlebars.
- Is intended to run in CI (see `/.github/workflows/update-readme.yml`) on a schedule or manually to keep the profile README up-to-date.

Typical consumer tasks: modify the Handlebars template, extend GitHub queries (via new `*Fetcher`), or adjust formatting in `src/utils/DataFormatter.ts`.

## Architecture & data flow (big picture)

- Orchestration: `src/index.ts` contains the `Application` class coordinator. It fetches feed + GitHub data then renders the template.
- Data providers:
    - GitHub: `src/services/github-service/` containing `GitHubDataProvider` and specialized fetchers (e.g., `RepositoryFetcher.ts`).
    - Feed: `src/services/feed-service/FeedService.ts` (simple JSON feed fetcher).
- Templating: `src/README.md.hbs` defines the structure using Handlebars syntax.
- Logic & Formatting: `src/utils/DataFormatter.ts` handles complex data transformations and `src/utils/MarkdownUtils.ts` provides lower-level formatting.
- Types: Shared shapes are in [src/types.d.ts](src/types.d.ts).

## Conventions & patterns (do this in your edits)

- Adding a README section: Update [src/README.md.hbs](src/README.md.hbs) to include the new section, update `Application.generate` in `src/index.ts` to fetch/provide the data, and use `DataFormatter.ts` if processing is needed.
- Error handling: network fetchers log and return sensible fallbacks (usually empty arrays or null) — follow the same pattern for new fetchers.
- Octokit usage: follow the `GitHubDataProvider` facade pattern using small fetcher classes under `src/services/github-service/`. Keep heavy GitHub queries inside these fetchers.

## Local dev & CI workflows

- Run locally: `bun run start`.
- Formatting & checks: `bun run check` (scripts in [package.json](package.json)).
- CI: see [/.github/workflows/update-readme.yml](.github/workflows/update-readme.yml). The workflow:
  - sets up Bun, caches dependencies, runs `bun run start`, and commits `README.md` when changes exist.

## Important integration points

- Feed URL: default in `Application` is `https://sametcc.me/feed.json`. Override via constructor `feedUrl` for testing.
- Environment: `GITHUB_TOKEN` / `GH_TOKEN` (if missing the code warns and some data will be partial).
- Output files: `README.md`.

## What to read first (recommended files)

- [src/index.ts](src/index.ts) — orchestration and application entry point.
- [src/README.md.hbs](src/README.md.hbs) — the Handlebars template for the README.
- [src/services/github-service/GitHubDataProvider.ts](src/services/github-service/GitHubDataProvider.ts) — Octokit usage and fetcher patterns.
- [src/utils/DataFormatter.ts](src/utils/DataFormatter.ts) — how raw data is prepared for the template.
- [package.json](package.json) and [/.github/workflows/update-readme.yml](.github/workflows/update-readme.yml) — how the project is run and automated.

## Practical examples for automated edits

- To add a new GitHub query:
  1. Create `src/services/github-service/XFetcher.ts` following existing patterns.
  2. Add it to `GitHubDataProvider.ts`.
  3. Call it in `src/index.ts`.

- To change the README layout:
  1. Edit [src/README.md.hbs](src/README.md.hbs).
  2. If new data is needed, update the context in `src/index.ts`.

## Editing and testing notes for AI agents

- Use existing utility functions instead of duplicating logic (eg. `MarkdownUtils.formatDateLong`).
- Keep network-facing code defensive: follow existing pattern of try/catch + console.error + fallback return values.
- Respect Biome linting and formatting rules.

## Questions / gaps

- If you need to change commit/diff rules, update [/.github/workflows/update-readme.yml](.github/workflows/update-readme.yml) accordingly.
- If adding a long-running or expensive GitHub query, consider paginating or caching to avoid CI timeouts.

If anything is unclear or you want the file tailored (more examples or a shorter checklist), tell me which areas to expand.
