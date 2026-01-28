import { MarkdownUtils } from "../utils/MarkdownUtils";

export class ContactGenerator implements ISectionGenerator {
	generate(): string {
		let content = "";
		content += `## Contact${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		content += `Feel free to reach out to me through any of the channels listed below. Whether for collaboration, questions, or just to say hi.${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		content += `- [Website](https://sametcc.me)${MarkdownUtils.newLine()}`;
		content += `- [LinkedIn](https://sametcc.me/link/linkedin)${MarkdownUtils.newLine()}`;
		content += `- [Telegram](https://sametcc.me/link/telegram)${MarkdownUtils.newLine()}`;
		content += `- [Mail](https://sametcc.me/link/mail)${MarkdownUtils.newLine()}`;
		return content;
	}
}
