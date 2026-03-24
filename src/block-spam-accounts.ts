/// <reference types="bun-types" />

import { Octokit } from "@octokit/rest";

type GitHubAccount = {
	login: string;
};

type GitHubProfile = {
	login: string;
	name: string | null;
	bio: string | null;
	company: string | null;
	location: string | null;
	websiteUrl: string | null;
	twitterUsername: string | null;
};

type SpamDetection = {
	profile: GitHubProfile;
	matchedReasons: string[];
};

type SpamKeyword = {
	original: string;
	normalized: string;
};

type SpamRule = {
	reason: string;
	regex: RegExp;
};

const DEFAULT_DELAY_MS = 750;
const PROFILE_CHUNK_SIZE = 20;
const RAW_SPAM_KEYWORDS = [
	"spam acc",
	"block if you want",
	"my main",
	"follow my main",
	"block if unwanted",
	"spam follower",
	"spam follow account",
	"block if you uncomfortable",
	"give me stars to my repositories and back to your repositories",
	"following people for fun, I'm not some creep.",
	"Check my repository I am sure you will find interesting projects etc and kindly star the repos",
	"block permanent",
	"block if you find this account annoying",
	"block permanently",
	"Check my repos",
	"Check my repositories",
	"if u follow me, i will follow u 2",
	"follow me and i will follow you back",
	"Please follow and give me star.",
	"Please follow",
] as const;
const MAIN_ACCOUNT_PATTERN = /\bmain\s*:\s*@[a-z\d-]+\b/i;

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
	if (value === undefined) {
		return defaultValue;
	}

	return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parsePositiveInteger(value: string | undefined): number | null {
	if (!value) {
		return null;
	}

	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed) || parsed <= 0) {
		throw new Error(`Expected a positive integer but received: ${value}`);
	}

	return parsed;
}

function sleep(milliseconds: number): Promise<void> {
	if (milliseconds <= 0) {
		return Promise.resolve();
	}

	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function chunkArray<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];

	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}

	return chunks;
}

function normalizeText(value: string): string {
	return value
		.normalize("NFKD")
		.toLowerCase()
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[\u200B-\u200D\uFEFF]/g, "")
		.replace(/[^\p{L}\p{N}@:]+/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createPhraseRule(keyword: SpamKeyword): SpamRule {
	const phrasePattern = keyword.normalized
		.split(" ")
		.map((part) => escapeRegExp(part))
		.join("\\s+");

	return {
		reason: keyword.original,
		regex: new RegExp(`(?:^|\\s)${phrasePattern}(?:$|\\s)`, "i"),
	};
}

const SPAM_KEYWORDS: SpamKeyword[] = RAW_SPAM_KEYWORDS.map((keyword) => ({
	original: keyword,
	normalized: normalizeText(keyword),
}));

const SPAM_RULES: SpamRule[] = [
	...SPAM_KEYWORDS.map((keyword) => createPhraseRule(keyword)),
	{
		reason: "follow main",
		regex: /\bfollow\s+(?:my\s+)?main\b/i,
	},
	{
		reason: "main account mention",
		regex: /\b(?:my\s+)?main\s+@[a-z\d-]+\b/i,
	},
	{
		reason: "spam account variant",
		regex: /\bspam\s+(?:acc|account|follower|followers|follow|following|follow(?:ing)?\s+account)\b/i,
	},
	{
		reason: "block if variant",
		regex: /\bblock\s+if\s+(?:you\s+want|unwanted|you\s+uncomfortable|you\s+are\s+uncomfortable|you\s+find\s+this\s+account\s+annoying)\b/i,
	},
	{
		reason: "block permanent",
		regex: /\bblock\s+permanent(?:ly)?\b/i,
	},
	{
		reason: "sb to remove",
		regex: /\bsb\s+to\s+remove\b/i,
	},
	{
		reason: "remove me variant",
		regex: /\b(?:remove|unfollow)\s+me\b/i,
	},
	{
		reason: "check my repos",
		regex: /\bcheck\s+my\s+(?:repo|repos|repository|repositories)\b/i,
	},
	{
		reason: "star my repos",
		regex: /\b(?:please\s+)?(?:kindly\s+)?(?:star|give\s+me\s+star|give\s+me\s+stars)\b.*\b(?:repo|repos|repository|repositories)\b/i,
	},
	{
		reason: "follow for follow",
		regex: /\b(?:if\s+(?:u|you)\s+follow\s+me.*follow\s+(?:u|you)(?:\s+2|\s+too|\s+back)?|follow\s+me.*follow\s+(?:you|u)\s+back)\b/i,
	},
	{
		reason: "please follow",
		regex: /\bplease\s+follow(?:\s+and\s+give\s+me\s+star)?\b/i,
	},
	{
		reason: "spam remove notice",
		regex: /\b(?:spam\s+following|spam\s+follower)\b.*\b(?:remove|sb\s+to\s+remove)\b/i,
	},
];

function buildNormalizedProfileDetails(profile: GitHubProfile): string {
	return [
		profile.login,
		profile.name,
		profile.bio,
		profile.company,
		profile.location,
		profile.websiteUrl,
		profile.twitterUsername,
	]
		.filter((value): value is string => Boolean(value))
		.map((value) => normalizeText(value))
		.filter((value) => value.length > 0)
		.join(" ");
}

function getErrorStatus(error: unknown): number | null {
	if (typeof error === "object" && error !== null && "status" in error && typeof error.status === "number") {
		return error.status;
	}

	return null;
}

function getHeaderValue(headers: Record<string, string | number | string[] | undefined>, name: string): string | null {
	const headerValue = headers[name];

	if (typeof headerValue === "string") {
		return headerValue;
	}

	if (typeof headerValue === "number") {
		return String(headerValue);
	}

	if (Array.isArray(headerValue)) {
		return headerValue.join(", ");
	}

	return null;
}

function validateClassicTokenScopes(isDryRun: boolean, oauthScopes: string | null): void {
	if (isDryRun || !oauthScopes) {
		return;
	}

	const normalizedScopes = oauthScopes
		.split(",")
		.map((scope) => scope.trim().toLowerCase())
		.filter((scope) => scope.length > 0);

	if (normalizedScopes.includes("user")) {
		return;
	}

	throw new Error(
		`The current token advertises OAuth scopes: ${oauthScopes}. Blocking users requires a classic PAT with the user scope, or a fine-grained PAT with Block another user: write. A token with only user:follow can detect spam accounts but cannot block them.`,
	);
}

async function fetchFollowers(octokit: Octokit): Promise<GitHubAccount[]> {
	const followers = await octokit.paginate(octokit.rest.users.listFollowersForAuthenticatedUser, {
		per_page: 100,
	});

	return followers.map((user) => ({
		login: user.login,
	}));
}

async function fetchFollowing(octokit: Octokit): Promise<GitHubAccount[]> {
	const following = await octokit.paginate(octokit.rest.users.listFollowedByAuthenticatedUser, {
		per_page: 100,
	});

	return following.map((user) => ({
		login: user.login,
	}));
}

async function fetchBlockedLogins(octokit: Octokit): Promise<Set<string>> {
	try {
		const blockedUsers = await octokit.paginate(octokit.rest.users.listBlockedByAuthenticatedUser, {
			per_page: 100,
		});

		return new Set(blockedUsers.map((user) => user.login));
	} catch (error) {
		const status = getErrorStatus(error);

		if (status === 403 || status === 404) {
			console.warn(
				"Could not read the authenticated user's block list. Continuing without blocked-user deduplication. Check token permissions if you want this optimization.",
			);
			return new Set<string>();
		}

		throw error;
	}
}

async function fetchProfiles(octokit: Octokit, logins: string[]): Promise<GitHubProfile[]> {
	const profiles: GitHubProfile[] = [];

	for (const loginChunk of chunkArray(logins, PROFILE_CHUNK_SIZE)) {
		const profileResults = await Promise.all(
			loginChunk.map(async (login) => {
				try {
					const { data } = await octokit.rest.users.getByUsername({
						username: login,
					});

					return {
						login: data.login,
						name: data.name,
						bio: data.bio,
						company: "company" in data ? data.company : null,
						location: data.location,
						websiteUrl: data.blog || null,
						twitterUsername: data.twitter_username ?? null,
					} satisfies GitHubProfile;
				} catch (error) {
					const status = getErrorStatus(error);

					if (status === 404) {
						console.warn(`Could not fetch profile details for @${login}. Skipping this account.`);
						return null;
					}

					throw error;
				}
			}),
		);

		for (const profile of profileResults) {
			if (profile) {
				profiles.push(profile);
			}
		}
	}

	return profiles;
}

function detectSpamProfiles(profiles: GitHubProfile[]): SpamDetection[] {
	const detections: SpamDetection[] = [];

	for (const profile of profiles) {
		const mergedProfileDetails = buildNormalizedProfileDetails(profile);
		const matchedReasonSet = new Set<string>();

		for (const rule of SPAM_RULES) {
			if (rule.regex.test(mergedProfileDetails)) {
				matchedReasonSet.add(rule.reason);
			}
		}

		if (MAIN_ACCOUNT_PATTERN.test(mergedProfileDetails)) {
			matchedReasonSet.add("main: @...");
		}

		const matchedReasons = [...matchedReasonSet];

		if (matchedReasons.length === 0) {
			continue;
		}

		detections.push({
			profile,
			matchedReasons,
		});
	}

	return detections;
}

async function main(): Promise<void> {
	const token = process.env.FOLLOW_BACK_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

	if (!token) {
		throw new Error("Missing token. Set FOLLOW_BACK_TOKEN, GITHUB_TOKEN, or GH_TOKEN.");
	}

	const octokit = new Octokit({ auth: token });
	const isDryRun = parseBoolean(process.env.DRY_RUN, false);
	const delayMs = parsePositiveInteger(process.env.BLOCK_DELAY_MS) ?? DEFAULT_DELAY_MS;

	const { data: authenticatedUser, headers } = await octokit.rest.users.getAuthenticated();
	const oauthScopes = getHeaderValue(headers, "x-oauth-scopes");

	validateClassicTokenScopes(isDryRun, oauthScopes);

	console.log(`Authenticated as @${authenticatedUser.login}`);
	console.log(`Options: dryRun=${isDryRun}, delayMs=${delayMs}`);

	const [followers, following, blockedLogins] = await Promise.all([
		fetchFollowers(octokit),
		fetchFollowing(octokit),
		fetchBlockedLogins(octokit),
	]);

	const candidateLogins = [...followers, ...following]
		.map((account) => account.login)
		.filter(
			(login, index, logins) =>
				login !== authenticatedUser.login && !blockedLogins.has(login) && logins.indexOf(login) === index,
		);

	console.log(
		`Fetched ${followers.length} follower(s), ${following.length} following account(s), ${blockedLogins.size} blocked account(s), ${candidateLogins.length} candidate account(s).`,
	);

	if (candidateLogins.length === 0) {
		console.log("No candidates available for spam detection.");
		return;
	}

	const profiles = await fetchProfiles(octokit, candidateLogins);
	const spamDetections = detectSpamProfiles(profiles);

	console.log(`Detected ${spamDetections.length} spam account(s) after profile inspection.`);

	if (spamDetections.length === 0) {
		console.log("No spam accounts detected.");
		return;
	}

	console.log("The following users will be blocked:");
	for (const detection of spamDetections) {
		console.log(`- @${detection.profile.login} (${detection.matchedReasons.join(", ")})`);
	}

	if (isDryRun) {
		console.log("Dry run enabled. No users were blocked.");
		return;
	}

	for (const detection of spamDetections) {
		try {
			await octokit.rest.users.block({ username: detection.profile.login });
		} catch (error) {
			const status = getErrorStatus(error);

			if (status === 403 || status === 404) {
				throw new Error(
					`The token cannot block @${detection.profile.login}. Blocking users requires a classic PAT with the user scope, or a fine-grained PAT with Block another user: write. user:follow alone is not sufficient.`,
				);
			}

			throw error;
		}

		console.log(`Blocked @${detection.profile.login}`);
		await sleep(delayMs);
	}

	console.log("Spam-account blocking completed successfully.");
}

main().catch((error) => {
	console.error("Spam-account blocking job failed:", error);
	process.exit(1);
});
