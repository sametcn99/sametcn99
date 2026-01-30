/** Lightweight wrapper holding the GitHub username and token warning logic. */
export class GitHubService {
	private readonly username: string;

	/**
	 * Stores the username and logs a warning when no token is provided.
	 */
	constructor(username: string, token?: string) {
		this.username = username;

		if (!token)
			console.warn(
				"No GITHUB_TOKEN found. API limits might be restricted and private repos won't be visible.",
			);
	}

	/** Returns the username that will be used for API requests. */
	getUsername(): string {
		return this.username;
	}
}
