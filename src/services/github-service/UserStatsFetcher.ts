import type { Octokit } from "@octokit/rest";
import type { GitHubService } from "./GitHubService";

/** Aggregates user statistics by combining repo/profile data with search queries. */
export class UserStatsFetcher implements IDataFetcher<UserStats> {
	/**
	 * Prepares shared promises so the fetcher can coordinate dependent data.
	 */
	constructor(
		private readonly service: GitHubService,
		private readonly octokit: Octokit,
		private readonly reposDataPromise: Promise<Repository[]>,
		private readonly userProfilePromise: Promise<UserProfile | null>,
	) {}

	/**
	 * Combines repository totals, profile-derived fields, and resuable search
	 * queries to populate the `UserStats` shape.
	 */
	async fetch(): Promise<UserStats> {
		const username = this.service.getUsername();
		const stats: UserStats = {
			totalStars: 0,
			commitsLast7Days: 0,
			totalRepos: 0,
			totalGists: 0,
			accountAge: "",
			topLanguages: "",
		};

		// Start independent fetches immediately
		const independentFetches = Promise.all([
			this.fetchCommitsLast7Days(stats, username),
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

		// Top Languages
		this.processTopLanguages(stats, reposData);

		await independentFetches;

		return stats;
	}

	/** Populates counts that derive directly from the GitHub profile payload. */
	private processUserProfile(stats: UserStats, userProfile: UserProfile): void {
		stats.totalRepos = userProfile.public_repos;
		stats.totalGists = userProfile.public_gists;

		const createdAt = new Date(userProfile.created_at);
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - createdAt.getTime());
		const years = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
		stats.accountAge = `${years} years`;
	}

	/** Chooses up to five top languages across owned, non-forked repos. */
	private processTopLanguages(stats: UserStats, repos: Repository[]): void {
		const languageCounts: Record<string, number> = {};

		for (const repo of repos) {
			if (!repo.fork && repo.language) {
				languageCounts[repo.language] =
					(languageCounts[repo.language] || 0) + 1;
			}
		}

		const sortedLanguages = Object.entries(languageCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([language]) => language);

		stats.topLanguages = sortedLanguages.join(", ");
	}

	/** Counts commits authored in the last year, rounded for display. */
	/** Counts commits authored in the last 7 days, rounded for display. */
	private async fetchCommitsLast7Days(
		stats: UserStats,
		username: string,
	): Promise<void> {
		try {
			const sevenDaysAgo = new Date();
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
			const dateStr = sevenDaysAgo.toISOString().split("T")[0];

			const { data: commits } = await this.octokit.request(
				"GET /search/commits",
				{
					q: `author:${username} committer-date:>${dateStr}`,
					mediaType: { previews: ["cloak"] },
				},
			);
			const count = commits.total_count;
			stats.commitsLast7Days =
				count >= 10 ? `${Math.floor(count / 10) * 10}+` : count;
		} catch (error) {
			console.error("Error fetching Commits Last 7 Days stats:", error);
		}
	}
}
