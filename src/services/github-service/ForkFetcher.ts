import type { Octokit } from "@octokit/rest";

/** Fetches incoming forks using the fork's creation date and its owner's profile. */
export class ForkFetcher implements IDataFetcher<StarOrFork[]> {
	constructor(
		private readonly octokit: Octokit,
		private readonly reposPromise: Promise<Repository[]>,
	) {}

	async fetch(): Promise<StarOrFork[]> {
		const forks: StarOrFork[] = [];
		for (const repo of await this.reposPromise) {
			if (!repo.forks_count || repo.private) continue;

			const data = await this.octokit.paginate(
				this.octokit.rest.repos.listForks,
				{
					owner: repo.owner.login,
					repo: repo.name,
					sort: "newest",
					per_page: 100,
				},
			);

			for (const fork of data) {
				if (!fork.owner || fork.private) continue;
				forks.push({
					action: "forked",
					login: fork.owner.login,
					userUrl: fork.owner.html_url,
					repoName: repo.name,
					repoUrl: repo.html_url,
					date: fork.created_at ?? null,
				});
			}
		}

		return forks;
	}
}
