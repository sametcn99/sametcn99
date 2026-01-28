import Handlebars from "handlebars";
import { FeedService } from "./services/FeedService";
import { GitHubDataProvider } from "./services/GitHubService";
import { DataFormatter } from "./utils/DataFormatter";

interface ApplicationConfig {
	feedUrl: string;
	username: string;
	outputPath: string;
}

class Application {
	private readonly config: ApplicationConfig;
	private readonly githubProvider: GitHubDataProvider;
	private readonly feedService: FeedService;

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

	public async generate(): Promise<void> {
		// 1. Fetch all data in parallel
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

		// 2. Load template
		const templateSource = await Bun.file("src/README.hbs.md").text();

		// 3. Compile template
		const template = Handlebars.compile(templateSource);

		// 4. Prepare context data
		const formattedActivity = eventsData
			.filter((event) => event.type !== "PushEvent")
			.map((event) => DataFormatter.formatActivity(event))
			.filter((activity): activity is string => activity !== null);

		const activity = {
			recent: formattedActivity.slice(0, 10),
			older: formattedActivity.slice(10),
		};

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
			activity,
			stats: userStats,
			repos: DataFormatter.prepareRepoData(reposData),
			workflow,
			generatedAt: new Date().toUTCString(),
		};

		// 5. Render
		const content = template(context);

		// 6. Write README.md
		console.log("Generating README.md...");
		await Bun.write(this.config.outputPath, content);
		console.log(`${this.config.outputPath} updated successfully!`);
	}
}

const app = new Application();
app.generate().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
