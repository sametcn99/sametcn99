import { Octokit } from "@octokit/rest";

type FeedItem = {
    id: string;
    url: string;
    title: string;
    summary: string;
    date_published?: string;
}

type Feed = {
    items: FeedItem[];
}

class Application {
    private readonly FEED_URL = "https://sametcc.me/feed.json";
    private readonly TARGET_USERNAME = "sametcn99";
    private octokit: Octokit;

    constructor() {
        const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
        if (!token) {
            console.warn("No GITHUB_TOKEN or GH_TOKEN found. API limits might be restricted and private repos won't be visible.");
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
                const summary = item.summary ? item.summary.replace(/\n/g, " ").slice(0, 100) + (item.summary.length > 100 ? "..." : "") : "";
                // Format date if available
                const date = item.date_published ? new Date(item.date_published).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "";
                const dateStr = date ? ` *(${date})*` : "";
                content += `- [**${item.title}**](${item.url})${dateStr} - ${summary}${this.addNewLine()}`;
            }
        }
        return content;
    }

    private generateReposSection(reposData: any[]): string {
        let content = "";
        if (reposData.length > 0) {
            content += `${this.addNewLine()}## Repositories${this.addNewLine()}${this.addNewLine()}`;

            // Filter repos into categories
            const activeRepos = reposData.filter(r => !r.fork && !r.archived);
            const forkedRepos = reposData.filter(r => r.fork && !r.archived);
            const archivedRepos = reposData.filter(r => r.archived);

            // Active Repositories
            if (activeRepos.length > 0) {
                content += `### Active Repositories${this.addNewLine()}${this.addNewLine()}`;
                content += `| Repository | Description | Language | Topics |${this.addNewLine()}`;
                content += `|------------|-------------|----------|--------|${this.addNewLine()}`;

                for (const repo of activeRepos) {
                    const name = `[${repo.name}](https://sametcc.me/repo/${repo.name})`;
                    const desc = (repo.description || "No description provided.").replace(/\|/g, "\\|");
                    const lang = repo.language || "-";
                    const topics = repo.topics && repo.topics.length > 0 ? repo.topics.map((t: string) => `\`${t}\``).join(" ") : "-";
                    content += `| ${name} | ${desc} | ${lang} | ${topics} |${this.addNewLine()}`;
                }
                content += this.addNewLine();
            }

            // Forked Repositories
            if (forkedRepos.length > 0) {
                content += `### Forked Repositories${this.addNewLine()}${this.addNewLine()}`;
                content += `| Repository | Description | Language | Topics |${this.addNewLine()}`;
                content += `|------------|-------------|----------|--------|${this.addNewLine()}`;

                for (const repo of forkedRepos) {
                    const name = `[${repo.name}](https://sametcc.me/repo/${repo.name})`;
                    const desc = (repo.description || "No description provided.").replace(/\|/g, "\\|");
                    const lang = repo.language || "-";
                    const topics = repo.topics && repo.topics.length > 0 ? repo.topics.map((t: string) => `\`${t}\``).join(" ") : "-";
                    content += `| ${name} | ${desc} | ${lang} | ${topics} |${this.addNewLine()}`;
                }
                content += this.addNewLine();
            }

            // Archived Repositories
            if (archivedRepos.length > 0) {
                content += `### Archived Repositories${this.addNewLine()}${this.addNewLine()}`;
                content += `| Repository | Description | Language | Topics |${this.addNewLine()}`;
                content += `|------------|-------------|----------|--------|${this.addNewLine()}`;

                for (const repo of archivedRepos) {
                    const name = `[${repo.name}](https://sametcc.me/repo/${repo.name})`;
                    const desc = (repo.description || "No description provided.").replace(/\|/g, "\\|");
                    const lang = repo.language || "-";
                    const topics = repo.topics && repo.topics.length > 0 ? repo.topics.map((t: string) => `\`${t}\``).join(" ") : "-";
                    content += `| ${name} | ${desc} | ${lang} | ${topics} |${this.addNewLine()}`;
                }
            }
        }
        content += this.addNewLine();
        return content;
    }

    private generateFooter(): string {
        let content = "";
        content += this.addDivider();
        content += this.addNewLine();
        content += `Auto-generated`;
        content += this.addNewLine();
        content += `Last updated: ${new Date().toUTCString()}${this.addNewLine()}`;
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

    private async fetchRepos(): Promise<any[]> {
        console.log(`Fetching repositories for ${this.TARGET_USERNAME}...`);
        let reposData: any[] = [];
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

        // Website Section
        content += this.generateWebsiteSection(recentPosts);

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