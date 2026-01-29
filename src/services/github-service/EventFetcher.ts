import type { Octokit } from "@octokit/rest";
import type { GitHubService } from "./GitHubService";

export class EventFetcher implements IDataFetcher<GitHubEvent[]> {
	constructor(
		private readonly service: GitHubService,
		private readonly octokit: Octokit,
	) {}

	async fetch(): Promise<GitHubEvent[]> {
		const username = this.service.getUsername();
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
		} catch (error) {
			console.error("Error fetching events:", error);
		}
		return eventsData;
	}
}
