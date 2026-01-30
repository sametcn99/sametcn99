import type { Octokit } from "@octokit/rest";
import type { GitHubService } from "./GitHubService";

/** Retrieves repositories owned by the user and sorts them by popularity/date. */
export class RepositoryFetcher implements IDataFetcher<Repository[]> {
	/** Shares the username service and Octokit client for the request. */
	constructor(
		private readonly service: GitHubService,
		private readonly octokit: Octokit,
	) {}

	/**
	 * Returns up to 100 owned repositories sorted by stargazers and recency.
	 */
	async fetch(): Promise<Repository[]> {
		const username = this.service.getUsername();
		try {
			const { data } = await this.octokit.rest.repos.listForUser({
				username,
				per_page: 100,
				type: "owner",
			});

			return data.sort((a, b) => {
				const starsA = a.stargazers_count ?? 0;
				const starsB = b.stargazers_count ?? 0;
				if (starsB !== starsA) {
					return starsB - starsA;
				}
				const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
				const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
				return dateB - dateA;
			});
		} catch (error) {
			console.error("Error fetching repositories:", error);
			return [];
		}
	}
}
