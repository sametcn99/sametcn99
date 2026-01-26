import { MarkdownUtils } from "../utils/MarkdownUtils";

export class TOCGenerator implements ISectionGenerator {
	generate(): string {
		let content = "";
		content += `#### Table of Contents${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		content += `- [Latest Content](#latest-content)${MarkdownUtils.newLine()}`;
		content += `- [Latest Activity](#latest-activity)${MarkdownUtils.newLine()}`;
		content += `- [Statistics](#statistics)${MarkdownUtils.newLine()}`;
		content += `  - [GitHub Stats](#github-stats)${MarkdownUtils.newLine()}`;
		content += `  - [Languages](#languages)${MarkdownUtils.newLine()}`;
		content += `  - [Repositories Created per Year](#repositories-created-per-year)${MarkdownUtils.newLine()}`;
		content += `  - [Repository Distribution](#repository-distribution)${MarkdownUtils.newLine()}`;
		content += `- [Repositories](#repositories)${MarkdownUtils.newLine()}`;
		content += `  - [Active Repositories](#active-repositories)${MarkdownUtils.newLine()}`;
		content += `  - [Forked Repositories](#forked-repositories)${MarkdownUtils.newLine()}`;
		content += `  - [Archived Repositories](#archived-repositories)${MarkdownUtils.newLine()}`;
		content += `- [Contact](#contact)${MarkdownUtils.newLine()}`;
		content += MarkdownUtils.newLine();
		return content;
	}
}
