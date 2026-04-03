import { Octokit } from "@octokit/rest";
import { EventFetcher } from "./EventFetcher";
import { GitHubService } from "./GitHubService";
import { HelpWantedIssueFetcher } from "./HelpWantedIssueFetcher";
import { ProfileFetcher } from "./ProfileFetcher";
import {
	type RawStargazer,
	RecentStargazersFetcher,
} from "./RecentStargazersFetcher";
import { RepositoryFetcher } from "./RepositoryFetcher";
import { UserStatsFetcher } from "./UserStatsFetcher";
import { WorkflowFetcher } from "./WorkflowFetcher";

/** Aggregates fetchers to expose high-level GitHub data retrieval operations. */
export class GitHubDataProvider {
	private readonly octokit: Octokit;
	private readonly service: GitHubService;

	/**
	 * Initializes the shared Octokit client and GitHub service helpers.
	 */
	constructor(username: string, token?: string) {
		this.service = new GitHubService(username, token);
		this.octokit = new Octokit({ auth: token });
	}

	/** Returns the owner's repositories sorted by stargazers+activity. */
	async fetchRepositories(): Promise<Repository[]> {
		const fetcher = new RepositoryFetcher(this.service, this.octokit);
		return fetcher.fetch();
	}

	/** Pulls the user's recent public GitHub events (paginated). */
	async fetchEvents(): Promise<GitHubEvent[]> {
		const fetcher = new EventFetcher(this.service, this.octokit);
		return fetcher.fetch();
	}

	/** Returns open help wanted issues from the user's public repositories. */
	async fetchHelpWantedIssues(
		reposData: Promise<Repository[]>,
	): Promise<RepoIssue[]> {
		const fetcher = new HelpWantedIssueFetcher(
			this.service,
			this.octokit,
			reposData,
		);
		return fetcher.fetch();
	}

	/** Retrieves the user profile, returning null when the request fails. */
	async fetchProfile(): Promise<UserProfile | null> {
		const fetcher = new ProfileFetcher(this.service, this.octokit);
		return fetcher.fetch();
	}

	/** Fetches the most recent workflow run for the repo matching the username. */
	async fetchWorkflow(): Promise<WorkflowRun | null> {
		const fetcher = new WorkflowFetcher(this.service, this.octokit);
		return fetcher.fetch();
	}

	/** Fetches the most recent stargazers across top repositories. */
	async fetchRecentStargazers(
		reposData: Promise<Repository[]>,
	): Promise<RawStargazer[]> {
		const fetcher = new RecentStargazersFetcher(
			this.service,
			this.octokit,
			reposData,
		);
		return fetcher.fetch();
	}

	/**
	 * Builds aggregated stats using repository/user profile promises plus
	 * independent Octokit queries.
	 */
	async fetchUserStats(
		reposData: Promise<Repository[]>,
		userProfile: Promise<UserProfile | null>,
	): Promise<UserStats> {
		const fetcher = new UserStatsFetcher(
			this.service,
			this.octokit,
			reposData,
			userProfile,
		);
		return fetcher.fetch();
	}
}
