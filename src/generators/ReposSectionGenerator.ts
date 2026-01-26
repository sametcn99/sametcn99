import { MarkdownUtils } from "../utils/MarkdownUtils";

export class ReposSectionGenerator implements ISectionGenerator {
	constructor(private readonly repos: Repository[]) {}

	generate(): string {
		if (this.repos.length === 0) return "";

		let content = "";
		content += `${MarkdownUtils.newLine()}## Repositories${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;

		const activeRepos = this.repos.filter((r) => !r.fork && !r.archived);
		const forkedRepos = this.repos.filter((r) => r.fork && !r.archived);
		const archivedRepos = this.repos.filter((r) => r.archived);

		content += this.generateRepoTable("Active Repositories", activeRepos);
		content += this.generateRepoTable("Forked Repositories", forkedRepos);
		content += this.generateRepoTable("Archived Repositories", archivedRepos);

		content += MarkdownUtils.newLine();
		return content;
	}

	private generateRepoTable(title: string, repos: Repository[]): string {
		if (repos.length === 0) return "";

		let content = "";
		content += `### ${title}${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		content += `| Repository | Description | Created / Last Commit |${MarkdownUtils.newLine()}`;
		content += `|------------|-------------|-----------------------|${MarkdownUtils.newLine()}`;

		for (const repo of repos) {
			const stars = repo.stargazers_count ? ` ★${repo.stargazers_count}` : "";
			const lang = repo.language ? ` - ${repo.language}` : "";
			const name = `[${repo.name}](https://sametcc.me/repo/${repo.name})${stars}${lang}`;
			const desc = MarkdownUtils.escapeTableCell(
				repo.description || "No description provided.",
			);
			const dates = `${MarkdownUtils.formatDateUS(repo.created_at)}<br />${MarkdownUtils.formatDateUS(repo.pushed_at)}`;
			content += `| ${name} | ${desc} | ${dates} |${MarkdownUtils.newLine()}`;
		}

		content += MarkdownUtils.newLine();
		return content;
	}
}
