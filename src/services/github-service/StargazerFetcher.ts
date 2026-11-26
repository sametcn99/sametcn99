import type { Octokit } from "@octokit/rest";

/** Retrieves unique stargazers across owned repositories, deduplicated by user and repository. */
export class StargazerFetcher implements IDataFetcher<StarOrFork[]> {
	constructor(
		private readonly octokit: Octokit,
		private readonly reposPromise: Promise<Repository[]>,
	) {}

	async fetch(): Promise<StarOrFork[]> {
		const repos = await this.reposPromise;

		const stargazersByCompositeKey = new Map<string, StarOrFork>();

		for (const repo of repos) {
			if (repo.private || (repo.stargazers_count ?? 0) === 0) {
				continue;
			}

			try {
				const stargazers = await this.octokit.paginate(
					this.octokit.rest.activity.listStargazersForRepo,
					{
						owner: repo.owner.login,
						repo: repo.name,
						per_page: 100,
						headers: {
							accept: "application/vnd.github.star+json",
						},
					},
				);

				for (const entry of stargazers) {
					const user = "user" in entry ? entry.user : entry;
					if (!user) {
						continue;
					}

					const compositeKey = `${user.login}:${repo.name}`;

					const starredAt =
						"starred_at" in entry ? (entry.starred_at ?? null) : null;
					const existing = stargazersByCompositeKey.get(compositeKey);

					if (existing) {
						const existingDate = existing.date
							? new Date(existing.date).getTime()
							: 0;
						const newDate = starredAt ? new Date(starredAt).getTime() : 0;
						if (newDate <= existingDate) {
							continue;
						}
					}

					stargazersByCompositeKey.set(compositeKey, {
						action: "starred",
						login: user.login,
						userUrl: user.html_url,
						date: starredAt,
						repoName: repo.name,
						repoUrl: repo.html_url,
					});
				}
			} catch (error) {
				throw new Error(
					`Could not read stargazers for ${repo.full_name}. Check STARGAZERS_TOKEN access to this repository.`,
					{ cause: error },
				);
			}
		}

		return Array.from(stargazersByCompositeKey.values());
	}
}
