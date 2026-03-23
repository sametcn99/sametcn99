import type { Octokit } from "@octokit/rest";
import type { GitHubService } from "./GitHubService";

/** Collects open help wanted issues from the user's public repositories. */
export class HelpWantedIssueFetcher implements IDataFetcher<RepoIssue[]> {
	/** Shares repository data so public repos do not need to be fetched twice. */
	constructor(
		private readonly service: GitHubService,
		private readonly octokit: Octokit,
		private readonly reposDataPromise: Promise<Repository[]>,
	) {}

	/**
	 * Loads open issues labeled help wanted from owned public repositories and
	 * sorts them by most recently updated.
	 */
	async fetch(): Promise<RepoIssue[]> {
		const username = this.service.getUsername();
		const repos = await this.reposDataPromise;
		const candidateRepos = repos.filter(
			(repo) => !repo.archived && (repo.open_issues_count ?? 0) > 0,
		);
		const issues: RepoIssue[] = [];

		for (const repo of candidateRepos) {
			try {
				const { data } = await this.octokit.rest.issues.listForRepo({
					owner: repo.owner?.login ?? username,
					repo: repo.name,
					state: "open",
					labels: "help wanted",
					per_page: 100,
					sort: "updated",
					direction: "desc",
				});

				issues.push(
					...data.filter(
						(issue) => !("pull_request" in issue && issue.pull_request),
					),
				);
			} catch (error) {
				console.error(
					`Error fetching help wanted issues for ${repo.name}:`,
					error,
				);
			}
		}

		return issues.sort((a, b) => {
			const updatedA = new Date(a.updated_at ?? 0).getTime();
			const updatedB = new Date(b.updated_at ?? 0).getTime();
			return updatedB - updatedA;
		});
	}
}
