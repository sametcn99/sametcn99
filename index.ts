import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest";

type FeedItem = {
	id: string;
	url: string;
	title: string;
	summary: string;
	date_published?: string;
};

type Feed = {
	items: FeedItem[];
};

type Repository =
	RestEndpointMethodTypes["repos"]["listForUser"]["response"]["data"][number];

class Application {
	private readonly FEED_URL = "https://sametcc.me/feed.json";
	private readonly TARGET_USERNAME = "sametcn99";
	private octokit: Octokit;

	constructor() {
		const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
		if (!token) {
			console.warn(
				"No GITHUB_TOKEN or GH_TOKEN found. API limits might be restricted and private repos won't be visible.",
			);
		}

		this.octokit = new Octokit({
			auth: token,
		});
	}

	private addNewLine(): string {
		return "\n";
	}

	private addDivider(): string {
		return "\n---\n";
	}

	private makeExternalLink(label: string, url: string): string {
		return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
	}

	private generateContactSection(): string {
		let content = "";
		content += `## Contact${this.addNewLine()}${this.addNewLine()}`;
		content += `- ${this.makeExternalLink("Website", "https://sametcc.me")}${this.addNewLine()}`;
		content += `- ${this.makeExternalLink("LinkedIn", "https://sametcc.me/link/linkedin")}${this.addNewLine()}`;
		content += `- ${this.makeExternalLink("Telegram", "https://sametcc.me/link/telegram")}${this.addNewLine()}`;
		content += `- ${this.makeExternalLink("Mail", "https://sametcc.me/link/mail")}${this.addNewLine()}`;
		return content;
	}

	private generateWebsiteSection(recentPosts: FeedItem[]): string {
		let content = "";
		if (recentPosts.length > 0) {
			content += `## Latest Content${this.addNewLine()}${this.addNewLine()}`;
			for (const item of recentPosts) {
				// Clean up summary if it's too long or has newlines
				const summary = item.summary
					? item.summary.replace(/\n/g, " ").slice(0, 100) +
						(item.summary.length > 100 ? "..." : "")
					: "";
				// Format date if available
				const date = item.date_published
					? new Date(item.date_published).toLocaleDateString("en-US", {
							year: "numeric",
							month: "short",
							day: "numeric",
						})
					: "";
				const dateStr = date ? ` *(${date})*` : "";
				content += `- ${this.makeExternalLink(`<strong>${item.title}</strong>`, item.url)}${dateStr}<br />${summary}${this.addNewLine()}${this.addNewLine()}`;
			}
		}
		return content;
	}

	private generateStatisticsSection(reposData: Repository[]): string {
		let content = "";
		content += `## Statistics${this.addNewLine()}${this.addNewLine()}`;

		const nonForked = reposData.filter((r) => !r.fork);

		// 1. Language Distribution
		const languageCounts: Record<string, number> = {};
		nonForked.forEach((repo) => {
			if (repo.language) {
				languageCounts[repo.language] =
					(languageCounts[repo.language] || 0) + 1;
			}
		});

		const sortedLanguages = Object.entries(languageCounts).sort(
			([, a], [, b]) => b - a,
		);

		if (sortedLanguages.length > 0) {
			content += `### Languages${this.addNewLine()}${this.addNewLine()}`;
			content += `\`\`\`mermaid${this.addNewLine()}`;
			content += `pie showData${this.addNewLine()}`;
			content += `    title Top Languages (by Repo Count)${this.addNewLine()}`;
			sortedLanguages.forEach(([lang, count]) => {
				content += `    "${lang}" : ${count}${this.addNewLine()}`;
			});
			content += `\`\`\`${this.addNewLine()}${this.addNewLine()}`;
		}

		// 2. Repositories by Year
		const yearCounts: Record<string, number> = {};
		nonForked.forEach((repo) => {
			if (repo.created_at) {
				const year = new Date(repo.created_at).getFullYear();
				yearCounts[year] = (yearCounts[year] || 0) + 1;
			}
		});

		const sortedYears = Object.entries(yearCounts).sort(
			([a], [b]) => parseInt(a, 10) - parseInt(b, 10),
		);

		if (sortedYears.length > 0) {
			const years = sortedYears.map(([y]) => y);
			const counts = sortedYears.map(([, c]) => c);
			const maxCount = Math.max(...counts);

			content += `### Repositories Created per Year${this.addNewLine()}${this.addNewLine()}`;
			content += `\`\`\`mermaid${this.addNewLine()}`;
			content += `xychart-beta${this.addNewLine()}`;
			content += `    title Repositories per Year${this.addNewLine()}`;
			content += `    x-axis [${years.join(", ")}]${this.addNewLine()}`;
			content += `    y-axis "Count" 0 --> ${maxCount + 1}${this.addNewLine()}`;
			content += `    bar [${counts.join(", ")}]${this.addNewLine()}`;
			content += `\`\`\`${this.addNewLine()}${this.addNewLine()}`;
		}

		// 3. Repository Distribution (Active vs Forked vs Archived)
		const active = reposData.filter((r) => !r.fork && !r.archived).length;
		const forked = reposData.filter((r) => r.fork && !r.archived).length;
		const archived = reposData.filter((r) => r.archived).length;

		content += `### Repository Distribution${this.addNewLine()}${this.addNewLine()}`;
		content += `\`\`\`mermaid${this.addNewLine()}`;
		content += `pie showData${this.addNewLine()}`;
		content += `    title Repository Status${this.addNewLine()}`;
		content += `    "Active" : ${active}${this.addNewLine()}`;
		content += `    "Forked" : ${forked}${this.addNewLine()}`;
		content += `    "Archived" : ${archived}${this.addNewLine()}`;
		content += `\`\`\`${this.addNewLine()}`;

		return content;
	}

	private generateReposSection(reposData: Repository[]): string {
		let content = "";
		if (reposData.length > 0) {
			content += `${this.addNewLine()}## Repositories${this.addNewLine()}${this.addNewLine()}`;

			// Helper to format dates US style (MM/DD/YYYY)
			const formatDate = (dateStr: string | null | undefined) => {
				if (!dateStr) return "-";
				const date = new Date(dateStr);
				return `${(date.getUTCMonth() + 1).toString().padStart(2, "0")}/${date
					.getUTCDate()
					.toString()
					.padStart(2, "0")}/${date.getUTCFullYear()}`;
			};

			// Filter repos into categories
			const activeRepos = reposData.filter((r) => !r.fork && !r.archived);
			const forkedRepos = reposData.filter((r) => r.fork && !r.archived);
			const archivedRepos = reposData.filter((r) => r.archived);

			// Active Repositories
			if (activeRepos.length > 0) {
				content += `### Active Repositories${this.addNewLine()}${this.addNewLine()}`;
				content += `| Repository | Description | Created / Last Commit |${this.addNewLine()}`;
				content += `|------------|-------------|-----------------------|${this.addNewLine()}`;

				for (const repo of activeRepos) {
					const stars = repo.stargazers_count
						? ` ★${repo.stargazers_count}`
						: "";
					const lang = repo.language ? ` - ${repo.language}` : "";
					const name = `${this.makeExternalLink(repo.name, `https://sametcc.me/repo/${repo.name}`)}${stars}${lang}`;
					const desc = (repo.description || "No description provided.").replace(
						/\|/g,
						"\\|",
					);
					const dates = `${formatDate(repo.created_at)}<br />${formatDate(repo.pushed_at)}`;
					content += `| ${name} | ${desc} | ${dates} |${this.addNewLine()}`;
				}
				content += this.addNewLine();
			}

			// Forked Repositories
			if (forkedRepos.length > 0) {
				content += `### Forked Repositories${this.addNewLine()}${this.addNewLine()}`;
				content += `| Repository | Description | Created / Last Commit |${this.addNewLine()}`;
				content += `|------------|-------------|-----------------------|${this.addNewLine()}`;

				for (const repo of forkedRepos) {
					const stars = repo.stargazers_count
						? ` ★${repo.stargazers_count}`
						: "";
					const lang = repo.language ? ` - ${repo.language}` : "";
					const name = `${this.makeExternalLink(repo.name, `https://sametcc.me/repo/${repo.name}`)}${stars}${lang}`;
					const desc = (repo.description || "No description provided.").replace(
						/\|/g,
						"\\|",
					);
					const dates = `${formatDate(repo.created_at)}<br />${formatDate(repo.pushed_at)}`;
					content += `| ${name} | ${desc} | ${dates} |${this.addNewLine()}`;
				}
				content += this.addNewLine();
			}

			// Archived Repositories
			if (archivedRepos.length > 0) {
				content += `### Archived Repositories${this.addNewLine()}${this.addNewLine()}`;
				content += `| Repository | Description | Created / Last Commit |${this.addNewLine()}`;
				content += `|------------|-------------|-----------------------|${this.addNewLine()}`;

				for (const repo of archivedRepos) {
					const stars = repo.stargazers_count
						? ` ★${repo.stargazers_count}`
						: "";
					const lang = repo.language ? ` - ${repo.language}` : "";
					const name = `${this.makeExternalLink(repo.name, `https://sametcc.me/repo/${repo.name}`)}${stars}${lang}`;
					const desc = (repo.description || "No description provided.").replace(
						/\|/g,
						"\\|",
					);
					const dates = `${formatDate(repo.created_at)}<br />${formatDate(repo.pushed_at)}`;
					content += `| ${name} | ${desc} | ${dates} |${this.addNewLine()}`;
				}
			}
		}
		content += this.addNewLine();
		return content;
	}

	private generateFooter(): string {
		let content = "";
		content += this.addDivider();
		content += `${this.addNewLine()}Auto-generated<br />${this.addNewLine()}`;
		content += `Last updated: ${new Date().toUTCString()}${this.addNewLine()}`;
		return content;
	}

	private generateTOC(): string {
		let content = "";
		content += `#### Table of Contents${this.addNewLine()}${this.addNewLine()}`;
		content += `- [Latest Content](#latest-content)${this.addNewLine()}`;
		content += `- [Statistics](#statistics)${this.addNewLine()}`;
		content += `  - [Languages](#languages)${this.addNewLine()}`;
		content += `  - [Repositories Created per Year](#repositories-created-per-year)${this.addNewLine()}`;
		content += `  - [Repository Distribution](#repository-distribution)${this.addNewLine()}`;
		content += `- [Repositories](#repositories)${this.addNewLine()}`;
		content += `  - [Active Repositories](#active-repositories)${this.addNewLine()}`;
		content += `  - [Forked Repositories](#forked-repositories)${this.addNewLine()}`;
		content += `  - [Archived Repositories](#archived-repositories)${this.addNewLine()}`;
		content += `- [Contact](#contact)${this.addNewLine()}`;
		content += this.addNewLine();
		return content;
	}

	private async fetchFeed(): Promise<FeedItem[]> {
		console.log(`Fetching feed from ${this.FEED_URL}...`);
		let recentPosts: FeedItem[] = [];
		try {
			const feedRes = await fetch(this.FEED_URL);
			if (!feedRes.ok) {
				throw new Error(`Failed to fetch feed: ${feedRes.statusText}`);
			}
			const feed = (await feedRes.json()) as Feed;
			recentPosts = feed.items.slice(0, 10);
		} catch (error) {
			console.error("Error fetching feed:", error);
		}
		return recentPosts;
	}

	private async fetchRepos(): Promise<Repository[]> {
		console.log(`Fetching repositories for ${this.TARGET_USERNAME}...`);
		let reposData: Repository[] = [];
		try {
			const { data } = await this.octokit.rest.repos.listForUser({
				username: this.TARGET_USERNAME,
				per_page: 100,
				type: "owner",
			});

			reposData = data.sort((a, b) => {
				const starsA = a.stargazers_count ?? 0;
				const starsB = b.stargazers_count ?? 0;
				if (starsB !== starsA) {
					return starsB - starsA;
				}
				const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
				const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
				return dateB - dateA;
			});
		} catch (error) {
			console.error("Error fetching repositories:", error);
		}
		return reposData;
	}

	public async generate() {
		// 1. Fetch Data
		const recentPosts = await this.fetchFeed();
		const reposData = await this.fetchRepos();

		// 2. Generate Markdown
		console.log("Generating README.md...");

		let content = "";

		// TOC Section
		content += this.generateTOC();

		// Website Section
		content += this.generateWebsiteSection(recentPosts);

		// Statistics Section
		content += this.generateStatisticsSection(reposData);

		// Repos Section
		content += this.generateReposSection(reposData);

		// Contact Section
		content += this.generateContactSection();

		// Footer
		content += this.generateFooter();

		const outputPath = "README.md";
		await Bun.write(outputPath, content);
		console.log(`${outputPath} updated successfully!`);
	}
}

// Run execution
const app = new Application();
app.generate().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
