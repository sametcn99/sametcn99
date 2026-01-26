export class FeedService implements IDataFetcher<FeedItem[]> {
	constructor(private readonly feedUrl: string) {}

	async fetch(): Promise<FeedItem[]> {
		console.log(`Fetching feed from ${this.feedUrl}...`);

		try {
			const feedRes = await fetch(this.feedUrl);
			if (!feedRes.ok) {
				throw new Error(`Failed to fetch feed: ${feedRes.statusText}`);
			}
			const feed = (await feedRes.json()) as Feed;
			return feed.items;
		} catch (error) {
			console.error("Error fetching feed:", error);
			return [];
		}
	}
}
