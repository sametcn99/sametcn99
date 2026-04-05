import type { RawStargazer } from "../github-service/RecentStargazersFetcher";

export class TelegramService {
	constructor(
		private readonly botToken?: string,
		private readonly chatId?: string,
	) {}

	async sendChangeMessage(
		addedStargazers: RawStargazer[],
		removedStargazers: RawStargazer[],
		newIssues: { title: string; html_url: string }[],
	): Promise<void> {
		if (!this.botToken || !this.chatId) {
			console.log(
				"Telegram credentials missing (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID). Skipping notification.",
			);
			return;
		}

		let message = "🌟 *GitHub Profile Update* 🌟\n\n";

		if (
			addedStargazers.length === 0 &&
			removedStargazers.length === 0 &&
			newIssues.length === 0
		) {
			message +=
				"✅ GitHub Action executed successfully and README updated (No new changes).\n\n";
		}

		if (addedStargazers.length > 0) {
			message += "✅ *New Stargazers:*\n";
			for (const stargazer of addedStargazers) {
				message += `- [${stargazer.user.login}](${stargazer.user.html_url}) on _${stargazer.repo}_\n`;
			}
			message += "\n";
		}

		if (removedStargazers.length > 0) {
			message += "❌ *Removed/Expired Stargazers:*\n";
			for (const stargazer of removedStargazers) {
				message += `- [${stargazer.user.login}](${stargazer.user.html_url}) on _${stargazer.repo}_\n`;
			}
			message += "\n";
		}

		if (newIssues.length > 0) {
			message += "🐛 *New Open Issues:*\n";
			for (const issue of newIssues) {
				message += `- [${issue.title}](${issue.html_url})\n`;
			}
			message += "\n";
		}

		try {
			const response = await fetch(
				`https://api.telegram.org/bot${this.botToken}/sendMessage`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						chat_id: this.chatId,
						text: message,
						parse_mode: "Markdown",
						disable_web_page_preview: true,
					}),
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Failed to send Telegram message:", errorText);
			} else {
				console.log("Successfully sent Telegram notification.");
			}
		} catch (error) {
			console.error("Error sending Telegram message:", error);
		}
	}
}
