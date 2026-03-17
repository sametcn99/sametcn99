/// <reference types="bun-types" />

import { Octokit } from "@octokit/rest";

type GitHubAccount = {
	login: string;
	type: string;
};

const DEFAULT_DELAY_MS = 750;
const FOLLOW_ELIGIBILITY_CHUNK_SIZE = 20;

function parseBoolean(
	value: string | undefined,
	defaultValue: boolean,
): boolean {
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

async function fetchFollowers(octokit: Octokit): Promise<GitHubAccount[]> {
	const followers = await octokit.paginate(
		octokit.rest.users.listFollowersForAuthenticatedUser,
		{
			per_page: 100,
		},
	);

	return followers.map((user) => ({
		login: user.login,
		type: user.type,
	}));
}

async function fetchFollowing(octokit: Octokit): Promise<Set<string>> {
	const following = await octokit.paginate(
		octokit.rest.users.listFollowedByAuthenticatedUser,
		{
			per_page: 100,
		},
	);

	return new Set(following.map((user) => user.login));
}

async function fetchFollowEligibility(
	octokit: Octokit,
	logins: string[],
): Promise<Map<string, boolean>> {
	const eligibilityByLogin = new Map<string, boolean>();

	for (const loginChunk of chunkArray(logins, FOLLOW_ELIGIBILITY_CHUNK_SIZE)) {
		const queryFields = loginChunk
			.map(
				(login, index) =>
					`user${index}: user(login: ${JSON.stringify(login)}) { login viewerCanFollow }`,
			)
			.join("\n");

		const response = await octokit.graphql<
			Record<string, { login: string; viewerCanFollow: boolean } | null>
		>(`query {\n${queryFields}\n}`);

		for (const account of Object.values(response)) {
			if (!account) {
				continue;
			}

			eligibilityByLogin.set(account.login, account.viewerCanFollow);
		}
	}

	return eligibilityByLogin;
}

async function main(): Promise<void> {
	const token =
		process.env.FOLLOW_BACK_TOKEN ||
		process.env.GITHUB_TOKEN ||
		process.env.GH_TOKEN;

	if (!token) {
		throw new Error(
			"Missing token. Set FOLLOW_BACK_TOKEN, GITHUB_TOKEN, or GH_TOKEN.",
		);
	}

	const octokit = new Octokit({ auth: token });
	const isDryRun = parseBoolean(process.env.DRY_RUN, false);
	const includeBots = parseBoolean(process.env.INCLUDE_BOTS, false);
	const limit = parsePositiveInteger(process.env.FOLLOW_BACK_LIMIT);
	const delayMs =
		parsePositiveInteger(process.env.FOLLOW_BACK_DELAY_MS) ?? DEFAULT_DELAY_MS;

	const { data: authenticatedUser } =
		await octokit.rest.users.getAuthenticated();

	console.log(`Authenticated as @${authenticatedUser.login}`);
	console.log(
		`Options: dryRun=${isDryRun}, includeBots=${includeBots}, limit=${limit ?? "none"}, delayMs=${delayMs}`,
	);

	const [followers, followingLogins] = await Promise.all([
		fetchFollowers(octokit),
		fetchFollowing(octokit),
	]);

	const unmatchedFollowers = followers.filter((follower) => {
		if (follower.login === authenticatedUser.login) {
			return false;
		}

		if (!includeBots && follower.type === "Bot") {
			return false;
		}

		return !followingLogins.has(follower.login);
	});

	const followEligibilityByLogin = await fetchFollowEligibility(
		octokit,
		unmatchedFollowers.map((follower) => follower.login),
	);

	const privateFollowers = unmatchedFollowers.filter(
		(follower) => followEligibilityByLogin.get(follower.login) === false,
	);

	const followBackCandidates = unmatchedFollowers.filter(
		(follower) => followEligibilityByLogin.get(follower.login) !== false,
	);

	const selectedFollowers =
		limit === null
			? followBackCandidates
			: followBackCandidates.slice(0, limit);

	console.log(
		`Found ${followers.length} followers, already following ${followingLogins.size} accounts, ignored ${privateFollowers.length} private user(s), ${followBackCandidates.length} follow-back candidate(s).`,
	);

	if (selectedFollowers.length === 0) {
		console.log("No follow-back action required.");
		return;
	}

	if (
		limit !== null &&
		selectedFollowers.length < followBackCandidates.length
	) {
		console.log(
			`FOLLOW_BACK_LIMIT applied. Processing ${selectedFollowers.length} of ${followBackCandidates.length} candidate(s).`,
		);
	}

	for (const follower of selectedFollowers) {
		if (isDryRun) {
			console.log(`[dry-run] Would follow @${follower.login}`);
			continue;
		}

		await octokit.rest.users.follow({ username: follower.login });
		console.log(`Followed @${follower.login}`);
		await sleep(delayMs);
	}

	console.log("Follow-back run completed successfully.");
}

main().catch((error) => {
	console.error("Follow-back job failed:", error);
	process.exit(1);
});
