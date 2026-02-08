/** biome-ignore-all lint/correctness/noUnusedVariables: . */
/** Normalized feed item shape used to render blog posts. */
type FeedItem = {
	id: string;
	url: string;
	title: string;
	summary: string;
	date_published?: string;
};

/** Aggregated counts surfaced to the README template. */
type UserStats = {
	totalStars: number;
	commitsLast7Days: number | string;
	totalRepos: number;
	activeRepos: number;
	forkedRepos: number;
	archivedRepos: number;
	totalGists: number;
	accountAge: string;
	topLanguages: string;
};

/** Repository payload returned by Octokit listForUser. */
type Repository =
	import("@octokit/rest").RestEndpointMethodTypes["repos"]["listForUser"]["response"]["data"][number];

/** Gist payload returned by Octokit listForUser. */
type Gist =
	import("@octokit/rest").RestEndpointMethodTypes["gists"]["listForUser"]["response"]["data"][number];

/** Activity payload returned when listing public events for a user. */
type GitHubEvent =
	import("@octokit/rest").RestEndpointMethodTypes["activity"]["listPublicEventsForUser"]["response"]["data"][number];

/** User profile payload returned by Octokit getByUsername. */
type UserProfile =
	import("@octokit/rest").RestEndpointMethodTypes["users"]["getByUsername"]["response"]["data"];

/** Workflow run payload returned when listing workflow runs. */
type WorkflowRun =
	import("@octokit/rest").RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["response"]["data"]["workflow_runs"][number];

/** Contract implemented by each GitHub/feed fetcher in this repo. */
interface IDataFetcher<T> {
	fetch(): Promise<T>;
}
