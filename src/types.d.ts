/** biome-ignore-all lint/correctness/noUnusedVariables: . */
type FeedItem = {
	id: string;
	url: string;
	title: string;
	summary: string;
	date_published?: string;
};

type UserStats = {
	totalStars: number;
	totalCommits: number | string;
	commitsLast7Days: number | string;
	totalPRs: number;
	totalIssues: number;
	contributedTo: number;
	totalRepos: number;
	totalGists: number;
	mergedPRs: number;
	reviewedPRs: number;
	accountAge: string;
	topLanguages: string;
};

type Repository =
	import("@octokit/rest").RestEndpointMethodTypes["repos"]["listForUser"]["response"]["data"][number];

type GitHubEvent =
	import("@octokit/rest").RestEndpointMethodTypes["activity"]["listPublicEventsForUser"]["response"]["data"][number];

type UserProfile =
	import("@octokit/rest").RestEndpointMethodTypes["users"]["getByUsername"]["response"]["data"];

type WorkflowRun =
	import("@octokit/rest").RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["response"]["data"]["workflow_runs"][number];

interface IDataFetcher<T> {
	fetch(): Promise<T>;
}
