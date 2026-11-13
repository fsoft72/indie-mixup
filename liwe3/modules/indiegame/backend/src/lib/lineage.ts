/**
 * @fileoverview Remix chains: ancestors of a game and cycle detection.
 */

/** Minimal game data needed to walk a remix chain */
export type LineageNode = { id : string; name : string; id_remix_of : string | null; status : 'visible' | 'hidden' | 'deleted' };

/** State of an ancestor as shown on the game page */
export type LineageState = 'ok' | 'removed' | 'unavailable';

/** One ancestor in the chain */
export type LineageItem = { id : string; name : string; state : LineageState };

/** Loads a game by id, or null when it does not exist */
export type LineageLoader = ( id : string ) => Promise<LineageNode | null>;

const DEFAULT_MAX_DEPTH = 50;

/**
 * Ancestors of a game, root first, excluding the game itself. A deleted or missing ancestor is `removed`, a hidden one is `unavailable`; the chain goes on past them while the data allows it.
 *
 * @param id - Game id
 * @param load - Loads one game by id
 * @param maxDepth - Safety limit on the chain length (default 50)
 * @returns The ancestors, from the original to the direct parent
 */
export const walkAncestors = async ( id : string, load : LineageLoader, maxDepth : number = DEFAULT_MAX_DEPTH ) : Promise<LineageItem[]> => {
	const items : LineageItem[] = [];
	const seen = new Set<string>( [ id ] );
	let parentId = ( await load( id ) )?.id_remix_of ?? null;

	while ( parentId && !seen.has( parentId ) && items.length < maxDepth ) {
		seen.add( parentId );

		const node = await load( parentId );
		if ( !node ) {
			items.push( { id: parentId, name: '', state: 'removed' } );
			break;
		}

		const state : LineageState = node.status === 'deleted' ? 'removed' : node.status === 'hidden' ? 'unavailable' : 'ok';
		items.push( { id: node.id, name: node.name, state } );
		parentId = node.id_remix_of;
	}

	return items.reverse();
};

/**
 * True if making `newParent` the original of `id` would create a loop (a game cannot be a remix of itself or of one of its own remixes).
 *
 * @param id - The game that gets the new `id_remix_of`
 * @param newParent - The proposed original
 * @param load - Loads one game by id
 * @returns True when the link would create a cycle
 */
export const createsCycle = async ( id : string, newParent : string, load : LineageLoader ) : Promise<boolean> => {
	const seen = new Set<string>();
	let current : string | null = newParent;

	while ( current && !seen.has( current ) ) {
		if ( current === id ) return true;

		seen.add( current );
		current = ( await load( current ) )?.id_remix_of ?? null;
	}

	return false;
};
