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

		return content;
	}

	private generateGitHubStatsTable(): string {
		// Calculate Counts
		const active = this.repos.filter((r) => !r.fork && !r.archived).length;
		const forked = this.repos.filter((r) => r.fork && !r.archived).length;
		const archived = this.repos.filter((r) => r.archived).length;

		// Calculate Top Language
		const nonForked = this.repos.filter((r) => !r.fork);
		const languageCounts: Record<string, number> = {};
		for (const repo of nonForked) {
			if (repo.language) {
				languageCounts[repo.language] =
					(languageCounts[repo.language] || 0) + 1;
			}
		}
		const sortedLanguages = Object.entries(languageCounts).sort(
			(a, b) => b[1] - a[1],
		);
		const firstEntry = sortedLanguages[0];
		const topLanguage = firstEntry ? firstEntry[0] : "-";

		let content = "";
		content += `### GitHub Stats${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		content += `| Metric | Count |${MarkdownUtils.newLine()}`;
		content += `| :--- | :--- |${MarkdownUtils.newLine()}`;
		content += `| Top Language | ${topLanguage} |${MarkdownUtils.newLine()}`;
		content += `| Total Repositories | ${this.stats.totalRepos} |${MarkdownUtils.newLine()}`;
		content += `| Active Repositories | ${active} |${MarkdownUtils.newLine()}`;
		content += `| Forked Repositories | ${forked} |${MarkdownUtils.newLine()}`;
		content += `| Archived Repositories | ${archived} |${MarkdownUtils.newLine()}`;
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
		return content;
	}
}
