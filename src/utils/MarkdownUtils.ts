export function formatDateLong(dateStr: string | null | undefined): string {
	if (!dateStr) return "";
	return new Date(dateStr).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}
