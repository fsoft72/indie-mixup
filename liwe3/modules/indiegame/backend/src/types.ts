import { z } from 'zod';
import { zodBoolean } from '@backend/liwe3';

/*=== f2c_start __types ===*/

// Add custom imports or types here

/*=== f2c_end __types ===*/

/**
 * Schema for IndieGame
 *
 * @property {str} id - Unique identifier (required, max 64 chars)
 * @property {str} domain - Domain (required, max 64 chars)
 * @property {str} id_user - Author (user id) (required, max 64 chars)
 * @property {str} name - Game name (required, max 255 chars)
 * @property {str} description - Game description (required)
 * @property {str} repo_url - Canonical public GitHub repo url (required, max 255 chars)
 * @property {str} repo_id - Numeric GitHub repo id (unique) (required, max 32 chars)
 * @property {[none]} screenshots - Screenshot urls (array of strings)
 * @property {[none]} gallery - Gallery image urls (array of strings)
 * @property {[none]} video_urls - Gameplay video urls (array of strings)
 * @property {[str]} id_remix_of - Game this one is a remix of (empty for originals) (max 64 chars)
 * @property {[bool]} remix_locked - True once the remix link was accepted or confirmed after a report
 * @property {str} status - visible, hidden or deleted (required, max 16 chars)
 * @property {datetime} created - Creation date (required)
 * @property {[datetime]} updated - Last update date
 */
const ZIndieGame = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	domain: z.string().max( 64, 'Domain must be at most 64 characters' ),
	id_user: z.string().max( 64, 'Id_user must be at most 64 characters' ),
	name: z.string().max( 255, 'Name must be at most 255 characters' ),
	description: z.string(),
	repo_url: z.string().max( 255, 'Repo_url must be at most 255 characters' ),
	repo_id: z.string().max( 32, 'Repo_id must be at most 32 characters' ),
	screenshots: z.any().optional(),
	gallery: z.any().optional(),
	video_urls: z.any().optional(),
	id_remix_of: z.string().max( 64, 'Id_remix_of must be at most 64 characters' ).optional(),
	remix_locked: zodBoolean.optional().default( false ),
	status: z.string().max( 16, 'Status must be at most 16 characters' ),
	created: z.coerce.date(),
	updated: z.coerce.date().optional(),
} );

export type IndieGame = z.infer<typeof ZIndieGame>;
export { ZIndieGame };

/**
 * Schema for IndieGameEvent
 *
 * @property {str} id - Unique identifier (required, max 64 chars)
 * @property {str} domain - Domain (required, max 64 chars)
 * @property {str} id_game - Game id (required, max 64 chars)
 * @property {str} kind - view or download (required, max 16 chars)
 * @property {str} day - UTC day, format YYYY-MM-DD (required, max 10 chars)
 * @property {str} visitor - Hash of the anonymous visitor (required, max 64 chars)
 * @property {datetime} created - Creation date (required)
 * @property {[datetime]} updated - Last update date
 */
const ZIndieGameEvent = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	domain: z.string().max( 64, 'Domain must be at most 64 characters' ),
	id_game: z.string().max( 64, 'Id_game must be at most 64 characters' ),
	kind: z.string().max( 16, 'Kind must be at most 16 characters' ),
	day: z.string().max( 10, 'Day must be at most 10 characters' ),
	visitor: z.string().max( 64, 'Visitor must be at most 64 characters' ),
	created: z.coerce.date(),
	updated: z.coerce.date().optional(),
} );

export type IndieGameEvent = z.infer<typeof ZIndieGameEvent>;
export { ZIndieGameEvent };

/**
 * Schema for IndieRemixReport
 *
 * @property {str} id - Unique identifier (required, max 64 chars)
 * @property {str} domain - Domain (required, max 64 chars)
 * @property {str} id_game - Reported game (the suspected remix) (required, max 64 chars)
 * @property {str} id_original - Original game of the reporter (required, max 64 chars)
 * @property {str} id_reporter - User who reports (author of the original) (required, max 64 chars)
 * @property {str} id_owner - Author of the reported game (required, max 64 chars)
 * @property {str} status - pending, accepted, contested, confirmed or rejected (required, max 16 chars)
 * @property {[str]} decided_by - Moderator who decided a contested report (max 64 chars)
 * @property {datetime} created - Creation date (required)
 * @property {[datetime]} updated - Last update date
 */
const ZIndieRemixReport = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	domain: z.string().max( 64, 'Domain must be at most 64 characters' ),
	id_game: z.string().max( 64, 'Id_game must be at most 64 characters' ),
	id_original: z.string().max( 64, 'Id_original must be at most 64 characters' ),
	id_reporter: z.string().max( 64, 'Id_reporter must be at most 64 characters' ),
	id_owner: z.string().max( 64, 'Id_owner must be at most 64 characters' ),
	status: z.string().max( 16, 'Status must be at most 16 characters' ),
	decided_by: z.string().max( 64, 'Decided_by must be at most 64 characters' ).optional(),
	created: z.coerce.date(),
	updated: z.coerce.date().optional(),
} );

export type IndieRemixReport = z.infer<typeof ZIndieRemixReport>;
export { ZIndieRemixReport };

/**
 * Schema for IndieGameReport
 *
 * @property {str} id - Unique identifier (required, max 64 chars)
 * @property {str} domain - Domain (required, max 64 chars)
 * @property {str} id_game - Reported game (required, max 64 chars)
 * @property {str} id_reporter - User who reports (required, max 64 chars)
 * @property {str} reason - Reason of the report (required)
 * @property {str} status - open or closed (required, max 16 chars)
 * @property {datetime} created - Creation date (required)
 * @property {[datetime]} updated - Last update date
 */
const ZIndieGameReport = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	domain: z.string().max( 64, 'Domain must be at most 64 characters' ),
	id_game: z.string().max( 64, 'Id_game must be at most 64 characters' ),
	id_reporter: z.string().max( 64, 'Id_reporter must be at most 64 characters' ),
	reason: z.string(),
	status: z.string().max( 16, 'Status must be at most 16 characters' ),
	created: z.coerce.date(),
	updated: z.coerce.date().optional(),
} );

export type IndieGameReport = z.infer<typeof ZIndieGameReport>;
export { ZIndieGameReport };

/**
 * Schema for IndieGameCard
 *
 * @property {str} id - Game id (required, max 64 chars)
 * @property {str} id_user - Author user id (required, max 64 chars)
 * @property {[str]} author_name - Author display name (max 255 chars)
 * @property {str} name - Game name (required, max 255 chars)
 * @property {str} repo_url - GitHub repo url (required, max 255 chars)
 * @property {[none]} screenshots - Screenshot urls
 * @property {[str]} id_remix_of - Remix of game id (max 64 chars)
 * @property {bool} is_remix - True if the game is a remix (required)
 * @property {str} status - visible, hidden or deleted (required, max 16 chars)
 * @property {[num]} views - Total views
 * @property {[num]} downloads - Total downloads
 * @property {datetime} created - Creation date (required)
 */
const ZIndieGameCard = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	id_user: z.string().max( 64, 'Id_user must be at most 64 characters' ),
	author_name: z.string().max( 255, 'Author_name must be at most 255 characters' ).optional(),
	name: z.string().max( 255, 'Name must be at most 255 characters' ),
	repo_url: z.string().max( 255, 'Repo_url must be at most 255 characters' ),
	screenshots: z.any().optional(),
	id_remix_of: z.string().max( 64, 'Id_remix_of must be at most 64 characters' ).optional(),
	is_remix: zodBoolean.default( false ),
	status: z.string().max( 16, 'Status must be at most 16 characters' ),
	views: z.coerce.number().optional(),
	downloads: z.coerce.number().optional(),
	created: z.coerce.date(),
} );

export type IndieGameCard = z.infer<typeof ZIndieGameCard>;
export { ZIndieGameCard };

/**
 * Schema for IndieLineageItem
 *
 * @property {str} id - Game id (required, max 64 chars)
 * @property {str} name - Game name (required, max 255 chars)
 * @property {str} state - ok, removed or unavailable (required, max 16 chars)
 */
const ZIndieLineageItem = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	name: z.string().max( 255, 'Name must be at most 255 characters' ),
	state: z.string().max( 16, 'State must be at most 16 characters' ),
} );

export type IndieLineageItem = z.infer<typeof ZIndieLineageItem>;
export { ZIndieLineageItem };

/**
 * Schema for IndieGameDetail
 *
 * @property {str} id - Game id (required, max 64 chars)
 * @property {str} id_user - Author user id (required, max 64 chars)
 * @property {[str]} author_name - Author display name (max 255 chars)
 * @property {str} name - Game name (required, max 255 chars)
 * @property {str} repo_url - GitHub repo url (required, max 255 chars)
 * @property {[none]} screenshots - Screenshot urls
 * @property {[str]} id_remix_of - Remix of game id (max 64 chars)
 * @property {bool} is_remix - True if the game is a remix (required)
 * @property {str} status - visible, hidden or deleted (required, max 16 chars)
 * @property {[num]} views - Total views
 * @property {[num]} downloads - Total downloads
 * @property {datetime} created - Creation date (required)
 * @property {[str]} description - Description
 * @property {[none]} gallery - Gallery image urls
 * @property {[none]} video_urls - Gameplay video urls
 * @property {[bool]} remix_locked - Remix link locked
 * @property {[IndieLineageItem[]]} lineage - Ancestors, root first
 * @property {[IndieGameCard[]]} remixes - Direct remixes of this game
 */
const ZIndieGameDetail = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	id_user: z.string().max( 64, 'Id_user must be at most 64 characters' ),
	author_name: z.string().max( 255, 'Author_name must be at most 255 characters' ).optional(),
	name: z.string().max( 255, 'Name must be at most 255 characters' ),
	repo_url: z.string().max( 255, 'Repo_url must be at most 255 characters' ),
	screenshots: z.any().optional(),
	id_remix_of: z.string().max( 64, 'Id_remix_of must be at most 64 characters' ).optional(),
	is_remix: zodBoolean.default( false ),
	status: z.string().max( 16, 'Status must be at most 16 characters' ),
	views: z.coerce.number().optional(),
	downloads: z.coerce.number().optional(),
	created: z.coerce.date(),
	description: z.string().optional(),
	gallery: z.any().optional(),
	video_urls: z.any().optional(),
	remix_locked: zodBoolean.optional().default( false ),
	lineage: z.any().array().optional(),
	remixes: z.any().array().optional(),
} );

export type IndieGameDetail = z.infer<typeof ZIndieGameDetail>;
export { ZIndieGameDetail };

/**
 * Schema for IndieGameTrackResult
 *
 * @property {bool} counted - False if the visitor was already counted today (required)
 * @property {str} repo_url - GitHub repo url of the game (required, max 255 chars)
 */
const ZIndieGameTrackResult = z.object( {
	counted: zodBoolean.default( false ),
	repo_url: z.string().max( 255, 'Repo_url must be at most 255 characters' ),
} );

export type IndieGameTrackResult = z.infer<typeof ZIndieGameTrackResult>;
export { ZIndieGameTrackResult };

/**
 * Schema for IndieGameRankingEntry
 *
 * @property {str} id - Game id (required, max 64 chars)
 * @property {str} name - Game name (required, max 255 chars)
 * @property {num} count - Score (required)
 */
const ZIndieGameRankingEntry = z.object( {
	id: z.string().max( 64, 'Id must be at most 64 characters' ),
	name: z.string().max( 255, 'Name must be at most 255 characters' ),
	count: z.coerce.number(),
} );

export type IndieGameRankingEntry = z.infer<typeof ZIndieGameRankingEntry>;
export { ZIndieGameRankingEntry };

/**
 * Schema for IndieDevRankingEntry
 *
 * @property {str} id_user - Author user id (required, max 64 chars)
 * @property {[str]} author_name - Author display name (max 255 chars)
 * @property {num} count - Score (required)
 */
const ZIndieDevRankingEntry = z.object( {
	id_user: z.string().max( 64, 'Id_user must be at most 64 characters' ),
	author_name: z.string().max( 255, 'Author_name must be at most 255 characters' ).optional(),
	count: z.coerce.number(),
} );

export type IndieDevRankingEntry = z.infer<typeof ZIndieDevRankingEntry>;
export { ZIndieDevRankingEntry };

/**
 * Schema for IndieDeveloper
 *
 * @property {str} id_user - User id (required, max 64 chars)
 * @property {[str]} author_name - Display name (max 255 chars)
 * @property {num} originals - Original games (required)
 * @property {num} remixes - Remixes (required)
 * @property {[IndieGameCard[]]} games - Visible games
 */
const ZIndieDeveloper = z.object( {
	id_user: z.string().max( 64, 'Id_user must be at most 64 characters' ),
	author_name: z.string().max( 255, 'Author_name must be at most 255 characters' ).optional(),
	originals: z.coerce.number(),
	remixes: z.coerce.number(),
	games: z.any().array().optional(),
} );

export type IndieDeveloper = z.infer<typeof ZIndieDeveloper>;
export { ZIndieDeveloper };

/**
 * Schema for IndieAdminReports
 *
 * @property {[IndieGameReport[]]} reports - Open content reports
 * @property {[IndieRemixReport[]]} remix_reports - Contested remix reports
 */
const ZIndieAdminReports = z.object( {
	reports: z.any().array().optional(),
	remix_reports: z.any().array().optional(),
} );

export type IndieAdminReports = z.infer<typeof ZIndieAdminReports>;
export { ZIndieAdminReports };
