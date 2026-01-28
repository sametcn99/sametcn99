import { MarkdownUtils } from "../utils/MarkdownUtils";

export class ReposSectionGenerator implements ISectionGenerator {
	constructor(private readonly repos: Repository[]) {}

	generate(): string {
		if (this.repos.length === 0) return "";

		let content = "";
		content += `${MarkdownUtils.newLine()}## Repositories${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;

		// 1. Recently Updated (Top 5, owned, sorted by push date)
		const recentRepos = this.repos
			.filter((r) => !r.fork)
			.sort((a, b) => {
				const dateA = new Date(a.pushed_at || 0).getTime();
				const dateB = new Date(b.pushed_at || 0).getTime();
				return dateB - dateA;
			})
			.slice(0, 5);

		content += this.generateRepoList("Recently Updated", recentRepos, false);

		// 2. Active, Forked, Archived (Sorted by Stars)
		const sortedByStars = [...this.repos].sort(
			(a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0),
		);

		const activeRepos = sortedByStars.filter((r) => !r.fork && !r.archived);
		const forkedRepos = sortedByStars.filter((r) => r.fork && !r.archived);
		const archivedRepos = sortedByStars.filter((r) => r.archived);

		content += this.generateRepoList("Active Repositories", activeRepos, true);
		content += this.generateRepoList("Forked Repositories", forkedRepos, true);
		content += this.generateRepoList(
			"Archived Repositories",
			archivedRepos,
			true,
		);
		return content;
	}

	private generateRepoList(
		title: string,
		repos: Repository[],
		collapse: boolean,
	): string {
		if (repos.length === 0) return "";

		let content = "";
		content += `### ${title}${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;

		const showCount = collapse ? 10 : repos.length;
		const visibleRepos = repos.slice(0, showCount);
		const hiddenRepos = repos.slice(showCount);

		for (const repo of visibleRepos) {
			content += this.formatRepo(repo);
		}

		if (collapse && hiddenRepos.length > 0) {
			content += `<details>${MarkdownUtils.newLine()}`;
			content += `<summary>Show ${hiddenRepos.length} more repositories...</summary>${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;

			for (const repo of hiddenRepos) {
				content += this.formatRepo(repo);
			}

			content += `</details>${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		}

		return content;
	}

	private formatRepo(repo: Repository): string {
		const stars = repo.stargazers_count ? ` ★${repo.stargazers_count}` : "";
		const lang = repo.language ? ` - ${repo.language}` : "";
		const name = `[**${repo.name}**](https://sametcc.me/repo/${repo.name})`;
		const desc = repo.description || "No description provided.";
		const created = repo.created_at
			? MarkdownUtils.formatDateLong(repo.created_at)
			: "";
		const updated = repo.pushed_at
			? MarkdownUtils.formatDateLong(repo.pushed_at)
			: "";

		let dateStr = "";
		if (created && updated) {
			dateStr = `Created: ${created} • Updated: ${updated}`;
		} else if (updated) {
			dateStr = `Updated: ${updated}`;
		}

		const dateLine = dateStr ? `<br />*${dateStr}*` : "";

		return `- ${name}${stars}${lang}${dateLine}<br />${desc}${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
	}
}
