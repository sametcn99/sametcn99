import { MarkdownUtils } from "../utils/MarkdownUtils";

export class StatisticsSectionGenerator implements ISectionGenerator {
	constructor(
		private readonly repos: Repository[],
		private readonly stats: UserStats,
	) {}

	generate(): string {
		let content = "";
		content += `## Statistics${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;

		content += this.generateGitHubStatsTable();
		content += this.generateLanguageChart();
		content += this.generateYearlyReposChart();
		content += this.generateDistributionChart();

		return content;
	}

	private generateGitHubStatsTable(): string {
		let content = "";
		content += `### GitHub Stats${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		content += `| Metric | Count |${MarkdownUtils.newLine()}`;
		content += `| :--- | :--- |${MarkdownUtils.newLine()}`;
		content += `| Total Repositories | ${this.stats.totalRepos} |${MarkdownUtils.newLine()}`;
		content += `| Total Gists | ${this.stats.totalGists} |${MarkdownUtils.newLine()}`;
		content += `| Total Stars Earned | ${this.stats.totalStars} |${MarkdownUtils.newLine()}`;
		const commitDisplay = `${Math.floor(this.stats.totalCommits / 100) * 100}+`;
		content += `| Total Commits (Last Year) | ${commitDisplay} |${MarkdownUtils.newLine()}`;
		content += `| Total PRs | ${this.stats.totalPRs} |${MarkdownUtils.newLine()}`;
		content += `| Merged PRs | ${this.stats.mergedPRs} |${MarkdownUtils.newLine()}`;
		content += `| Reviewed PRs | ${this.stats.reviewedPRs} |${MarkdownUtils.newLine()}`;
		content += `| Total Issues | ${this.stats.totalIssues} |${MarkdownUtils.newLine()}`;
		content += `| Contributed to (Last Year) | ${this.stats.contributedTo} |${MarkdownUtils.newLine()}`;
		content += `| Account Age | ${this.stats.accountAge} |${MarkdownUtils.newLine()}`;
		content += MarkdownUtils.newLine();
		return content;
	}

	private generateLanguageChart(): string {
		const nonForked = this.repos.filter((r) => !r.fork);
		const languageCounts: Record<string, number> = {};

		for (const repo of nonForked) {
			if (repo.language) {
				languageCounts[repo.language] =
					(languageCounts[repo.language] || 0) + 1;
			}
		}

		const sortedLanguages = Object.entries(languageCounts).sort(
			([, a], [, b]) => b - a,
		);

		if (sortedLanguages.length === 0) return "";

		let content = "";
		content += `### Languages${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		content += `\`\`\`mermaid${MarkdownUtils.newLine()}`;
		content += `pie showData${MarkdownUtils.newLine()}`;
		content += `    title Top Languages (by Repo Count)${MarkdownUtils.newLine()}`;

		for (const [lang, count] of sortedLanguages) {
			content += `    "${lang}" : ${count}${MarkdownUtils.newLine()}`;
		}

		content += `\`\`\`${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		return content;
	}

	private generateYearlyReposChart(): string {
		const nonForked = this.repos.filter((r) => !r.fork);
		const yearCounts: Record<string, number> = {};

		for (const repo of nonForked) {
			if (repo.created_at) {
				const year = new Date(repo.created_at).getFullYear();
				yearCounts[year] = (yearCounts[year] || 0) + 1;
			}
		}

		const sortedYears = Object.entries(yearCounts).sort(
			([a], [b]) => Number.parseInt(a, 10) - Number.parseInt(b, 10),
		);

		if (sortedYears.length === 0) return "";

		const years = sortedYears.map(([y]) => y);
		const counts = sortedYears.map(([, c]) => c);
		const maxCount = Math.max(...counts);

		let content = "";
		content += `### Repositories Created per Year${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		content += `\`\`\`mermaid${MarkdownUtils.newLine()}`;
		content += `xychart-beta${MarkdownUtils.newLine()}`;
		content += `    title Repositories per Year${MarkdownUtils.newLine()}`;
		content += `    x-axis [${years.join(", ")}]${MarkdownUtils.newLine()}`;
		content += `    y-axis "Count" 0 --> ${maxCount + 1}${MarkdownUtils.newLine()}`;
		content += `    bar [${counts.join(", ")}]${MarkdownUtils.newLine()}`;
		content += `\`\`\`${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		return content;
	}

	private generateDistributionChart(): string {
		const active = this.repos.filter((r) => !r.fork && !r.archived).length;
		const forked = this.repos.filter((r) => r.fork && !r.archived).length;
		const archived = this.repos.filter((r) => r.archived).length;

		let content = "";
		content += `### Repository Distribution${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		content += `\`\`\`mermaid${MarkdownUtils.newLine()}`;
		content += `pie showData${MarkdownUtils.newLine()}`;
		content += `    title Repository Status${MarkdownUtils.newLine()}`;
		content += `    "Active" : ${active}${MarkdownUtils.newLine()}`;
		content += `    "Forked" : ${forked}${MarkdownUtils.newLine()}`;
		content += `    "Archived" : ${archived}${MarkdownUtils.newLine()}`;
		content += `\`\`\`${MarkdownUtils.newLine()}`;
		return content;
	}
}
