import type { Octokit } from "@octokit/rest";
import type { GitHubService } from "./GitHubService";

export class WorkflowFetcher implements IDataFetcher<WorkflowRun | null> {
	constructor(
		private readonly service: GitHubService,
		private readonly octokit: Octokit,
	) {}

	async fetch(): Promise<WorkflowRun | null> {
		const username = this.service.getUsername();
		// Assuming profile repo name is same as username
		const repo = username;
		try {
			const { data } = await this.octokit.rest.actions.listWorkflowRunsForRepo({
				owner: username,
				repo: repo,
				per_page: 1,
			});

			if (data.workflow_runs.length > 0) {
				return data.workflow_runs[0] ?? null;
			}
			return null;
		} catch (error) {
			console.error("Error fetching workflow runs:", error);
			return null;
		}
	}
}
