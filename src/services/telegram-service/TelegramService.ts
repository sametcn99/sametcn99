import type { RawStargazer } from "../github-service/RecentStargazersFetcher";

export class TelegramService {
	constructor(
		private readonly botToken?: string,
		private readonly chatId?: string,
	) {}

	private escapeHtml(text?: string): string {
		if (!text) return "";
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	}

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

		let message = "🌟 <b>GitHub Profile Update</b> 🌟\n\n";

		if (
			addedStargazers.length === 0 &&
			removedStargazers.length === 0 &&
			newIssues.length === 0
		) {
			message +=
				"✅ GitHub Action executed successfully and README updated (No new changes).\n\n";
		}

		if (addedStargazers.length > 0) {
			message += "✅ <b>New Stargazers:</b>\n";
			for (const stargazer of addedStargazers) {
				message += `- <a href="${stargazer.user.html_url}">${this.escapeHtml(stargazer.user.login)}</a> on <i>${this.escapeHtml(stargazer.repo)}</i>\n`;
			}
			message += "\n";
		}

		if (removedStargazers.length > 0) {
			message += "❌ <b>Removed/Expired Stargazers:</b>\n";
			for (const stargazer of removedStargazers) {
				message += `- <a href="${stargazer.user.html_url}">${this.escapeHtml(stargazer.user.login)}</a> on <i>${this.escapeHtml(stargazer.repo)}</i>\n`;
			}
			message += "\n";
		}

		if (newIssues.length > 0) {
			message += "🐛 <b>New Open Issues:</b>\n";
			for (const issue of newIssues) {
				message += `- <a href="${issue.html_url}">${this.escapeHtml(issue.title)}</a>\n`;
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
						parse_mode: "HTML",
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

	async sendFollowMessage(
		followedAccounts: { login: string; type: string }[],
	): Promise<void> {
		if (!this.botToken || !this.chatId) {
			console.log(
				"Telegram credentials missing (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID). Skipping notification.",
			);
			return;
		}

		let message = "👥 <b>GitHub Follow-back Update</b> 👥\n\n";

		if (followedAccounts.length === 0) {
			message +=
				"✅ Follow-back script executed successfully (No new followers to catch up).\n\n";
		} else {
			message += "🤝 <b>New accounts followed:</b>\n";
			for (const account of followedAccounts) {
				message += `- <a href="https://github.com/${account.login}">${this.escapeHtml(account.login)}</a> (${this.escapeHtml(account.type)})\n`;
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
						parse_mode: "HTML",
						disable_web_page_preview: true,
					}),
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Failed to send Telegram message:", errorText);
			} else {
				console.log("Successfully sent Telegram follow-back notification.");
			}
		} catch (error) {
			console.error("Error sending Telegram message:", error);
		}
	}
}
