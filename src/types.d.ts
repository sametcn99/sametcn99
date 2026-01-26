import type { RestEndpointMethodTypes } from "@octokit/rest";

declare global {
	type FeedItem = {
		id: string;
		url: string;
		title: string;
		summary: string;
		date_published?: string;
	};

	type Feed = {
		items: FeedItem[];
	};

	type UserStats = {
		totalStars: number;
		totalCommits: number;
		totalPRs: number;
		totalIssues: number;
		contributedTo: number;
		totalRepos: number;
		totalGists: number;
		mergedPRs: number;
		reviewedPRs: number;
		accountAge: string;
	};

	type Repository =
		RestEndpointMethodTypes["repos"]["listForUser"]["response"]["data"][number];

	type GitHubEvent =
		RestEndpointMethodTypes["activity"]["listPublicEventsForUser"]["response"]["data"][number];

	interface ISectionGenerator {
		generate(): string;
	}

	interface IDataFetcher<T> {
		fetch(): Promise<T>;
	}
}
