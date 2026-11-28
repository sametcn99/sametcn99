import type { Octokit } from "@octokit/rest";

type RecentStar = { repoId: number; login: string; date: string };

/** Keeps the latest public star events across runs, including events that aged out of GitHub's timeline. */
export class StargazerFetcher implements IDataFetcher<StarOrFork[]> {
	constructor(
		private readonly octokit: Octokit,
		private readonly reposPromise: Promise<Repository[]>,
		private readonly historyPath = "recent-stars.json",
	) {}

	async fetch(): Promise<StarOrFork[]> {
		const allRepos = await this.reposPromise;
		const history: RecentStar[] = await Bun.file(this.historyPath).json();
		if (!allRepos.length && history.length) {
			throw new Error(
				"Cannot refresh star history without the repository list.",
			);
		}

		const repos = new Map(
			allRepos
				.filter((repo) => !repo.private && repo.stargazers_count)
				.map((repo) => [repo.id, repo]),
		);
		const latest = new Map<string, RecentStar>();
		const record = (star: RecentStar) => {
			const key = `${star.repoId}/${star.login.toLowerCase()}`;
			const previous = latest.get(key);
			if (!previous || previous.date < star.date) latest.set(key, star);
		};
		for (const star of history) {
			if (repos.has(star.repoId)) record(star);
		}

		for (const repo of repos.values()) {
			const pages = this.octokit.paginate.iterator(
				this.octokit.rest.activity.listRepoEvents,
				{
					owner: repo.owner.login,
					repo: repo.name,
					per_page: 100,
				},
			);
			for await (const { data } of pages) {
				for (const event of data) {
					if (
						event.repo.id === repo.id &&
						event.public &&
						event.type === "WatchEvent" &&
						event.payload?.action === "started" &&
						event.created_at
					) {
						record({
							repoId: repo.id,
							login: event.actor.login,
							date: event.created_at,
						});
					}
				}
			}
		}

		const recent = [...latest.values()]
			.sort((a, b) => b.date.localeCompare(a.date))
			.slice(0, 20);
		await Bun.write(this.historyPath, `${JSON.stringify(recent, null, "\t")}\n`);
		return recent.map((star) => {
			const repo = repos.get(star.repoId);
			if (!repo)
				throw new Error(`Missing repository for star event: ${star.repoId}`);
			return {
				action: "starred",
				login: star.login,
				userUrl: `https://github.com/${star.login}`,
				repoName: repo.name,
				repoUrl: repo.html_url,
				date: star.date,
			};
		});
	}
}
