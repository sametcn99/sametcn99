import type { Octokit } from "@octokit/rest";
import type { GitHubService } from "./GitHubService";

/** Raw stargazer data payload from Octokit. */
export interface RawStargazer {
	starred_at: string;
	user: {
		login: string;
		avatar_url: string;
		html_url: string;
	};
	repo?: string;
}

/** Fetches recent stargazers across the user's repositories. */
export class RecentStargazersFetcher implements IDataFetcher<RawStargazer[]> {
	constructor(
		private readonly service: GitHubService,
		private readonly octokit: Octokit,
		private readonly reposData: Promise<Repository[]>,
	) {}

	/** Iterates over top repositories, fetches stargazers with timestamps, and returns the sorted list. */
	async fetch(): Promise<RawStargazer[]> {
		const owner = this.service.getUsername();
		try {
			const repos = await this.reposData;
			// Sort repos by pushed_at or stargazers_count to get the most likely active/starred ones
			const activeRepos = [...repos]
				.filter(
					(r) =>
						r.stargazers_count &&
						r.stargazers_count > 0 &&
						!r.private &&
						!r.fork,
				)
				.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
				.slice(0, 10); // Limit to top 10 repos to avoid rate limits

			const fetchPromises = activeRepos.map(async (repo) => {
				try {
					const perPage = 30;
					const lastPage = Math.ceil((repo.stargazers_count || 1) / perPage);

					// We need the custom header to get the starred_at timestamp
					const response = await this.octokit.request(
						"GET /repos/{owner}/{repo}/stargazers",
						{
							owner,
							repo: repo.name,
							per_page: perPage,
							page: lastPage || 1,
							headers: {
								accept: "application/vnd.github.v3.star+json",
							},
						},
					);
					return (response.data as RawStargazer[]).map((s) => ({
						...s,
						repo: repo.name,
					}));
				} catch (err) {
					console.error(
						`Failed to fetch stargazers for repo ${repo.name}:`,
						err,
					);
					return [];
				}
			});

			const results = await Promise.all(fetchPromises);

			const twoWeeksAgo = new Date();
			twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

			const allStargazers = results.flat().filter((s) => {
				if (!s.starred_at || !s.user) return false;
				const starDate = new Date(s.starred_at);
				return starDate >= twoWeeksAgo;
			});

			// Sort descending by starred_at
			allStargazers.sort(
				(a, b) =>
					new Date(b.starred_at).getTime() - new Date(a.starred_at).getTime(),
			);

			// Dedup stargazers by username (in case they starred multiple repos)
			const seen = new Set<string>();
			const deduped: RawStargazer[] = [];
			for (const stargazer of allStargazers) {
				if (!seen.has(stargazer.user.login)) {
					seen.add(stargazer.user.login);
					deduped.push(stargazer);
				}
			}

			return deduped.slice(0, 10); // Keep top 10 to be safe, formatter will limit to 5
		} catch (error) {
			console.error("Error fetching recent stargazers:", error);
			return [];
		}
	}
}
