import type { FormField } from '@frontend/liwe3';

const accountFields : FormField[] = [
	{
		name: 'short_bio',
		label: 'A short title about yourself',
		type: 'text',
		required: true,
		col: 8,
	},
	{
		name: 'bio',
		label: 'Biography',
		type: 'textarea',
		required: true,
		col: 12,
	},
];

export default accountFields;
