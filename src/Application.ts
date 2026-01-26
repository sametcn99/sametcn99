import {
	ActivitySectionGenerator,
	ContactGenerator,
	FooterGenerator,
	ReposSectionGenerator,
	StatisticsSectionGenerator,
	TOCGenerator,
	WebsiteSectionGenerator,
} from "./generators";
import { FeedService } from "./services/FeedService";
import { GitHubDataProvider } from "./services/GitHubService";

interface ApplicationConfig {
	feedUrl: string;
	username: string;
	outputPath: string;
}

export class Application {
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
		const [recentPosts, reposData, eventsData] = await Promise.all([
			this.feedService.fetch(),
			this.githubProvider.fetchRepositories(),
			this.githubProvider.fetchEvents(),
		]);

		// User stats depends on repos data
		const userStats = await this.githubProvider.fetchUserStats(reposData);

		// 2. Build section generators
		const generators: ISectionGenerator[] = [
			new TOCGenerator(),
			new WebsiteSectionGenerator(recentPosts),
			new ActivitySectionGenerator(eventsData),
			new StatisticsSectionGenerator(reposData, userStats),
			new ReposSectionGenerator(reposData),
			new ContactGenerator(),
			new FooterGenerator(),
		];

		// 3. Generate content
		console.log("Generating README.md...");
		const content = generators.map((gen) => gen.generate()).join("");

		// 4. Write output
		await Bun.write(this.config.outputPath, content);
		console.log(`${this.config.outputPath} updated successfully!`);
	}
}
