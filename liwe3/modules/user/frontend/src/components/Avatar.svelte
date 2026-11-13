<script lang="ts">
import { goto } from '$app/navigation';
import { Button } from '@frontend/liwe3';
import storeUser from '../store.svelte';

interface AvatarProps {
	loginURL? : string;
	logoutURL? : string;
	inviteURL? : string;
	profileURL? : string;
	onlogout? : () => void;
}

let { logoutURL = '/', loginURL = '/', inviteURL, profileURL, onlogout } : AvatarProps = $props();

let showDropdown = $state( false );
let dropdownAlign = $state<'left' | 'right'>( 'right' );
let triggerEl = $state<HTMLButtonElement>();
let dropdownEl = $state<HTMLDivElement>();

const evaluatePosition = () => {
	if ( !triggerEl ) return;
	const rect = triggerEl.getBoundingClientRect();
	const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
	const dropdownWidth = dropdownEl ? dropdownEl.offsetWidth : 160;

	// If aligning to the right causes the dropdown to overflow the left screen border
	if ( rect.right - dropdownWidth < 0 ) {
		dropdownAlign = 'left';
	} else if ( rect.left + dropdownWidth > viewportWidth ) {
		// If aligning to the left causes the dropdown to overflow the right screen border
		dropdownAlign = 'right';
	} else {
		// Default to whichever side has more room / button position on screen
		dropdownAlign = rect.left + rect.width / 2 > viewportWidth / 2 ? 'right' : 'left';
	}
};

const toggleDropdown = () => {
	if ( !showDropdown ) {
		evaluatePosition();
	}
	showDropdown = !showDropdown;
};

$effect( () => {
	if ( showDropdown ) {
		evaluatePosition();

		const handleResize = () => evaluatePosition();
		const handleClickOutside = ( event : MouseEvent ) => {
			if (
				triggerEl && !triggerEl.contains( event.target as Node ) && dropdownEl && !dropdownEl.contains( event.target as Node )
			) {
				showDropdown = false;
			}
		};
		const handleKeyDown = ( event : KeyboardEvent ) => {
			if ( event.key === 'Escape' ) {
				showDropdown = false;
			}
		};

		window.addEventListener( 'resize', handleResize );
		window.addEventListener( 'scroll', handleResize, true );
		document.addEventListener( 'click', handleClickOutside );
		document.addEventListener( 'keydown', handleKeyDown );

		return () => {
			window.removeEventListener( 'resize', handleResize );
			window.removeEventListener( 'scroll', handleResize, true );
			document.removeEventListener( 'click', handleClickOutside );
			document.removeEventListener( 'keydown', handleKeyDown );
		};
	}
} );
</script>

<div class="liwe3-avatar">
	{#if storeUser.user.id}
		<button
			bind:this={triggerEl}
			class="liwe3-avatar__trigger"
			onclick={toggleDropdown}
			aria-expanded={showDropdown}
			aria-haspopup="true"
		>
			{#if storeUser.user.avatar}
				<img src={storeUser.user.avatar} alt={storeUser.user.name} />
			{:else}
				<span>{storeUser.user.name?.charAt( 0 )}</span>
			{/if}
		</button>
		{#if showDropdown}
			<div
				bind:this={dropdownEl}
				class="liwe3-avatar__dropdown liwe3-avatar__dropdown--{dropdownAlign}"
			>
				<ul>
					{#if inviteURL}
						<li>
							<a href={inviteURL}>Invite User</a>
						</li>
					{/if}
					{#if profileURL}
						<li>
							<a href={profileURL}>Profile</a>
						</li>
					{/if}
					<li>
						<button
							class="liwe3-avatar__logout"
							onclick={() => {
								showDropdown = false;
								storeUser.logout();
								if ( onlogout ) onlogout();
								goto( logoutURL );
							}}
						>
							Logout
						</button>
					</li>
				</ul>
			</div>
		{/if}
	{:else}
		<Button size="sm" onclick={() => goto( loginURL )}>Login</Button>
	{/if}
</div>

<style>
.liwe3-avatar {
	display: flex;
	position: relative;
	align-items: center;
	user-select: none;
}

.liwe3-avatar__trigger {
	width: 40px;
	height: 40px;
	border-radius: var(--liwe3-radius-full);
	overflow: hidden;
	cursor: pointer;
	background-color: var(--liwe3-primary);
	color: var(--liwe3-text-on-primary);
	display: flex;
	justify-content: center;
	align-items: center;
	border: 2px solid var(--liwe3-border);
	font-weight: var(--liwe3-weight-semibold);
	font-size: var(--liwe3-text-lg);
	transition: border-color var(--liwe3-duration-fast) var(--liwe3-ease-out);
}

.liwe3-avatar__trigger:hover {
	border-color: var(--liwe3-primary);
}

.liwe3-avatar__trigger img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.liwe3-avatar__dropdown {
	position: absolute;
	top: 100%;
	margin-top: var(--liwe3-space-1);
	z-index: var(--liwe3-z-dropdown, 1000);
	background-color: var(--liwe3-surface-raised);
	border: 1px solid var(--liwe3-border);
	border-radius: var(--liwe3-radius-md);
	box-shadow: var(--liwe3-shadow-lg);
	padding: var(--liwe3-space-1);
	min-width: 150px;
}

.liwe3-avatar__dropdown--right {
	right: 0;
	left: auto;
}

.liwe3-avatar__dropdown--left {
	left: 0;
	right: auto;
}

.liwe3-avatar__dropdown ul {
	list-style: none;
	margin: 0;
	padding: 0;
}

.liwe3-avatar__dropdown li {
	margin: 0;
	padding: 0;
}

.liwe3-avatar__dropdown a,
.liwe3-avatar__logout {
	display: block;
	padding: var(--liwe3-space-2) var(--liwe3-space-3);
	text-decoration: none;
	color: var(--liwe3-text);
	font-size: var(--liwe3-text-sm);
	border-radius: var(--liwe3-radius-sm);
	transition: background var(--liwe3-duration-fast) var(--liwe3-ease-out);
	cursor: pointer;
	background: none;
	border: none;
	width: 100%;
	text-align: left;
	font-family: var(--liwe3-font-sans);
}

.liwe3-avatar__dropdown a:hover,
.liwe3-avatar__logout:hover {
	background-color: var(--liwe3-hover-overlay);
}
</style>
