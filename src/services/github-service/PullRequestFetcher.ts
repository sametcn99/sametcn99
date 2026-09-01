import type { Octokit } from "@octokit/rest";

/** Retrieves all pull requests across the user's owned repositories. */
export class PullRequestFetcher implements IDataFetcher<RepoPullRequest[]> {
	constructor(
		private readonly octokit: Octokit,
		private readonly reposPromise: Promise<Repository[]>,
	) {}

	/** Loads open and closed pull requests, sorted by most recently updated. */
	async fetch(): Promise<RepoPullRequest[]> {
		const repos = await this.reposPromise;
		const pullRequests: RepoPullRequest[] = [];

		for (const repo of repos) {
			try {
				const data = await this.octokit.paginate(this.octokit.rest.pulls.list, {
					owner: repo.owner?.login ?? repo.full_name.split("/")[0] ?? "",
					repo: repo.name,
					state: "all",
					sort: "updated",
					direction: "desc",
					per_page: 100,
				});

				pullRequests.push(...data);
			} catch (error) {
				console.error(`Error fetching pull requests for ${repo.name}:`, error);
			}
		}

		return pullRequests.sort((a, b) => {
			const updatedA = new Date(a.updated_at ?? 0).getTime();
			const updatedB = new Date(b.updated_at ?? 0).getTime();
			return updatedB - updatedA;
		});
	}
}
