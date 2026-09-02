import type { Octokit } from "@octokit/rest";

/** Retrieves all pull requests across the user's owned repositories. */
export class PullRequestFetcher implements IDataFetcher<RepoPullRequest[]> {
	constructor(
		private readonly octokit: Octokit,
		private readonly reposPromise: Promise<Repository[]>,
	) {}

	/** Loads pull requests with waiting items first, then sorts each group by recency. */
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

				pullRequests.push(
					...data.filter(
						(pullRequest) =>
							!PullRequestFetcher.isDependabotPullRequest(pullRequest),
					),
				);
			} catch (error) {
				console.error(`Error fetching pull requests for ${repo.name}:`, error);
			}
		}

		return pullRequests.sort((a, b) => {
			const waitingA = a.state === "open";
			const waitingB = b.state === "open";
			if (waitingA !== waitingB) {
				return waitingA ? -1 : 1;
			}

			const updatedA = new Date(a.updated_at ?? 0).getTime();
			const updatedB = new Date(b.updated_at ?? 0).getTime();
			return updatedB - updatedA;
		});
	}

	/** Excludes automated dependency-update pull requests from the profile. */
	private static isDependabotPullRequest(
		pullRequest: RepoPullRequest,
	): boolean {
		const opener = pullRequest.user?.login?.toLowerCase() ?? "";
		return opener === "dependabot[bot]" || opener === "dependabot";
	}
}
