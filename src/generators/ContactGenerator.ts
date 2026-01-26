import { MarkdownUtils } from "../utils/MarkdownUtils";

export class ContactGenerator implements ISectionGenerator {
	generate(): string {
		let content = "";
		content += `## Contact${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		content += `- [Website](https://sametcc.me)${MarkdownUtils.newLine()}`;
		content += `- [LinkedIn](https://sametcc.me/link/linkedin)${MarkdownUtils.newLine()}`;
		content += `- [Telegram](https://sametcc.me/link/telegram)${MarkdownUtils.newLine()}`;
		content += `- [Mail](https://sametcc.me/link/mail)${MarkdownUtils.newLine()}`;
		return content;
	}
}
