import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CheckList, { type CheckListType } from '../CheckList.svelte';

const makeChecklist = ( overrides : Partial<CheckListType> = {} ) : CheckListType => ( {
	id: 'cl-1',
	title: 'My Checklist',
	items: [
		{ id: 'it-1', text: 'First item', completed: false },
		{ id: 'it-2', text: 'Second item', completed: true },
	],
	...overrides,
} );

describe('CheckList', () => {
	it('renders the checklist title in an editable input by default', () => {
		render( CheckList, { props: { checklist: makeChecklist() } } );

		expect( screen.getByPlaceholderText( 'Checklist title' ) ).toHaveValue( 'My Checklist' );
	});

	it('renders the title as static text when titleEditable is false', () => {
		render( CheckList, { props: { checklist: makeChecklist(), titleEditable: false } } );

		expect( screen.getByText( 'My Checklist' ) ).toBeInTheDocument();
		expect( screen.queryByPlaceholderText( 'Checklist title' ) ).toBeNull();
	});

	it('renders all checklist items with their checked state', () => {
		render( CheckList, { props: { checklist: makeChecklist() } } );

		expect( screen.getByLabelText( 'First item' ) ).not.toBeChecked();
		expect( screen.getByLabelText( 'Second item' ) ).toBeChecked();
	});

	it('shows the delete checklist button and calls ondeletechecklist when clicked', async () => {
		const ondeletechecklist = vi.fn();
		render( CheckList, { props: { checklist: makeChecklist(), ondeletechecklist } } );

		await userEvent.click( screen.getByRole( 'button', { name: 'Delete' } ) );

		expect( ondeletechecklist ).toHaveBeenCalledWith( 'cl-1' );
	});

	it('hides the delete checklist button when showDeleteCheckList is false', () => {
		render( CheckList, {
			props: { checklist: makeChecklist(), showDeleteCheckList: false, ondeletechecklist: vi.fn() },
		} );

		expect( screen.queryByRole( 'button', { name: 'Delete' } ) ).toBeNull();
	});

	it('calls ontoggleitem when an item checkbox is toggled', async () => {
		const ontoggleitem = vi.fn();
		render( CheckList, { props: { checklist: makeChecklist(), ontoggleitem } } );

		await userEvent.click( screen.getByLabelText( 'First item' ) );

		expect( ontoggleitem ).toHaveBeenCalledWith( 'cl-1', 'it-1', true );
	});

	it('calls ondeleteitem when an item delete button is clicked', async () => {
		const ondeleteitem = vi.fn();
		render( CheckList, { props: { checklist: makeChecklist(), ondeleteitem } } );

		const deleteButtons = screen.getAllByRole( 'button', { name: 'Delete item' } );
		await userEvent.click( deleteButtons[0] );

		expect( ondeleteitem ).toHaveBeenCalledWith( 'cl-1', 'it-1' );
	});

	it('does not render item delete buttons when showDeleteItem is false', () => {
		render( CheckList, { props: { checklist: makeChecklist(), showDeleteItem: false } } );

		expect( screen.queryByRole( 'button', { name: 'Delete item' } ) ).toBeNull();
	});

	it('adds a new item when clicking Add with text entered', async () => {
		const onadditem = vi.fn();
		render( CheckList, { props: { checklist: makeChecklist(), onadditem } } );

		const input = screen.getByPlaceholderText( 'Add an item' );
		await userEvent.type( input, 'New task' );
		await userEvent.click( screen.getByRole( 'button', { name: 'Add' } ) );

		expect( onadditem ).toHaveBeenCalledWith(
			'cl-1',
			expect.objectContaining( { text: 'New task', completed: false } ),
		);
	});

	it('disables the Add button when the input is empty', () => {
		render( CheckList, { props: { checklist: makeChecklist() } } );

		expect( screen.getByRole( 'button', { name: 'Add' } ) ).toBeDisabled();
	});

	it('does not render the add-item section when showAddItem is false', () => {
		render( CheckList, { props: { checklist: makeChecklist(), showAddItem: false } } );

		expect( screen.queryByPlaceholderText( 'Add an item' ) ).toBeNull();
	});

	it('calls onupdatetitle when editing the title input', async () => {
		const onupdatetitle = vi.fn();
		render( CheckList, { props: { checklist: makeChecklist(), onupdatetitle } } );

		const titleInput = screen.getByPlaceholderText( 'Checklist title' );
		await userEvent.type( titleInput, '!' );

		expect( onupdatetitle ).toHaveBeenCalledWith( 'cl-1', 'My Checklist!' );
	});
});
