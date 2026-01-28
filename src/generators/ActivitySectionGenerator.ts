import { MarkdownUtils } from "../utils/MarkdownUtils";

export class ActivitySectionGenerator implements ISectionGenerator {
	constructor(private readonly events: GitHubEvent[]) {}

	generate(): string {
		if (this.events.length === 0) return "";

		let content = "";
		content += `## Latest Activity${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;
		content += `This section tracks my recent interactions across GitHub, including pushes, pull requests, issues, and star activities. It provides a chronological overview of my contributions and community engagement, showcasing what I've been working on lately.${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;

		const filteredEvents = this.events.filter(
			(event) => event.type && event.type !== "PushEvent",
		);

		const recentEvents = filteredEvents.slice(0, 10);
		const olderEvents = filteredEvents.slice(10);

		for (const event of recentEvents) {
			const formattedActivity = this.formatActivity(event);
			if (formattedActivity) {
				content += `${formattedActivity}${MarkdownUtils.newLine()}`;
			}
		}

		if (olderEvents.length > 0) {
			content += `${MarkdownUtils.newLine()}<details>${MarkdownUtils.newLine()}`;
			content += `<summary>Show ${olderEvents.length} more activities...</summary>${MarkdownUtils.newLine()}${MarkdownUtils.newLine()}`;

			for (const event of olderEvents) {
				const formattedActivity = this.formatActivity(event);
				if (formattedActivity) {
					content += `${formattedActivity}${MarkdownUtils.newLine()}`;
				}
			}

			content += `${MarkdownUtils.newLine()}</details>${MarkdownUtils.newLine()}`;
		}

		content += MarkdownUtils.newLine();
		return content;
	}

	private formatActivity(event: GitHubEvent): string {
		const date = event.created_at
			? MarkdownUtils.formatDateLong(event.created_at)
			: "";
		const repoName = event.repo.name;
		const repoUrl = `https://github.com/${repoName}`;
		let activity = "";
		const eventType = event.type ?? "";

		switch (eventType) {
			case "CreateEvent":
				activity = this.formatCreateEvent(event, repoName, repoUrl);
				break;
			case "DeleteEvent":
				activity = this.formatDeleteEvent(event, repoName, repoUrl);
				break;
			case "IssuesEvent":
				activity = this.formatIssuesEvent(event, repoName, repoUrl);
				break;
			case "IssueCommentEvent":
				activity = this.formatIssueCommentEvent(event, repoName, repoUrl);
				break;
			case "PullRequestEvent":
				activity = this.formatPullRequestEvent(event, repoName, repoUrl);
				break;
			case "PullRequestReviewEvent":
				activity = this.formatPRReviewEvent(event, repoName, repoUrl);
				break;
			case "PullRequestReviewCommentEvent":
				activity = this.formatPRReviewCommentEvent(event, repoName, repoUrl);
				break;
			case "WatchEvent":
				activity = `Starred [${repoName}](${repoUrl})`;
				break;
			case "ForkEvent":
				activity = this.formatForkEvent(event, repoName, repoUrl);
				break;
			case "ReleaseEvent":
				activity = this.formatReleaseEvent(event, repoName, repoUrl);
				break;
			case "MemberEvent":
				activity = this.formatMemberEvent(event, repoName, repoUrl);
				break;
			default:
				activity = `${eventType.replace("Event", "")} in [${repoName}](${repoUrl})`;
		}

		if (activity) {
			return `- **${activity}** *(${date})*`;
		}
		return "";
	}

	private formatCreateEvent(
		event: GitHubEvent,
		repoName: string,
		repoUrl: string,
	): string {
		if (event.payload && "ref_type" in event.payload) {
			const refType = (event.payload as { ref_type?: string }).ref_type;
			const ref = (event.payload as { ref?: string }).ref;
			if (refType === "repository") {
				return `Created repository [${repoName}](${repoUrl})`;
			}
			if (refType === "branch") {
				return `Created branch \`${ref}\` in [${repoName}](${repoUrl})`;
			}
			if (refType === "tag") {
				return `Created tag \`${ref}\` in [${repoName}](${repoUrl})`;
			}
		}
		return "";
	}

	private formatDeleteEvent(
		event: GitHubEvent,
		repoName: string,
		repoUrl: string,
	): string {
		if (event.payload && "ref_type" in event.payload) {
			const refType = (event.payload as { ref_type?: string }).ref_type;
			const ref = (event.payload as { ref?: string }).ref;
			return `Deleted ${refType} \`${ref}\` in [${repoName}](${repoUrl})`;
		}
		return "";
	}

	private formatIssuesEvent(
		event: GitHubEvent,
		repoName: string,
		repoUrl: string,
	): string {
		if (
			event.payload &&
			"action" in event.payload &&
			"issue" in event.payload
		) {
			const action = (event.payload as { action?: string }).action;
			const issue = (
				event.payload as { issue?: { number?: number; html_url?: string } }
			).issue;
			return `${action?.charAt(0).toUpperCase()}${action?.slice(1)} issue [#${issue?.number}](${issue?.html_url}) in [${repoName}](${repoUrl})`;
		}
		return "";
	}

	private formatIssueCommentEvent(
		event: GitHubEvent,
		repoName: string,
		repoUrl: string,
	): string {
		if (event.payload && "issue" in event.payload) {
			const issue = (
				event.payload as { issue?: { number?: number; html_url?: string } }
			).issue;
			return `Commented on issue [#${issue?.number}](${issue?.html_url}) in [${repoName}](${repoUrl})`;
		}
		return "";
	}

	private formatPullRequestEvent(
		event: GitHubEvent,
		repoName: string,
		repoUrl: string,
	): string {
		if (
			event.payload &&
			"action" in event.payload &&
			"pull_request" in event.payload
		) {
			const action = (event.payload as { action?: string }).action;
			const pr = (
				event.payload as {
					pull_request?: { number?: number; html_url?: string };
				}
			).pull_request;
			return `${action?.charAt(0).toUpperCase()}${action?.slice(1)} pull request [#${pr?.number}](${pr?.html_url}) in [${repoName}](${repoUrl})`;
		}
		return "";
	}

	private formatPRReviewEvent(
		event: GitHubEvent,
		repoName: string,
		repoUrl: string,
	): string {
		if (event.payload && "pull_request" in event.payload) {
			const pr = (
				event.payload as {
					pull_request?: { number?: number; html_url?: string };
				}
			).pull_request;
			return `Reviewed pull request [#${pr?.number}](${pr?.html_url}) in [${repoName}](${repoUrl})`;
		}
		return "";
	}

	private formatPRReviewCommentEvent(
		event: GitHubEvent,
		repoName: string,
		repoUrl: string,
	): string {
		if (event.payload && "pull_request" in event.payload) {
			const pr = (
				event.payload as {
					pull_request?: { number?: number; html_url?: string };
				}
			).pull_request;
			return `Commented on pull request [#${pr?.number}](${pr?.html_url}) in [${repoName}](${repoUrl})`;
		}
		return "";
	}

	private formatForkEvent(
		event: GitHubEvent,
		repoName: string,
		repoUrl: string,
	): string {
		if (event.payload && "forkee" in event.payload) {
			const forkee = (
				event.payload as { forkee?: { full_name?: string; html_url?: string } }
			).forkee;
			return `Forked [${repoName}](${repoUrl}) to [${forkee?.full_name}](${forkee?.html_url})`;
		}
		return "";
	}

	private formatReleaseEvent(
		event: GitHubEvent,
		repoName: string,
		repoUrl: string,
	): string {
		if (event.payload && "release" in event.payload) {
			const release = (
				event.payload as { release?: { tag_name?: string; html_url?: string } }
			).release;
			return `Published release [${release?.tag_name}](${release?.html_url}) in [${repoName}](${repoUrl})`;
		}
		return "";
	}

	private formatMemberEvent(
		event: GitHubEvent,
		repoName: string,
		repoUrl: string,
	): string {
		if (event.payload && "member" in event.payload) {
			const member = (event.payload as { member?: { login?: string } }).member;
			return `Added @${member?.login} as collaborator to [${repoName}](${repoUrl})`;
		}
		return "";
	}
}
