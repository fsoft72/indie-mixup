import { z } from 'zod';

export const ZLiWEUser = z.object( {
	id: z.string(),
	username: z.string().min( 3 ).max( 100 ),
	email: z.email().min( 5 ).max( 255 ),
	name: z.string().min( 3 ).max( 100 ),
	lastname: z.string().min( 3 ).max( 100 ),
	domain: z.string(),
	perms: z.array( z.string().min( 3 ).max( 100 ) ).optional(),
} );

export type LiWEUser = z.infer<typeof ZLiWEUser>;

export const ZLiWESysParams = z.object( {
	skip_permissions_check: z.boolean().optional().default( false ),
	domain: z.string().optional(),
	params: z.any().optional(),
} );

export type LiWESysParams = z.infer<typeof ZLiWESysParams>;

/** Log severity levels */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** Structured log entry */
export interface LogEntry {
	timestamp : string;
	level : LogLevel;
	message : string;
	requestId? : string;
	userId? : string;
	domain? : string;
	module? : string;
	method? : string;
	errorCode? : string;
	httpStatus? : number;
	stack? : string;
	context? : Record<string, unknown>;
	durationMs? : number;
}

/** Logger configuration */
export interface LoggerConfig {
	minLevel : LogLevel;
	includeStack : boolean;
	prettyPrint : boolean;
	contextFields? : string[];
}

/** Request context for correlation */
export interface RequestContext {
	requestId : string;
	userId? : string;
	domain? : string;
	method? : string;
	path? : string;
	startTime : number;
}
