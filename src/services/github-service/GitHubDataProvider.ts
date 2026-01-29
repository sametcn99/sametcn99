import { Octokit } from "@octokit/rest";
import { EventFetcher } from "./EventFetcher";
import { GitHubService } from "./GitHubService";
import { ProfileFetcher } from "./ProfileFetcher";
import { RepositoryFetcher } from "./RepositoryFetcher";
import { UserStatsFetcher } from "./UserStatsFetcher";
import { WorkflowFetcher } from "./WorkflowFetcher";

export class GitHubDataProvider {
	private readonly octokit: Octokit;
	private readonly service: GitHubService;

	constructor(username: string, token?: string) {
		this.service = new GitHubService(username, token);
		this.octokit = new Octokit({ auth: token });
	}

	async fetchRepositories(): Promise<Repository[]> {
		const fetcher = new RepositoryFetcher(this.service, this.octokit);
		return fetcher.fetch();
	}

	async fetchEvents(): Promise<GitHubEvent[]> {
		const fetcher = new EventFetcher(this.service, this.octokit);
		return fetcher.fetch();
	}

	async fetchProfile(): Promise<UserProfile | null> {
		const fetcher = new ProfileFetcher(this.service, this.octokit);
		return fetcher.fetch();
	}

	async fetchWorkflow(): Promise<WorkflowRun | null> {
		const fetcher = new WorkflowFetcher(this.service, this.octokit);
		return fetcher.fetch();
	}

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
