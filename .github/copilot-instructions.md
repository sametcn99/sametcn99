## Purpose

These instructions help an AI coding assistant become productive in this repository quickly. They focus on the runtime, architecture, developer workflows, integration points, and code patterns that recur across the project.

## Quick summary

- Runtime: Bun. Run generators with `bun run index.ts` (see [package.json](package.json)).
- Formatting / linting: Biome (`bunx biome format`, `bunx biome lint`).
- Main entry: `Application` orchestrates generation; output is `README.md` and `data.json`.
- GitHub access: uses `@octokit/rest` and respects `GITHUB_TOKEN` / `GH_TOKEN` env vars.

## Project Purpose

This repository generates an automated GitHub profile `README.md` for the configured user. The application:
- Fetches the user's public GitHub profile, repositories, and recent events via `@octokit/rest`.
- Pulls latest blog/gist posts from a JSON feed (default `https://sametcc.me/feed.json`).
- Aggregates data into `data.json` then renders Markdown sections using `ISectionGenerator` implementations under `src/generators/`.
- Is intended to run in CI (see `/.github/workflows/update-readme.yml`) on a schedule or manually to keep the profile README up-to-date.

Typical consumer tasks: add generators, extend GitHub queries (via new `*Fetcher`), or adjust formatting in `src/utils/MarkdownUtils.ts`.

## Architecture & data flow (big picture)

- Orchestration: `src/Application.ts` is the coordinator. It fetches feed + GitHub data, saves `data.json`, then runs a list of `ISectionGenerator` instances to produce `README.md`.
- Data providers: `src/services/GitHubService.ts` (Octokit wrapper + fetcher classes) and `src/services/FeedService.ts` (simple JSON feed fetcher).
- Sections: individual Markdown sections are produced by classes in `src/generators/` that implement `ISectionGenerator` (see [src/generators/index.ts](src/generators/index.ts)).
- Utilities & types: shared helpers live in [src/utils/MarkdownUtils.ts](src/utils/MarkdownUtils.ts) and global shape/types are in [src/types.d.ts](src/types.d.ts).

## Conventions & patterns (do this in your edits)

- Adding a README section: create a new generator in `src/generators/`, export it from `src/generators/index.ts`, and add it into the `generators` array inside `Application.generate()` so ordering is explicit.
- Data persistence: the project writes `data.json` using `Bun.write` — avoid changing this name unless you update `Application` default `dataPath`.
- Error handling: network fetchers log and return sensible fallbacks (usually empty arrays) — follow the same pattern for new fetchers.
- Octokit usage: follow the `GitHubDataProvider` façade pattern (small fetcher classes: `RepositoryFetcher`, `EventFetcher`, `UserStatsFetcher`). Keep heavy GitHub queries inside these fetchers.

## Local dev & CI workflows

- Run locally: `bun run index.ts`.
- Formatting & checks: `bunx biome format --write`, `bunx biome lint --write`, `bunx biome check --write` (scripts in [package.json](package.json)).
- CI: see [/.github/workflows/update-readme.yml](.github/workflows/update-readme.yml). The workflow:
  - sets up Bun, caches dependencies, runs `bun run index.ts`, and commits `README.md` + `data.json` when meaningful changes exist.
  - The workflow ignores generated timestamp lines when deciding to commit — preserve that format when changing output text.

## Important integration points

- Feed URL: default in `Application` is `https://sametcc.me/feed.json`. Override via constructor `feedUrl` for testing.
- Environment: `GITHUB_TOKEN` / `GH_TOKEN` (if missing the code warns and some data will be partial).
- Output files: `README.md` (final) and `data.json` (intermediate). CI commit logic diff-ignores timestamp fields — keep `generatedAt` and `Last updated:` patterns stable.

## What to read first (recommended files)

- [src/Application.ts](src/Application.ts) — orchestration and generator ordering.
- [src/services/GitHubService.ts](src/services/GitHubService.ts) — Octokit usage and fetcher patterns.
- [src/generators/\*](src/generators/) — examples of generating markdown sections (TOC, Repos, Stats).
- [src/utils/MarkdownUtils.ts](src/utils/MarkdownUtils.ts) — common helpers for formatting and escaping.
- [package.json](package.json) and [/.github/workflows/update-readme.yml](.github/workflows/update-readme.yml) — how the project is run and automated.

## Practical examples for automated edits

- To add a new section generator named `XGenerator`:
  1. Create `src/generators/XGenerator.ts` exporting a class that implements `ISectionGenerator` with `generate()`.
  2. Add `export { XGenerator } from "./XGenerator";` to [src/generators/index.ts](src/generators/index.ts).
  3. Import and instantiate it in `Application`'s `generators` array in the desired position so content order remains intentional.

- To add a new GitHub query, add a small fetcher class under `src/services/` (follow `*Fetcher` pattern), keep network calls in the fetcher, and invoke it via `GitHubDataProvider`.

## Editing and testing notes for AI agents

- Preserve stable markers used by CI when generating output: the README contains a `Last updated:` line and `data.json` contains `generatedAt` — CI uses `git diff -I` to ignore those when deciding to commit.
- Use existing utility functions instead of duplicating logic (eg. `MarkdownUtils.formatDateLong`).
- Keep network-facing code defensive: follow existing pattern of try/catch + console.error + fallback return values.

## Questions / gaps

- If you need to change commit/diff rules, update [/.github/workflows/update-readme.yml](.github/workflows/update-readme.yml) accordingly.
- If adding a long-running or expensive GitHub query, consider paginating or caching to avoid CI timeouts.

If anything is unclear or you want the file tailored (more examples or a shorter checklist), tell me which areas to expand.
