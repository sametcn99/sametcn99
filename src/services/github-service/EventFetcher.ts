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
		const eventsWithCommitMessages = await this.enrichPushEvents(eventsData);
		return this.enrichPullRequestEvents(eventsWithCommitMessages);
	}

	/** Adds the latest commit message when GitHub omits commit details from an event. */
	private async enrichPushEvents(
		events: GitHubEvent[],
	): Promise<GitHubEvent[]> {
		const pushIndexes = events.reduce<number[]>((indexes, event, index) => {
			if (event.type !== "PushEvent" || !event.payload) {
				return indexes;
			}

			const payload = event.payload as {
				head?: string;
				commits?: { sha?: string; message?: string; url?: string }[];
			};
			if (payload.head && !payload.commits?.length && indexes.length < 5) {
				indexes.push(index);
			}
			return indexes;
		}, []);

		const enrichedEvents = events.slice();
		await Promise.all(
			pushIndexes.map(async (index) => {
				const event = events[index];
				if (!event) {
					return;
				}
				const payload = event.payload as {
					head?: string;
					commits?: { sha?: string; message?: string; url?: string }[];
				};
				const [owner, repo] = event.repo.name.split("/");

				if (!payload.head || !owner || !repo) {
					return;
				}

				try {
					const { data } = await this.octokit.rest.repos.getCommit({
						owner,
						repo,
						ref: payload.head,
					});
					enrichedEvents[index] = {
						...event,
						payload: {
							...payload,
							commits: [
								{
									sha: data.sha,
									message: data.commit.message,
									url: data.html_url,
								},
							],
						},
					} as GitHubEvent;
				} catch (error) {
					console.error(
						`Failed to fetch commit message for ${event.repo.name}:`,
						error,
					);
				}
			}),
		);

		return enrichedEvents;
	}

	/** Adds pull request titles when GitHub omits them from activity events. */
	private async enrichPullRequestEvents(
		events: GitHubEvent[],
	): Promise<GitHubEvent[]> {
		const pullRequestIndexes = events.reduce<number[]>(
			(indexes, event, index) => {
				if (
					!event.payload ||
					(event.type !== "PullRequestEvent" &&
						event.type !== "PullRequestReviewEvent" &&
						event.type !== "PullRequestReviewCommentEvent")
				) {
					return indexes;
				}

				const payload = event.payload as {
					pull_request?: { number?: number; title?: string };
				};
				if (
					payload.pull_request?.number &&
					!payload.pull_request.title &&
					indexes.length < 10
				) {
					indexes.push(index);
				}
				return indexes;
			},
			[],
		);

		const enrichedEvents = events.slice();
		await Promise.all(
			pullRequestIndexes.map(async (index) => {
				const event = events[index];
				if (!event) {
					return;
				}

				const payload = event.payload as {
					pull_request?: { number?: number; title?: string };
				};
				const [owner, repo] = event.repo.name.split("/");
				const pullNumber = payload.pull_request?.number;

				if (!owner || !repo || !pullNumber) {
					return;
				}

				try {
					const { data } = await this.octokit.rest.pulls.get({
						owner,
						repo,
						pull_number: pullNumber,
					});
					enrichedEvents[index] = {
						...event,
						payload: {
							...payload,
							pull_request: {
								...payload.pull_request,
								title: data.title,
							},
						},
					} as GitHubEvent;
				} catch (error) {
					console.error(
						`Failed to fetch pull request title for ${event.repo.name}#${pullNumber}:`,
						error,
					);
				}
			}),
		);

		return enrichedEvents;
	}
}
