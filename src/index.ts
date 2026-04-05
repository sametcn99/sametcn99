import Handlebars from "handlebars";
import { FeedService } from "./services/feed-service/FeedService";
import { GitHubDataProvider } from "./services/github-service/GitHubDataProvider";
import type { RawStargazer } from "./services/github-service/RecentStargazersFetcher";
import { TelegramService } from "./services/telegram-service/TelegramService";
import { DataFormatter } from "./utils/DataFormatter";

// Register Handlebars helpers
Handlebars.registerHelper("or", (a, b) => a || b);
Handlebars.registerHelper("any", (...args) => args.slice(0, -1).some(Boolean));

/** Configuration overrides used when instantiating the application. */
interface ApplicationConfig {
	/** URL of the JSON feed that should be pulled for blog posts. */
	feedUrl: string;
	/** Github username whose profile, repos, and events will be queried. */
	username: string;
	/** Destination path for the rendered README. */
	outputPath: string;
}

/** Orchestrates fetching data, formatting it, and writing README.md. */
class Application {
	private readonly config: ApplicationConfig;
	private readonly githubProvider: GitHubDataProvider;
	private readonly feedService: FeedService;

	/** Creates an application instance with optional overrides. */
	constructor(config?: Partial<ApplicationConfig>) {
		const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

		this.config = {
			feedUrl: config?.feedUrl ?? "https://sametcc.me/feed.json",
			username: config?.username ?? "sametcn99",
			outputPath: config?.outputPath ?? "README.md",
		};

		this.githubProvider = new GitHubDataProvider(this.config.username, token);
		this.feedService = new FeedService(this.config.feedUrl);
	}

	/**
	 * Fetches data from GitHub and the feed, renders the Handlebars template,
	 * and writes the resulting README content to the configured path.
	 */
	public async generate(): Promise<void> {
		const recentPostsPromise = this.feedService.fetch();
		const reposDataPromise = this.githubProvider.fetchRepositories();
		const eventsDataPromise = this.githubProvider.fetchEvents();
		const issuesPromise = this.githubProvider.fetchOpenIssues(reposDataPromise);
		const userProfilePromise = this.githubProvider.fetchProfile();
		const workflowPromise = this.githubProvider.fetchWorkflow();
		const stargazersPromise =
			this.githubProvider.fetchRecentStargazers(reposDataPromise);

		const userStatsPromise = this.githubProvider.fetchUserStats(
			reposDataPromise,
			userProfilePromise,
		);

		const [
			recentPosts,
			reposData,
			eventsData,
			openIssues,
			userProfile,
			workflowData,
			userStats,
			stargazers,
		] = await Promise.all([
			recentPostsPromise,
			reposDataPromise,
			eventsDataPromise,
			issuesPromise,
			userProfilePromise,
			workflowPromise,
			userStatsPromise,
			stargazersPromise,
		]);

		if (!userProfile) {
			throw new Error("Failed to fetch user profile");
		}

		const previousStargazers: RawStargazer[] = [];
		const previousIssueUrls: Set<string> = new Set();

		try {
			const readmeFile = Bun.file(this.config.outputPath);
			if (await readmeFile.exists()) {
				const readmeContent = await readmeFile.text();

				const stargazerRegex =
					/- \[\*\*@(.+?)\*\*\]\(([^)]+)\) starred \[\*\*(.+?)\*\*\]/g;
				let match: RegExpExecArray | null;
				// biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop
				while ((match = stargazerRegex.exec(readmeContent)) !== null) {
					previousStargazers.push({
						user: {
							login: match[1] ?? "",
							html_url: match[2] ?? "",
							avatar_url: "",
						},
						repo: match[3] ?? "",
						starred_at: "",
					});
				}

				const issueRegex =
					/- \[\*\*(.+?)\*\*\]\((https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+)\)/g;
				// biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop
				while ((match = issueRegex.exec(readmeContent)) !== null) {
					previousIssueUrls.add(match[2] ?? "");
				}
			}
		} catch (e) {
			console.error("Failed to read previous state from README", e);
		}

		const addedStargazers = stargazers.filter(
			(s) => !previousStargazers.some((p) => p.user.login === s.user.login),
		);
		const removedStargazers = previousStargazers.filter(
			(p) => !stargazers.some((s) => s.user.login === p.user.login),
		);

		const newIssues = openIssues.filter(
			(issue) => !previousIssueUrls.has(issue.html_url),
		);

		const telegramService = new TelegramService(
			process.env.TELEGRAM_BOT_TOKEN,
			process.env.TELEGRAM_CHAT_ID,
		);
		await telegramService.sendChangeMessage(
			addedStargazers,
			removedStargazers,
			newIssues,
		);

		const templateSource = await Bun.file("src/README.md.hbs").text();
		const template = Handlebars.compile(templateSource);

		const workflow = workflowData
			? {
					name: workflowData.name,
					id: workflowData.id,
					html_url: workflowData.html_url,
					event: workflowData.event,
					date: workflowData.run_started_at
						? new Date(workflowData.run_started_at).toUTCString()
						: "Unknown",
				}
			: null;

		const context = {
			posts: DataFormatter.preparePostsData(recentPosts),
			activity: DataFormatter.prepareActivityData(eventsData),
			issues: DataFormatter.prepareIssuesData(openIssues),
			stats: userStats,
			repos: DataFormatter.prepareRepoData(reposData),
			workflow,
			stargazers: DataFormatter.prepareRecentStargazersData(stargazers),
			generatedAt: new Date().toUTCString(),
		};

		const content = template(context);
		await Bun.write(this.config.outputPath, content);
	}
}

const app = new Application();
app.generate().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
