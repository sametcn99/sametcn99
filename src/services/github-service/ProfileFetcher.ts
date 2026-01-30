import type { Octokit } from "@octokit/rest";
import type { GitHubService } from "./GitHubService";

/** Fetches the user's profile data and handles errors gracefully. */
export class ProfileFetcher implements IDataFetcher<UserProfile | null> {
	/** Injects the username service and Octokit client. */
	constructor(
		private readonly service: GitHubService,
		private readonly octokit: Octokit,
	) {}

	/**
	 * Returns the profile payload or null when the request fails.
	 */
	async fetch(): Promise<UserProfile | null> {
		const username = this.service.getUsername();
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
