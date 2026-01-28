## Table of Contents

- [Latest Blog Posts](#latest-blog-posts)
- [Latest Activity](#latest-activity)
- [GitHub Stats](#github-stats)
- [Repositories](#repositories)
- [Contact](#contact)

{{#if posts.recent.length}}

## Latest Blog Posts

I write about technology, coding, and my experiences. Here are my latest posts:

{{#each posts.recent}}

- [**{{title}}**]({{url}}){{dateStr}}<br />{{summary}}
{{/each}}

{{#if posts.older.length}}
<details>
<summary>Show {{posts.older.length}} more posts...</summary>

{{#each posts.older}}

- [**{{title}}**]({{url}}){{dateStr}}<br />{{summary}}
{{/each}}

</details>
{{/if}}
{{/if}}

{{#if activity.recent.length}}

## Latest Activity

This section tracks my recent interactions across GitHub, including pushes, pull requests, issues, and star activities. It provides a chronological overview of my contributions and community engagement, showcasing what I've been working on lately.

{{#each activity.recent}}

- {{this}}
{{/each}}

{{#if activity.older.length}}
<details>
<summary>Show {{activity.older.length}} more activities...</summary>

{{#each activity.older}}

- {{this}}
{{/each}}

</details>
{{/if}}
{{/if}}

## GitHub Stats

A summary of my GitHub statistics, showcasing my contributions, repositories, and overall activity on the platform.

| Metric                  | Value                   |
|:------------------------|:------------------------|
| **Total Stars Earned:** | {{stats.totalStars}}    |
| **Total Commits:**      | {{stats.totalCommits}}  |
| **Total PRs:**          | {{stats.totalPRs}}      |
| **Total Issues:**       | {{stats.totalIssues}}   |
| **Contributed To:**     | {{stats.contributedTo}} |
| **Total Repositories:** | {{stats.totalRepos}}    |
| **Total Gists:**        | {{stats.totalGists}}    |
| **Merged PRs:**         | {{stats.mergedPRs}}     |
| **Reviewed PRs:**       | {{stats.reviewedPRs}}   |
| **Account Age:**        | {{stats.accountAge}}    |

{{#if repos}}

## Repositories

Explore a comprehensive list of my code repositories, categorized by their status and type. This includes projects I've recently updated, those I maintain actively, as well as forks and archived exploratory work.

{{#if repos.recentlyUpdated.length}}

### Recently Updated

These are the projects I have been most active on recently. Check here to see the latest code I've pushed and the features currently under development.

{{#each repos.recentlyUpdated}}

- [**{{name}}**]({{html_url}}){{#if stargazers_count}} ★{{stargazers_count}}{{/if}}{{#if language}} - {{language}}{{/if}}{{#if dateStr}}<br />*{{dateStr}}*{{/if}}<br />{{description}}

{{/each}}
{{/if}}

{{#if repos.active.length}}

### Active Repositories

A collection of my primary projects that are currently maintained and under active development. These repositories represent my core open-source contributions and personal tools.

{{#each repos.active.visible}}

- [**{{name}}**]({{html_url}}){{#if stargazers_count}} ★{{stargazers_count}}{{/if}}{{#if language}} - {{language}}{{/if}}{{#if dateStr}}<br />*{{dateStr}}*{{/if}}<br />{{description}}

{{/each}}

{{#if repos.active.hidden.length}}
<details>
<summary>Show {{repos.active.hidden.length}} more repositories...</summary>

{{#each repos.active.hidden}}

- [**{{name}}**]({{html_url}}){{#if stargazers_count}} ★{{stargazers_count}}{{/if}}{{#if language}} - {{language}}{{/if}}{{#if dateStr}}<br />*{{dateStr}}*{{/if}}<br />{{description}}

{{/each}}
</details>
{{/if}}
{{/if}}

{{#if repos.forked.length}}

### Forked Repositories

Repositories I have forked to contribute to, study, or customize. This list reflects my involvement in the broader open-source ecosystem and tools I find interesting.

{{#each repos.forked.visible}}

- [**{{name}}**]({{html_url}}){{#if stargazers_count}} ★{{stargazers_count}}{{/if}}{{#if language}} - {{language}}{{/if}}{{#if dateStr}}<br />*{{dateStr}}*{{/if}}<br />{{description}}

{{/each}}

{{#if repos.forked.hidden.length}}
<details>
<summary>Show {{repos.forked.hidden.length}} more repositories...</summary>

{{#each repos.forked.hidden}}

- [**{{name}}**]({{html_url}}){{#if stargazers_count}} ★{{stargazers_count}}{{/if}}{{#if language}} - {{language}}{{/if}}{{#if dateStr}}<br />*{{dateStr}}*{{/if}}<br />{{description}}

{{/each}}
</details>
{{/if}}
{{/if}}

{{#if repos.archived.length}}

### Archived Repositories

Older projects that are no longer actively maintained but kept for reference and historical context. Feel free to browse them for code snippets or to see my past work.

{{#each repos.archived.visible}}

- [**{{name}}**]({{html_url}}){{#if stargazers_count}} ★{{stargazers_count}}{{/if}}{{#if language}} - {{language}}{{/if}}{{#if dateStr}}<br />*{{dateStr}}*{{/if}}<br />{{description}}

{{/each}}

{{#if repos.archived.hidden.length}}
<details>
<summary>Show {{repos.archived.hidden.length}} more repositories...</summary>

{{#each repos.archived.hidden}}

- [**{{name}}**]({{html_url}}){{#if stargazers_count}} ★{{stargazers_count}}{{/if}}{{#if language}} - {{language}}{{/if}}{{#if dateStr}}<br />*{{dateStr}}*{{/if}}<br />{{description}}

{{/each}}
</details>
{{/if}}
{{/if}}
{{/if}}

## Contact

Feel free to reach out to me through any of the channels listed below. Whether for collaboration, questions, or just to say hi.

- [Website](https://sametcc.me)
- [LinkedIn](https://sametcc.me/link/linkedin)
- [Telegram](https://sametcc.me/link/telegram)
- [Mail](https://sametcc.me/link/mail)

---

<details>
<summary>
Last updated: {{generatedAt}}
</summary>

This `README.md` is auto-generated by a script specified in the `src` directory of this repository.
The script fetches data from GitHub's API, retrieves the latest blog posts from my website's RSS/JSON feed, and generates this markdown file.

- **Workflow Name:** `{{workflow.name}}`
- **Run ID:** `[{{workflow.id}}]({{workflow.html_url}})`
- **Trigger:** `{{workflow.event}}`
- **Happened:** `{{workflow.date}}`

</details>
