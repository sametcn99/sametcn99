import Handlebars from "handlebars";
import { FeedService } from "./services/feed-service/FeedService";
import { GitHubDataProvider } from "./services/github-service/GitHubDataProvider";
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
		const userProfilePromise = this.githubProvider.fetchProfile();
		const workflowPromise = this.githubProvider.fetchWorkflow();

		const userStatsPromise = this.githubProvider.fetchUserStats(
			reposDataPromise,
			userProfilePromise,
		);

		const [
			recentPosts,
			reposData,
			eventsData,
			userProfile,
			workflowData,
			userStats,
		] = await Promise.all([
			recentPostsPromise,
			reposDataPromise,
			eventsDataPromise,
			userProfilePromise,
			workflowPromise,
			userStatsPromise,
		]);

		if (!userProfile) {
			throw new Error("Failed to fetch user profile");
		}

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
			stats: userStats,
			repos: DataFormatter.prepareRepoData(reposData),
			workflow,
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
