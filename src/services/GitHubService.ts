import { Octokit } from "@octokit/rest";

export class GitHubService {
	private readonly username: string;

	constructor(username: string, token?: string) {
		this.username = username;

		if (!token) {
			console.warn(
				"No GITHUB_TOKEN found. API limits might be restricted and private repos won't be visible.",
			);
		}
	}

	getUsername(): string {
		return this.username;
	}
}

export class RepositoryFetcher implements IDataFetcher<Repository[]> {
	constructor(
		private readonly service: GitHubService,
		private readonly octokit: Octokit,
	) {}

	async fetch(): Promise<Repository[]> {
		const username = this.service.getUsername();
		console.log(`Fetching repositories for ${username}...`);

		try {
			const { data } = await this.octokit.rest.repos.listForUser({
				username,
				per_page: 100,
				type: "owner",
			});

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

export class EventFetcher implements IDataFetcher<GitHubEvent[]> {
	constructor(
		private readonly service: GitHubService,
		private readonly octokit: Octokit,
	) {}

	async fetch(): Promise<GitHubEvent[]> {
		const username = this.service.getUsername();
		console.log(`Fetching events for ${username}...`);

		let eventsData: GitHubEvent[] = [];
		try {
			for (let page = 1; page <= 3; page++) {
				try {
					const { data } =
						await this.octokit.rest.activity.listPublicEventsForUser({
							username,
							per_page: 100,
							page,
						});
					if (data.length > 0) {
						eventsData = [...eventsData, ...data];
					} else {
						break;
					}
				} catch (error) {
					console.error(`Error fetching page ${page}:`, error);
					break;
				}
			}
			console.log(`Total events fetched: ${eventsData.length}`);
		} catch (error) {
			console.error("Error fetching events:", error);
		}
		return eventsData;
	}
}

export class ProfileFetcher implements IDataFetcher<UserProfile | null> {
	constructor(
		private readonly service: GitHubService,
		private readonly octokit: Octokit,
	) {}

	async fetch(): Promise<UserProfile | null> {
		const username = this.service.getUsername();
		console.log(`Fetching profile for ${username}...`);

		try {
			const { data } = await this.octokit.rest.users.getByUsername({
				username,
			});
			return data;
		} catch (error) {
			console.error("Error fetching user profile:", error);
			return null;
		}
	}
}

export class UserStatsFetcher implements IDataFetcher<UserStats> {
	constructor(
		private readonly service: GitHubService,
		private readonly octokit: Octokit,
		private readonly reposData: Repository[],
		private readonly userProfile: UserProfile,
	) {}

	async fetch(): Promise<UserStats> {
		const username = this.service.getUsername();
		console.log(`Fetching user stats for ${username}...`);

		const stats: UserStats = {
			totalStars: 0,
			totalCommits: 0,
			totalPRs: 0,
			totalIssues: 0,
			contributedTo: 0,
			totalRepos: 0,
			totalGists: 0,
			mergedPRs: 0,
			reviewedPRs: 0,
			accountAge: "",
		};

		// User Profile Data
		this.processUserProfile(stats);

		// Stars from repos
		stats.totalStars = this.reposData.reduce(
			(acc, repo) => acc + (repo.stargazers_count || 0),
			0,
		);

		// PRs, Issues, Commits, Contributions, Merged PRs, Reviewed PRs
		await Promise.all([
			this.fetchPRs(stats, username),
			this.fetchIssues(stats, username),
			this.fetchCommits(stats, username),
			this.fetchContributions(stats, username),
			this.fetchMergedPRs(stats, username),
			this.fetchReviewedPRs(stats, username),
		]);

		return stats;
	}

	private processUserProfile(stats: UserStats): void {
		const userProfile = this.userProfile;
		stats.totalRepos = userProfile.public_repos;
		stats.totalGists = userProfile.public_gists;

		const createdAt = new Date(userProfile.created_at);
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - createdAt.getTime());
		const years = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
		stats.accountAge = `${years} years`;
	}

	private async fetchPRs(stats: UserStats, username: string): Promise<void> {
		try {
			const { data: prs } =
				await this.octokit.rest.search.issuesAndPullRequests({
					q: `author:${username} type:pr`,
				});
			stats.totalPRs = prs.total_count;
		} catch (error) {
			console.error("Error fetching PRs stats:", error);
		}
	}

	private async fetchIssues(stats: UserStats, username: string): Promise<void> {
		try {
			const { data: issues } =
				await this.octokit.rest.search.issuesAndPullRequests({
					q: `author:${username} type:issue`,
				});
			stats.totalIssues = issues.total_count;
		} catch (error) {
			console.error("Error fetching Issues stats:", error);
		}
	}

	private async fetchCommits(
		stats: UserStats,
		username: string,
	): Promise<void> {
		try {
			const oneYearAgo = new Date();
			oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
			const dateStr = oneYearAgo.toISOString().split("T")[0];

			const { data: commits } = await this.octokit.request(
				"GET /search/commits",
				{
					q: `author:${username} committer-date:>${dateStr}`,
					mediaType: { previews: ["cloak"] },
				},
			);
			stats.totalCommits = commits.total_count;
		} catch (error) {
			console.error("Error fetching Commits stats:", error);
		}
	}

	private async fetchContributions(
		stats: UserStats,
		username: string,
	): Promise<void> {
		try {
			const oneYearAgo = new Date();
			oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
			const dateStr = oneYearAgo.toISOString().split("T")[0];

			const { data: contribPrs } =
				await this.octokit.rest.search.issuesAndPullRequests({
					q: `author:${username} type:pr -user:${username} created:>${dateStr}`,
					per_page: 100,
				});

			const uniqueRepos = new Set(
				contribPrs.items
					.map((item) => item.repository_url)
					.filter((url) => url),
			);
			stats.contributedTo = uniqueRepos.size;
		} catch (error) {
			console.error("Error fetching Contribution stats:", error);
		}
	}

	private async fetchMergedPRs(
		stats: UserStats,
		username: string,
	): Promise<void> {
		try {
			const { data: mergedData } =
				await this.octokit.rest.search.issuesAndPullRequests({
					q: `author:${username} is:pr is:merged`,
				});
			stats.mergedPRs = mergedData.total_count;
		} catch (error) {
			console.error("Error fetching Merged PRs stats:", error);
		}
	}

	private async fetchReviewedPRs(
		stats: UserStats,
		username: string,
	): Promise<void> {
		try {
			const { data: reviewedData } =
				await this.octokit.rest.search.issuesAndPullRequests({
					q: `reviewer:${username} is:pr`,
				});
			stats.reviewedPRs = reviewedData.total_count;
		} catch (error) {
			console.error("Error fetching Reviewed PRs stats:", error);
		}
	}
}

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

	async fetchUserStats(
		reposData: Repository[],
		userProfile: UserProfile,
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
