/** biome-ignore-all lint/complexity/noStaticOnlyClass: .*/
export class MarkdownUtils {
	static formatDateLong(dateStr: string | null | undefined): string {
		if (!dateStr) return "";
		return new Date(dateStr).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	}
}
