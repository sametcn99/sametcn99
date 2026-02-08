import { formatDateLong } from "./MarkdownUtils";

/** Shape used by the template when rendering blog post summaries. */
export interface FormattedPost {
	title: string;
	url: string;
	summary: string;
	dateStr: string;
}

/** Shape used by the template when rendering repository information. */
export interface FormattedRepo {
	name: string;
	html_url: string;
	stargazers_count?: number;
	language?: string | null;
	description: string;
	dateStr: string;
	homepage?: string | null;
}

// biome-ignore lint/complexity/noStaticOnlyClass: utility class
export class DataFormatter {
	/** Formats GitHub activity events into readable Markdown snippets. */
	static formatActivity(event: GitHubEvent): string | null {
		const date = event.created_at ? formatDateLong(event.created_at) : "";
		const repoName = event.repo.name;
		const repoUrl = `https://github.com/${repoName}`;
		let activity = "";
		const eventType = event.type ?? "";

		switch (eventType) {
			case "CreateEvent":
				activity = DataFormatter.formatCreateEvent(event, repoName, repoUrl);
				break;
			case "DeleteEvent":
				activity = DataFormatter.formatDeleteEvent(event, repoName, repoUrl);
				break;
			case "IssuesEvent":
				activity = DataFormatter.formatIssuesEvent(event, repoName, repoUrl);
				break;
			case "IssueCommentEvent":
				activity = DataFormatter.formatIssueCommentEvent(
					event,
					repoName,
					repoUrl,
				);
				break;
			case "PullRequestEvent":
				activity = DataFormatter.formatPullRequestEvent(
					event,
					repoName,
					repoUrl,
				);
				break;
			case "PullRequestReviewEvent":
				activity = DataFormatter.formatPRReviewEvent(event, repoName, repoUrl);
				break;
			case "PullRequestReviewCommentEvent":
				activity = DataFormatter.formatPRReviewCommentEvent(
					event,
					repoName,
					repoUrl,
				);
				break;
			case "WatchEvent":
				activity = `Starred [${repoName}](${repoUrl})`;
				break;
			case "ForkEvent":
				activity = DataFormatter.formatForkEvent(event, repoName, repoUrl);
				break;
			case "ReleaseEvent":
				activity = DataFormatter.formatReleaseEvent(event, repoName, repoUrl);
				break;
			case "MemberEvent":
				activity = DataFormatter.formatMemberEvent(event, repoName, repoUrl);
				break;
			default:
				activity = `${eventType.replace("Event", "")} in [${repoName}](${repoUrl})`;
		}

		if (activity) {
			return `**${activity}** *(${date})*`;
		}
		return null;
	}

	/** Converts a GitHub repository into the data needed by the template. */
	static formatRepo(repo: Repository): FormattedRepo {
		const created = repo.created_at ? formatDateLong(repo.created_at) : "";
		const updated = repo.pushed_at ? formatDateLong(repo.pushed_at) : "";

		let dateStr = "";
		if (created && updated) {
			dateStr = `Created: ${created} • Updated: ${updated}`;
		} else if (updated) {
			dateStr = `Updated: ${updated}`;
		}

		return {
			name: repo.name,
			html_url: `https://sametcc.me/repo/${repo.name}`,
			stargazers_count: repo.stargazers_count,
			language: repo.language,
			description: repo.description || "No description provided.",
			dateStr,
			homepage: repo.homepage,
		};
	}

	/**
	 * Organizes repositories into recently updated and categorized groups
	 * (active, forked, archived) with pagination info for the template.
	 */
	static prepareRepoData(repos: Repository[]): {
		recentlyUpdated: FormattedRepo[];
		active: {
			visible: FormattedRepo[];
			hidden: FormattedRepo[];
			length: number;
		};
		forked: {
			visible: FormattedRepo[];
			hidden: FormattedRepo[];
			length: number;
		};
		archived: {
			visible: FormattedRepo[];
			hidden: FormattedRepo[];
			length: number;
		};
	} {
		// Exclude the personal repo `sametcn99` from lists
		const filteredRepos = repos.filter((r) => r.name !== "sametcn99");

		const recentlyUpdatedRaw = filteredRepos
			.filter((r) => !r.fork)
			.sort((a, b) => {
				const dateA = new Date(a.pushed_at || 0).getTime();
				const dateB = new Date(b.pushed_at || 0).getTime();
				return dateB - dateA;
			})
			.slice(0, 3);
		const sortedByStars = [...filteredRepos].sort(
			(a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0),
		);

		const activeRaw = sortedByStars.filter((r) => !r.fork && !r.archived);
		const forkedRaw = filteredRepos
			.filter((r) => r.fork && !r.archived)
			.sort((a, b) => {
				const dateA = new Date(a.pushed_at || 0).getTime();
				const dateB = new Date(b.pushed_at || 0).getTime();
				return dateB - dateA;
			});
		const archivedRaw = sortedByStars.filter((r) => r.archived);

		const splitGroup = (groupRepos: Repository[], limit: number) => {
			const visible = groupRepos
				.slice(0, limit)
				.map((r) => DataFormatter.formatRepo(r));
			const hidden = groupRepos
				.slice(limit)
				.map((r) => DataFormatter.formatRepo(r));
			return {
				visible,
				hidden,
				length: groupRepos.length,
			};
		};

		return {
			recentlyUpdated: recentlyUpdatedRaw.map((r) =>
				DataFormatter.formatRepo(r),
			),
			active: splitGroup(activeRaw, 5),
			forked: splitGroup(forkedRaw, 3),
			archived: splitGroup(archivedRaw, 3),
		};
	}

	/**
	 * Splits feed items into recent and older posts while formatting dates.
	 */
	static preparePostsData(posts: FeedItem[]): {
		recent: FormattedPost[];
		older: FormattedPost[];
	} {
		const format = (item: FeedItem): FormattedPost => {
			const date = item.date_published
				? formatDateLong(item.date_published)
				: "";
			const dateStr = date ? ` *(${date})*` : "";

			return {
				title: item.title,
				url: item.url,
				summary: item.summary,
				dateStr,
			};
		};

		const recent = posts.slice(0, 5).map(format);
		const older = posts.slice(5).map(format);

		return { recent, older };
	}

	/**
	 * Human readable description for CreateEvents (repo/branch/tag).
	 */
	private static formatCreateEvent(
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

	/** Describes deleted refs in repositories. */
	private static formatDeleteEvent(
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

	/** Describes issues lifecycle events. */
	private static formatIssuesEvent(
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

	/** Describes when an issue receives a comment. */
	private static formatIssueCommentEvent(
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

	/** Notes a pull request action such as opened/closed/reopened. */
	private static formatPullRequestEvent(
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

	/** Documents a review written on a pull request. */
	private static formatPRReviewEvent(
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

	/** Notes when a review comment is created on a pull request. */
	private static formatPRReviewCommentEvent(
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

	/** Describes when the user forks a repository. */
	private static formatForkEvent(
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

	/** Notes a published release in a repository. */
	private static formatReleaseEvent(
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

	/** Describes adding a collaborator to a repository. */
	private static formatMemberEvent(
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
