import type { Octokit } from "@octokit/rest";

/** Retrieves unique stargazers across owned repositories, deduplicated and sorted by recency. */
export class StargazerFetcher implements IDataFetcher<Stargazer[]> {
	constructor(
		private readonly octokit: Octokit,
		private readonly reposPromise: Promise<Repository[]>,
	) {}

	async fetch(): Promise<Stargazer[]> {
		const repos = await this.reposPromise;

		const stargazersByCompositeKey = new Map<string, Stargazer>();
		let hasStargazerAccess = true;

		for (const repo of repos) {
			if (!hasStargazerAccess) {
				break;
			}

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

					const compositeKey = `${user.login}:${repo.name}`;

					const starredAt =
						"starred_at" in entry ? (entry.starred_at ?? null) : null;
					const existing = stargazersByCompositeKey.get(compositeKey);

					if (existing) {
						const existingDate = existing.starred_at
							? new Date(existing.starred_at).getTime()
							: 0;
						const newDate = starredAt ? new Date(starredAt).getTime() : 0;
						if (newDate <= existingDate) {
							continue;
						}
					}

					stargazersByCompositeKey.set(compositeKey, {
						login: user.login,
						avatar_url: user.avatar_url,
						html_url: user.html_url,
						starred_at: starredAt,
						repo_name: repo.name,
						repo_html_url: repo.html_url,
					});
				}
			} catch (error) {
				const status =
					typeof error === "object" && error !== null && "status" in error
						? Number((error as { status?: unknown }).status)
						: null;
				const message =
					typeof error === "object" && error !== null && "message" in error
						? String((error as { message?: unknown }).message)
						: "";

				if (
					status === 403 &&
					/message.*stargazers|resource not accessible/i.test(message)
				) {
					hasStargazerAccess = false;
					console.warn(
						"Skipping recent stargazers: token does not have permission to list stargazers for this integration.",
					);
					continue;
				}

				console.error(
					`Failed to fetch stargazers for ${repo.full_name}:`,
					error,
				);
			}
		}

		return Array.from(stargazersByCompositeKey.values())
			.sort((a, b) => {
				const dateA = a.starred_at ? new Date(a.starred_at).getTime() : 0;
				const dateB = b.starred_at ? new Date(b.starred_at).getTime() : 0;
				return dateB - dateA;
			})
			.slice(0, 20);
	}
}
