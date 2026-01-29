type JSONFeed = {
	version: string;
	title: string;
	home_page_url?: string;
	feed_url?: string;
	description?: string;
	user_comment?: string;
	next_url?: string;
	icon?: string;
	favicon?: string;
	authors?: JSONFeedAuthor[];
	language?: string;
	expired?: boolean;
	hubs?: JSONFeedHub[];
	items: JSONFeedItem[];
};

type JSONFeedAuthor = {
	name?: string;
	url?: string;
	avatar?: string;
};

type JSONFeedHub = {
	type: string;
	url: string;
};

type JSONFeedItem = {
	id: string;
	url?: string;
	external_url?: string;
	title?: string;
	content_html?: string;
	content_text?: string;
	summary?: string;
	image?: string;
	banner_image?: string;
	date_published?: string;
	date_modified?: string;
	authors?: JSONFeedAuthor[];
	tags?: string[];
	attachments?: JSONFeedAttachment[];
};

type JSONFeedAttachment = {
	url: string;
	mime_type: string;
	title?: string;
	size_in_bytes?: number;
	duration_in_seconds?: number;
};
