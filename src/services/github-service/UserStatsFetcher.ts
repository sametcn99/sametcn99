import type { Octokit } from "@octokit/rest";
import type { GitHubService } from "./GitHubService";

export class UserStatsFetcher implements IDataFetcher<UserStats> {
	constructor(
		private readonly service: GitHubService,
		private readonly octokit: Octokit,
		private readonly reposDataPromise: Promise<Repository[]>,
		private readonly userProfilePromise: Promise<UserProfile | null>,
	) {}

	async fetch(): Promise<UserStats> {
		const username = this.service.getUsername();
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

		// Start independent fetches immediately
		const independentFetches = Promise.all([
			this.fetchPRs(stats, username),
			this.fetchIssues(stats, username),
			this.fetchCommits(stats, username),
			this.fetchContributions(stats, username),
			this.fetchMergedPRs(stats, username),
			this.fetchReviewedPRs(stats, username),
		]);

		const [reposData, userProfile] = await Promise.all([
			this.reposDataPromise,
			this.userProfilePromise,
		]);

		if (!userProfile) {
			throw new Error("Failed to fetch user profile for stats");
		}

		// User Profile Data
		this.processUserProfile(stats, userProfile);

		// Stars from repos
		stats.totalStars = reposData.reduce(
			(acc, repo) => acc + (repo.stargazers_count || 0),
			0,
		);

		await independentFetches;

		return stats;
	}

	private processUserProfile(stats: UserStats, userProfile: UserProfile): void {
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
			const count = commits.total_count;
			stats.totalCommits =
				count >= 100 ? `${Math.floor(count / 100) * 100}+` : count;
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
