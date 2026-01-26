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

type GitHubEvent =
	RestEndpointMethodTypes["activity"]["listPublicEventsForUser"]["response"]["data"][number];

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

	private generateContactSection(): string {
		let content = "";
		content += `## Contact${this.addNewLine()}${this.addNewLine()}`;
		content += `- [Website](https://sametcc.me)${this.addNewLine()}`;
		content += `- [LinkedIn](https://sametcc.me/link/linkedin)${this.addNewLine()}`;
		content += `- [Telegram](https://sametcc.me/link/telegram)${this.addNewLine()}`;
		content += `- [Mail](https://sametcc.me/link/mail)${this.addNewLine()}`;
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
				content += `- [**${item.title}**](${item.url})${dateStr}<br />${summary}${this.addNewLine()}${this.addNewLine()}`;
			}
		}
		return content;
	}

	private generateActivitySection(events: GitHubEvent[]): string {
		let content = "";
		if (events.length > 0) {
			content += `## Latest Activity${this.addNewLine()}${this.addNewLine()}`;

			// Filter out PushEvents (commits) and skip events with null type
			const filteredEvents = events.filter(
				(event) => event.type && event.type !== "PushEvent",
			);

			const recentEvents = filteredEvents.slice(0, 10);
			const olderEvents = filteredEvents.slice(10);

			// Helper function to format activity
			const formatActivity = (event: GitHubEvent): string => {
				const date = event.created_at
					? new Date(event.created_at).toLocaleDateString("en-US", {
							year: "numeric",
							month: "short",
							day: "numeric",
						})
					: "";

				const repoName = event.repo.name;
				const repoUrl = `https://github.com/${repoName}`;
				let activity = "";

				const eventType = event.type ?? "";

				switch (eventType) {
					case "CreateEvent":
						if (event.payload && "ref_type" in event.payload) {
							const refType = (event.payload as { ref_type?: string }).ref_type;
							const ref = (event.payload as { ref?: string }).ref;
							if (refType === "repository") {
								activity = `Created repository [${repoName}](${repoUrl})`;
							} else if (refType === "branch") {
								activity = `Created branch \`${ref}\` in [${repoName}](${repoUrl})`;
							} else if (refType === "tag") {
								activity = `Created tag \`${ref}\` in [${repoName}](${repoUrl})`;
							}
						}
						break;
					case "DeleteEvent":
						if (event.payload && "ref_type" in event.payload) {
							const refType = (event.payload as { ref_type?: string }).ref_type;
							const ref = (event.payload as { ref?: string }).ref;
							activity = `Deleted ${refType} \`${ref}\` in [${repoName}](${repoUrl})`;
						}
						break;
					case "IssuesEvent":
						if (
							event.payload &&
							"action" in event.payload &&
							"issue" in event.payload
						) {
							const action = (event.payload as { action?: string }).action;
							const issue = (
								event.payload as {
									issue?: {
										number?: number;
										title?: string;
										html_url?: string;
									};
								}
							).issue;
							activity = `${action?.charAt(0).toUpperCase()}${action?.slice(1)} issue [#${issue?.number}](${issue?.html_url}) in [${repoName}](${repoUrl})`;
						}
						break;
					case "IssueCommentEvent":
						if (event.payload && "issue" in event.payload) {
							const issue = (
								event.payload as {
									issue?: { number?: number; html_url?: string };
								}
							).issue;
							activity = `Commented on issue [#${issue?.number}](${issue?.html_url}) in [${repoName}](${repoUrl})`;
						}
						break;
					case "PullRequestEvent":
						if (
							event.payload &&
							"action" in event.payload &&
							"pull_request" in event.payload
						) {
							const action = (event.payload as { action?: string }).action;
							const pr = (
								event.payload as {
									pull_request?: {
										number?: number;
										title?: string;
										html_url?: string;
									};
								}
							).pull_request;
							activity = `${action?.charAt(0).toUpperCase()}${action?.slice(1)} pull request [#${pr?.number}](${pr?.html_url}) in [${repoName}](${repoUrl})`;
						}
						break;
					case "PullRequestReviewEvent":
						if (event.payload && "pull_request" in event.payload) {
							const pr = (
								event.payload as {
									pull_request?: { number?: number; html_url?: string };
								}
							).pull_request;
							activity = `Reviewed pull request [#${pr?.number}](${pr?.html_url}) in [${repoName}](${repoUrl})`;
						}
						break;
					case "PullRequestReviewCommentEvent":
						if (event.payload && "pull_request" in event.payload) {
							const pr = (
								event.payload as {
									pull_request?: { number?: number; html_url?: string };
								}
							).pull_request;
							activity = `Commented on pull request [#${pr?.number}](${pr?.html_url}) in [${repoName}](${repoUrl})`;
						}
						break;
					case "WatchEvent":
						activity = `Starred [${repoName}](${repoUrl})`;
						break;
					case "ForkEvent":
						if (event.payload && "forkee" in event.payload) {
							const forkee = (
								event.payload as {
									forkee?: { full_name?: string; html_url?: string };
								}
							).forkee;
							activity = `Forked [${repoName}](${repoUrl}) to [${forkee?.full_name}](${forkee?.html_url})`;
						}
						break;
					case "ReleaseEvent":
						if (event.payload && "release" in event.payload) {
							const release = (
								event.payload as {
									release?: { tag_name?: string; html_url?: string };
								}
							).release;
							activity = `Published release [${release?.tag_name}](${release?.html_url}) in [${repoName}](${repoUrl})`;
						}
						break;
					case "MemberEvent":
						if (
							event.payload &&
							"action" in event.payload &&
							"member" in event.payload
						) {
							const member = (event.payload as { member?: { login?: string } })
								.member;
							activity = `Added @${member?.login} as collaborator to [${repoName}](${repoUrl})`;
						}
						break;
					default:
						activity = `${eventType.replace("Event", "")} in [${repoName}](${repoUrl})`;
				}

				if (activity) {
					return `- **${activity}** *(${date})*`;
				}
				return "";
			};

			// Display recent 10 activities
			for (const event of recentEvents) {
				const formattedActivity = formatActivity(event);
				if (formattedActivity) {
					content += `${formattedActivity}${this.addNewLine()}`;
				}
			}

			// Display older activities in collapsible section
			if (olderEvents.length > 0) {
				content += `${this.addNewLine()}<details>${this.addNewLine()}`;
				content += `<summary>Show ${olderEvents.length} more activities...</summary>${this.addNewLine()}${this.addNewLine()}`;

				for (const event of olderEvents) {
					const formattedActivity = formatActivity(event);
					if (formattedActivity) {
						content += `${formattedActivity}${this.addNewLine()}`;
					}
				}

				content += `${this.addNewLine()}</details>${this.addNewLine()}`;
			}

			content += this.addNewLine();
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
					const name = `[${repo.name}](https://sametcc.me/repo/${repo.name})${stars}${lang}`;
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
					const name = `[${repo.name}](https://sametcc.me/repo/${repo.name})${stars}${lang}`;
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
					const name = `[${repo.name}](https://sametcc.me/repo/${repo.name})${stars}${lang}`;
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
		content += `- [Latest Activity](#latest-activity)${this.addNewLine()}`;
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

	private async fetchEvents(): Promise<GitHubEvent[]> {
		console.log(`Fetching events for ${this.TARGET_USERNAME}...`);
		let eventsData: GitHubEvent[] = [];
		try {
			// GitHub API returns max 300 events (last 90 days), fetch all 3 pages
			for (let page = 1; page <= 3; page++) {
				try {
					const { data } =
						await this.octokit.rest.activity.listPublicEventsForUser({
							username: this.TARGET_USERNAME,
							per_page: 100,
							page: page,
						});
					if (data.length > 0) {
						eventsData = [...eventsData, ...data];
					} else {
						// No more events available
						break;
					}
				} catch (error) {
					console.error(`Error fetching page ${page}:`, error);
					break;
				}
			}
			console.log(`Total events fetched: ${eventsData.length}`);
		} catch (error) {
			console.error("Error fetching events:", error);
		}
		return eventsData;
	}

	public async generate() {
		// 1. Fetch Data
		const recentPosts = await this.fetchFeed();
		const reposData = await this.fetchRepos();
		const eventsData = await this.fetchEvents();

		// 2. Generate Markdown
		console.log("Generating README.md...");

		let content = "";

		// TOC Section
		content += this.generateTOC();

		// Website Section
		content += this.generateWebsiteSection(recentPosts);

		// Activity Section
		content += this.generateActivitySection(eventsData);

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
