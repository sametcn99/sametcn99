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
	 * Returns all owned repositories sorted by stargazers and recency.
	 */
	async fetch(): Promise<Repository[]> {
		const username = this.service.getUsername();
		try {
			const data: Repository[] = await this.octokit.paginate(
				this.octokit.rest.repos.listForUser,
				{
					username,
					per_page: 100,
					type: "owner",
				},
			);

			// The list endpoint omits the parent of a fork.
			for (const repo of data) {
				if (!repo.fork || repo.archived) continue;
				try {
					const { data: fork } = await this.octokit.rest.repos.get({
						owner: repo.owner.login,
						repo: repo.name,
					});
					repo.parent = fork.parent;
				} catch (error) {
					console.warn(
						`Could not resolve the parent of ${repo.full_name}:`,
						error,
					);
				}
			}

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
