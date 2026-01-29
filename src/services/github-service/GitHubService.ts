export class GitHubService {
	private readonly username: string;

	constructor(username: string, token?: string) {
		this.username = username;

		if (!token)
			console.warn(
				"No GITHUB_TOKEN found. API limits might be restricted and private repos won't be visible.",
			);
	}

	getUsername(): string {
		return this.username;
	}
}
