import type { Octokit } from "@octokit/rest";
import type { GitHubService } from "./GitHubService";

/** Loads multiple pages of public events for the configured user. */
export class EventFetcher implements IDataFetcher<GitHubEvent[]> {
	/** Keeps references to the GitHub service and Octokit client. */
	constructor(
		private readonly service: GitHubService,
		private readonly octokit: Octokit,
	) {}

	/**
	 * Returns event data by paginating up to three pages, stopping early
	 * when pages return no results or when an error occurs.
	 */
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
