/** biome-ignore-all lint/complexity/noStaticOnlyClass: .*/
export class MarkdownUtils {
	static newLine(): string {
		return "\n";
	}

	static divider(): string {
		return "\n---\n";
	}

	static formatDateUS(dateStr: string | null | undefined): string {
		if (!dateStr) return "-";
		const date = new Date(dateStr);
		return `${(date.getUTCMonth() + 1).toString().padStart(2, "0")}/${date
			.getUTCDate()
			.toString()
			.padStart(2, "0")}/${date.getUTCFullYear()}`;
	}

	static formatDateLong(dateStr: string | null | undefined): string {
		if (!dateStr) return "";
		return new Date(dateStr).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	}

	static escapeTableCell(text: string): string {
		return text.replace(/\|/g, "\\|");
	}

	static truncateText(text: string, maxLength: number): string {
		const cleaned = text.replace(/\n/g, " ");
		if (cleaned.length <= maxLength) return cleaned;
		return `${cleaned.slice(0, maxLength)}...`;
	}
}
