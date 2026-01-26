import { MarkdownUtils } from "../utils/MarkdownUtils";

export class FooterGenerator implements ISectionGenerator {
	generate(): string {
		let content = "";
		content += MarkdownUtils.divider();
		content += `${MarkdownUtils.newLine()}Auto-generated<br />${MarkdownUtils.newLine()}`;
		content += `Last updated: ${new Date().toUTCString()}${MarkdownUtils.newLine()}`;
		return content;
	}
}
