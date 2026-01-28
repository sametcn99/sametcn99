import { MarkdownUtils } from "../utils/MarkdownUtils";

export class FooterGenerator implements ISectionGenerator {
	generate(): string {
		let content = "";
		content += MarkdownUtils.divider();
		content += `Last updated: ${new Date().toUTCString()}${MarkdownUtils.newLine()}`;
		return content;
	}
}
