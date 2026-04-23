/// <reference types="bun-types" />

import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest";
import { TelegramService } from "./services/telegram-service/TelegramService";

type OwnedRepository =
	RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"][number];

type Stargazer =
	RestEndpointMethodTypes["activity"]["listStargazersForRepo"]["response"]["data"][number];

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

async function fetchOwnedRepositories(
	octokit: Octokit,
	authenticatedLogin: string,
): Promise<OwnedRepository[]> {
	const repositories = await octokit.paginate(
		octokit.rest.repos.listForAuthenticatedUser,
		{
			affiliation: "owner",
			per_page: 100,
			visibility: "all",
		},
	);

	return repositories.filter(
		(repository) =>
			repository.owner.login === authenticatedLogin &&
			!repository.archived &&
			!repository.disabled,
	);
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

async function fetchUniqueStargazers(
	octokit: Octokit,
	repositories: OwnedRepository[],
): Promise<GitHubAccount[]> {
	const stargazersByLogin = new Map<string, GitHubAccount>();

	for (const repository of repositories) {
		if ((repository.stargazers_count ?? 0) === 0) {
			continue;
		}

		try {
			const stargazers = await octokit.paginate(
				octokit.rest.activity.listStargazersForRepo,
				{
					owner: repository.owner.login,
					repo: repository.name,
					per_page: 100,
				},
			) as Stargazer[];

			for (const stargazer of stargazers) {
				if (stargazersByLogin.has(stargazer.login)) {
					continue;
				}

				stargazersByLogin.set(stargazer.login, {
					login: stargazer.login,
					type: stargazer.type,
				});
			}
		} catch (error) {
			console.error(
				`Failed to fetch stargazers for ${repository.full_name}:`,
				error,
			);
		}
	}

	return Array.from(stargazersByLogin.values());
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
	const limit = parsePositiveInteger(process.env.FOLLOW_LIMIT);
	const delayMs =
		parsePositiveInteger(process.env.FOLLOW_DELAY_MS) ?? DEFAULT_DELAY_MS;

	const { data: authenticatedUser } =
		await octokit.rest.users.getAuthenticated();

	console.log(`Authenticated as @${authenticatedUser.login}`);
	console.log(
		`Options: dryRun=${isDryRun}, includeBots=${includeBots}, limit=${limit ?? "none"}, delayMs=${delayMs}`,
	);

	const repositories = await fetchOwnedRepositories(octokit, authenticatedUser.login);
	const [stargazers, followingLogins] = await Promise.all([
		fetchUniqueStargazers(octokit, repositories),
		fetchFollowing(octokit),
	]);

	const unmatchedStargazers = stargazers.filter((stargazer) => {
		if (stargazer.login === authenticatedUser.login) {
			return false;
		}

		if (!includeBots && stargazer.type === "Bot") {
			return false;
		}

		return !followingLogins.has(stargazer.login);
	});

	const followEligibilityByLogin = await fetchFollowEligibility(
		octokit,
		unmatchedStargazers.map((stargazer) => stargazer.login),
	);

	const privateStargazers = unmatchedStargazers.filter(
		(stargazer) => followEligibilityByLogin.get(stargazer.login) === false,
	);

	const followCandidates = unmatchedStargazers.filter(
		(stargazer) => followEligibilityByLogin.get(stargazer.login) !== false,
	);

	const selectedStargazers =
		limit === null ? followCandidates : followCandidates.slice(0, limit);

	const telegramService = new TelegramService(
		process.env.TELEGRAM_BOT_TOKEN,
		process.env.TELEGRAM_CHAT_ID,
	);

	console.log(
		`Scanned ${repositories.length} repositories, found ${stargazers.length} unique stargazer(s), already following ${followingLogins.size} account(s), ignored ${privateStargazers.length} private user(s), ${followCandidates.length} follow candidate(s).`,
	);

	if (selectedStargazers.length === 0) {
		console.log("No stargazer follow action required.");
		if (!isDryRun) {
			await telegramService.sendFollowMessage([], "stargazers");
		}
		return;
	}

	if (limit !== null && selectedStargazers.length < followCandidates.length) {
		console.log(
			`FOLLOW_LIMIT applied. Processing ${selectedStargazers.length} of ${followCandidates.length} candidate(s).`,
		);
	}

	const followedAccounts: GitHubAccount[] = [];

	for (const stargazer of selectedStargazers) {
		if (isDryRun) {
			console.log(`[dry-run] Would follow @${stargazer.login}`);
			continue;
		}

		await octokit.rest.users.follow({ username: stargazer.login });
		console.log(`Followed @${stargazer.login}`);
		followedAccounts.push(stargazer);
		await sleep(delayMs);
	}

	if (!isDryRun && followedAccounts.length > 0) {
		await telegramService.sendFollowMessage(followedAccounts, "stargazers");
	}

	console.log("Stargazer follow run completed successfully.");
}

main().catch((error) => {
	console.error("Stargazer follow job failed:", error);
	process.exit(1);
});