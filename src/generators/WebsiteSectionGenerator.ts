import { MarkdownUtils } from "../utils/MarkdownUtils";

export class WebsiteSectionGenerator implements ISectionGenerator {
	constructor(private readonly posts: FeedItem[]) {}

	generate(): string {
		if (this.posts.length === 0) return "";

		let content = "";
		content += `## Latest Content${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		content += `Stay updated with my latest blog posts, tutorials, and other content published on my personal website. Here you'll find thoughts on technology, development guides, and project showcases.${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;

		const topPosts = this.posts.slice(0, 10);
		const olderPosts = this.posts.slice(10);

		for (const item of topPosts) {
			content += `${this.formatPost(item)}${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		}

		if (olderPosts.length > 0) {
			content += `<details>${MarkdownUtils.newLine()}`;
			content += `<summary>Show ${olderPosts.length} more posts...</summary>${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;

			for (const item of olderPosts) {
				content += `${this.formatPost(item)}${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
			}

			content += `</details>${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		}

		return content;
	}

	private formatPost(item: FeedItem): string {
		const summary = item.summary;
		const date = item.date_published
			? MarkdownUtils.formatDateLong(item.date_published)
			: "";
		const dateStr = date ? ` *(${date})*` : "";
		return `- [**${item.title}**](${item.url})${dateStr}<br />${summary}`;
	}
}
