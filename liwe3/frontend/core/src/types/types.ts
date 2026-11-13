import type { LiWEResponse } from './response';

export type Size = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

// export type Color = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'alternative';
export type Color =
	| 'primary'
	| 'secondary'
	| 'accent'
	| 'neutral'
	| 'mode1'
	| 'mode2'
	| 'mode3'
	| 'mode4'
	| 'success'
	| 'error'
	| 'danger'
	| 'warning'
	| 'info'
	| 'light'
	| 'dark'
	| 'alternative'
	| 'background'
	| 'color'
	| 'link';
export type LayoutVars =
	| 'font-size'
	| 'font-weight'
	| 'line-height'
	| 'border-radius'
	| 'border-width'
	| 'border-style'
	| 'button-padding-y'
	| 'button-padding-x'
	| 'input-padding-y'
	| 'input-padding-x';

export type Variant = 'solid' | 'outline' | 'link' | 'ghost';
export type InputVariant = 'material' | 'boxed' | 'plain' | 'none';

export type SelectItem = {
	id : string;
	label : string;
	selectable? : boolean;
	indent? : number;
};

export type LiWEActionOptions = {
	// optional async callback to be called before the send
	beforeSend? : <T>( params : T ) => Promise<T>;
	// optional async callback to be called after the send
	afterSend? : ( data : LiWEResponse ) => Promise<LiWEResponse>;
	errorHandling? : ( err : LiWEResponse ) => void;
};
