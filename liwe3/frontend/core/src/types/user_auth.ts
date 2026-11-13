export type UserAuth = {
	id : string;
	email? : string;
	name? : string;
	avatar? : string;
	perms? : string[]; // Record<string, string[]>;
	token? : string;
	username? : string;
	refresh_token? : string;
	domain? : string;
};
