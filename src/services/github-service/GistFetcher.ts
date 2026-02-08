import type { Octokit } from "@octokit/rest";
import type { GitHubService } from "./GitHubService";

/** Retrieves gists owned by the user. */
export class GistFetcher implements IDataFetcher<Gist[]> {
	/** Shares the username service and Octokit client for the request. */
	constructor(
		private readonly service: GitHubService,
		private readonly octokit: Octokit,
	) {}

	/**
	 * Returns up to 100 owned gists.
	 */
	async fetch(): Promise<Gist[]> {
		const username = this.service.getUsername();
		try {
			const { data } = await this.octokit.rest.gists.listForUser({
				username,
				per_page: 100,
			});

			return data;
		} catch (error) {
			console.error("Error fetching gists:", error);
			return [];
		}
	}
}
