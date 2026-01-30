/** Fetches and normalizes posts from a JSON feed. */
export class FeedService implements IDataFetcher<FeedItem[]> {
	/** Instantiates the service with the source URL. */
	constructor(private readonly feedUrl: string) {}

	/**
	 * Returns feed items after normalizing fallbacks for URL/title/summary and
	 * filtering out entries without a valid link.
	 */
	async fetch(): Promise<FeedItem[]> {
		try {
			const feedRes = await fetch(this.feedUrl);
			if (!feedRes.ok)
				throw new Error(`Failed to fetch feed: ${feedRes.statusText}`);
			const feed = (await feedRes.json()) as JSONFeed;
			return feed.items
				.map((item) => ({
					id: item.id,
					url: item.url || item.external_url || "",
					title: item.title || "Untitled",
					summary: item.summary || item.content_text || "",
					date_published: item.date_published,
				}))
				.filter((item) => item.url !== "");
		} catch (error) {
			console.error("Error fetching feed:", error);
			return [];
		}
	}
}
