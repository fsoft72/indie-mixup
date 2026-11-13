import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock( '@liwe3/webcomponents-svelte', async () => {
	const { default: AIMarkdownEditor } = await import( './mocks/AIMarkdownEditorStub.svelte' );
	return { AIMarkdownEditor };
} );

import FormAIMarkdownEditor from '../FormAIMarkdownEditor.svelte';
import type { FormField } from '../../FormCreator.svelte';

const baseField : FormField = { name: 'body', label: 'Body' };

describe('FormAIMarkdownEditor', () => {
	it('renders the field label', () => {
		render( FormAIMarkdownEditor, {
			props: { field: baseField, name: 'body', _v: () => '', onchange: vi.fn() },
		} );

		expect( screen.getByText( 'Body' ) ).toBeInTheDocument();
	});

	it('does not render a label when the field has none', () => {
		const field : FormField = { name: 'body' };
		render( FormAIMarkdownEditor, { props: { field, name: 'body', _v: () => '', onchange: vi.fn() } } );

		expect( screen.queryByText( 'Body' ) ).not.toBeInTheDocument();
	});

	it('passes the current value from _v to the editor', () => {
		render( FormAIMarkdownEditor, {
			props: { field: baseField, name: 'body', _v: () => 'Hello world', onchange: vi.fn() },
		} );

		expect( screen.getByTestId( 'ai-markdown-editor-stub' ) ).toHaveAttribute( 'data-value', 'Hello world' );
	});

	it('falls back to an empty string value when _v returns nullish', () => {
		render( FormAIMarkdownEditor, {
			props: { field: baseField, name: 'body', _v: () => undefined, onchange: vi.fn() },
		} );

		expect( screen.getByTestId( 'ai-markdown-editor-stub' ) ).toHaveAttribute( 'data-value', '' );
	});

	it('applies default extra settings such as apiEndpoint and modelName', () => {
		render( FormAIMarkdownEditor, {
			props: { field: baseField, name: 'body', _v: () => '', onchange: vi.fn() },
		} );

		const editor = screen.getByTestId( 'ai-markdown-editor-stub' );
		expect( editor ).toHaveAttribute( 'data-api-endpoint', 'https://api.openai.com/v1/chat/completions' );
		expect( editor ).toHaveAttribute( 'data-model-name', 'gpt-3.5-turbo' );
	});

	it('overrides defaults with field.extra values', () => {
		const field : FormField = {
			...baseField,
			extra: { apiKey: 'secret-key', modelName: 'gpt-4', suggestionDelay: 500 },
		};
		render( FormAIMarkdownEditor, { props: { field, name: 'body', _v: () => '', onchange: vi.fn() } } );

		const editor = screen.getByTestId( 'ai-markdown-editor-stub' );
		expect( editor ).toHaveAttribute( 'data-api-key', 'secret-key' );
		expect( editor ).toHaveAttribute( 'data-model-name', 'gpt-4' );
		expect( editor ).toHaveAttribute( 'data-suggestion-delay', '500' );
	});

	it('calls onchange with the field name, value and field when the editor changes', async () => {
		const onchange = vi.fn();
		render( FormAIMarkdownEditor, { props: { field: baseField, name: 'body', _v: () => '', onchange } } );

		await userEvent.click( screen.getByText( 'trigger-change' ) );

		expect( onchange ).toHaveBeenCalledWith( 'body', 'new markdown value', baseField );
	});
});
