import type { Octokit } from "@octokit/rest";

/** Retrieves unique stargazers across owned repositories, deduplicated and sorted by recency. */
export class StargazerFetcher implements IDataFetcher<Stargazer[]> {
	constructor(
		private readonly octokit: Octokit,
		private readonly reposPromise: Promise<Repository[]>,
	) {}

	async fetch(): Promise<Stargazer[]> {
		const repos = await this.reposPromise;

		const stargazersByLogin = new Map<string, Stargazer>();

		for (const repo of repos) {
			if ((repo.stargazers_count ?? 0) === 0) {
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
							accept: "application/vnd.github.v3.star+json",
						},
					},
				);

				for (const entry of stargazers) {
					const user = "user" in entry ? entry.user : entry;
					if (!user) {
						continue;
					}

					const starredAt =
						"starred_at" in entry ? (entry.starred_at ?? null) : null;
					const existing = stargazersByLogin.get(user.login);

					if (existing) {
						const existingDate = existing.starred_at
							? new Date(existing.starred_at).getTime()
							: 0;
						const newDate = starredAt ? new Date(starredAt).getTime() : 0;
						if (newDate <= existingDate) {
							continue;
						}
					}

					stargazersByLogin.set(user.login, {
						login: user.login,
						avatar_url: user.avatar_url,
						html_url: user.html_url,
						starred_at: starredAt,
						repo_name: repo.name,
						repo_html_url: repo.html_url,
					});
				}
			} catch (error) {
				console.error(
					`Failed to fetch stargazers for ${repo.full_name}:`,
					error,
				);
			}
		}

		return Array.from(stargazersByLogin.values())
			.sort((a, b) => {
				const dateA = a.starred_at ? new Date(a.starred_at).getTime() : 0;
				const dateB = b.starred_at ? new Date(b.starred_at).getTime() : 0;
				return dateB - dateA;
			})
			.slice(0, 20);
	}
}
