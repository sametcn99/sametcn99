import type { Octokit } from "@octokit/rest";

/** Retrieves releases across owned repositories, sorted by most recent. */
export class ReleaseFetcher implements IDataFetcher<Release[]> {
	constructor(
		private readonly octokit: Octokit,
		private readonly reposPromise: Promise<Repository[]>,
	) {}

	async fetch(): Promise<Release[]> {
		const repos = await this.reposPromise;
		const allReleases: Release[] = [];

		for (const repo of repos) {
			if (repo.fork || repo.archived) {
				continue;
			}

			try {
				const releases = await this.octokit.paginate(
					this.octokit.rest.repos.listReleases,
					{
						owner: repo.owner.login,
						repo: repo.name,
						per_page: 100,
					},
				);

				for (const release of releases) {
					allReleases.push({
						repo_name: repo.name,
						repo_html_url: repo.html_url,
						tag_name: release.tag_name,
						release_name: release.name ?? release.tag_name,
						html_url: release.html_url,
						published_at: release.published_at ?? null,
						is_prerelease: release.prerelease,
					});
				}
			} catch (error) {
				console.error(`Failed to fetch releases for ${repo.full_name}:`, error);
			}
		}

		return allReleases
			.sort((a, b) => {
				const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
				const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
				return dateB - dateA;
			})
			.slice(0, 20);
	}
}
