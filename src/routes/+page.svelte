<script>
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import MD5 from 'crypto-js/md5';

	import { token } from '$lib/credentials.js';
	import { getMenu, selected } from '$lib/menu.js';
	import { createToken, listProjects } from '$lib/client.js';

	import Menu from '$lib/Menu.svelte';
	import LoginModal from '$lib/LoginModal.svelte';
	import LabeledInput from '$lib/LabeledInput.svelte';

	import DashboardView from '$lib/DashboardView.svelte';
	import ControlPlaneView from '$lib/ControlPlaneView.svelte';
	import ClusterView from '$lib/ClusterView.svelte';

	let showmenu = false;

	function toggleMenu() {
		showmenu = !showmenu;
	}

	// logout flushes the token.
	function logout() {
		token.remove();
	}

	// Watch for the token being set, then we can trigger a projects
	// update.
	let projects = [];
	let project = null;

	// Email address from the token.
	let email = '';

	function reset() {
		projects = [];
		project = null;
	}

	// id is a unique identifier for the component instance.
	let id = Symbol();

	onMount(() => {
		token.subscribe(id, changeToken);
	});

	onDestroy(() => {
		token.unsubscribe(id);
	});

	async function changeToken(value) {
		if (value == null) {
			reset();
			return;
		}

		// Already set, don't do it again, we only do this on initial load.
		if (projects.length != 0) {
			return;
		}

		email = value.email;

		const result = await listProjects({
			token: value.token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		if (result == null) {
			return;
		}

		// Set the projects.
		projects = result;

		// If the project is present for the token, select that one
		// e.g. reload a session.
		if (value.project) {
			for (const p of projects) {
				if (p.id == value.project) {
					project = p;
					break;
				}
			}
		}

		// If nothing is found, pick one.
		if (project == null) {
			project = projects[0];
		}

		// onChange will not get raised automatically.
		// TODO: is there another event that will trigger this?
		await changeProject();
	}

	// When the project updates, rescope the token.
	async function changeProject() {
		let t = token.get();

		if (t.scope == token.scoped && t.project == project.id) {
			return;
		}

		let body = {
			project: {
				id: project.id
			}
		};

		const result = await createToken({
			token: t.token,
			body: body,
			onUnauthorized: () => {
				token.remove();
			}
		});

		if (result == null) {
			return;
		}

		token.set(result.token, token.scoped, result.email, project.id);
	}

	// When a menu item is selected, hide the menu and update the
	// main view.
	let content;
	let menu;

	let desktop;

	if (browser) {
		desktop = window.matchMedia('(min-width: 720px)');
	}

	selected.subscribe((value) => {
		// Hide the menu on mobile view, it's covering everything.
		if (desktop && !desktop.matches) {
			showmenu = false;
		}
		content = value;
		menu = getMenu(value);
	});
</script>

<LoginModal />

<header>
	<span id="hamburger" class="selectable" on:click={toggleMenu} on:keypress={toggleMenu}>
		<iconify-icon id="hamburger-icon" icon="material-symbols:menu" />
		<label for="hamburger-icon">Menu</label>
	</span>
	<img src="img/Horizontal_AI.png" alt="EscherCloud AI Logo" />
</header>

<nav class:showmenu>
	<div class="nav-group user">
		<img src="https://www.gravatar.com/avatar/{MD5(email)}" alt="User Gravatar" />
		{email}
		<iconify-icon
			class="selectable"
			icon="material-symbols:logout"
			on:click={logout}
			on:keypress={logout}
		/>
	</div>

	<LabeledInput id="project-select" value="Project">
		<select id="project-select" name="project" bind:value={project} on:change={changeProject}>
			{#each projects as choice}
				<option value={choice}>{choice.name}</option>
			{/each}
		</select>
	</LabeledInput>

	{#if menu}
		<Menu {...menu} />
	{/if}
</nav>

<main class:showmenu>
	{#if content == 'dashboard'}
		<DashboardView />
	{:else if content == 'kubernetes-control-planes'}
		<ControlPlaneView />
	{:else if content == 'kubernetes-clusters'}
		<ClusterView />
	{/if}
</main>

<style>
	/* Global constants */
	:global(:root) {
		/* Font size setting the relative sizing of all the things. */
		font-size: 15px;

		/* Brand color palette */
		--brand: hsl(295, 21%, 48%);
		--brand-light: hsl(295, 21%, 60%);
		--brand-dark: hsl(295, 21%, 36%);

		/* Generic colors */
		--light-grey: rgb(245, 245, 245);
		--mid-grey: rgb(128, 128, 128);
		--dark-grey: rgb(96, 96, 96);
		--error: deeppink;

		/* Various stylings to keep consistency */
		--radius: 0.5rem;
		--shadow-offset: 0.25rem;
		--padding: 0.75rem;
		--padding-header: 4rem;
		--icon-size: 1.5rem;
		--nav-icon-size: 2rem;
	}

	/* Global styles */
	:global(html) {
		font-family: sans-serif;
	}
	:global(body) {
		margin: 0;
	}
	:global(h1, h2, h3, h4, h5, h6) {
		color: var(--brand);
		margin-top: 0.5em;
	}
	:global(a:link, a:visited) {
		color: var(--brand);
	}
	:global(a:hover) {
		color: var(--brand-light);
	}
	:global(input[type='text'], input[type='password'], input[type='range'], select) {
		box-sizing: border-box;
		background: none;
		border: none;
		width: 100%;
		font-size: 1rem;
		transition: all 0.2s ease-in;
	}
	:global(input[type='text'], input[type='password'], select) {
		padding: var(--padding);
		border-bottom: 2px solid var(--brand);
		text-overflow: ellipsis;
	}
	:global(
			input[type='text']:focus,
			input[type='password']:focus,
			input[type='range']:focus,
			select:focus
		) {
		outline: none;
		box-shadow: 0 0 var(--radius) var(--brand-light);
	}
	:global(input[type='text']:invalid, input[type='password']:invalid, select:invalid) {
		box-shadow: 0 0 var(--radius) var(--error);
	}
	:global(input[type='range']::-moz-range-track) {
		background-color: var(--brand);
	}
	:global(input[type='range']::-webkit-slider-runnable-track) {
		background-color: var(--brand);
	}
	:global(input[type='checkbox']) {
		appearance: none;
		display: grid;
		place-content: center;
		width: 1.5em;
		height: 1.5em;
		border: 2px solid var(--brand);
	}
	:global(input[type='checkbox']::before) {
		content: '';
		width: 0.75em;
		height: 0.75em;
		transform: scale(0);
		transition: all 0.2s ease-in;
		background-color: var(--brand);
	}
	:global(input[type='checkbox']:checked::before) {
		transform: scale(1);
	}
	:global(button) {
		color: white;
		padding: var(--padding);
		font-weight: bold;
		font-size: 1rem;
		background-color: var(--brand);
		display: inline-flex;
		align-items: center;
		gap: var(--padding);
		cursor: pointer;
		border-radius: var(--radius);
		border-style: none;
	}
	:global(button:hover) {
		background-color: var(--brand-dark);
	}
	:global(button:focus) {
		background-color: var(--brand-dark);
	}
	:global(button:disabled) {
		background-color: var(--brand-light);
		cursor: not-allowed;
	}
	:global(iconify-icon) {
		font-size: var(--icon-size);
	}
	:global(ul) {
		margin: 0;
		padding: 0;
	}
	:global(ul li) {
		color: var(--mid-grey);
		padding: var(--padding);
		list-style: none;
	}
	:global(ul li:hover) {
		color: var(--dark-grey);
		background-color: var(--light-grey);
	}
	:global(ul li iconify-icon:first-child) {
		color: var(--brand);
		margin-right: var(--padding);
	}
	:global(section) {
		margin: var(--padding);
	}
	:global(article) {
		margin: var(--padding);
		padding: var(--padding);
		border: 2px solid var(--brand);
		background: white;
		border-radius: var(--radius);
		box-shadow: var(--shadow-offset) var(--shadow-offset) var(--radius) var(--mid-grey);
	}
	:global(summary) {
		font-weight: bold;
		color: var(--brand);
	}
	:global(.selectable) {
		cursor: pointer;
	}
	:global(.error) {
		color: var(--error);
	}
	iconify-icon {
		color: var(--brand);
		font-weight: bold;
	}

	/*
	   Main layout is a 2x2 grid, with header spanning the first row
	   and nav/main in the second.  In normal view (mobile) the nav is fixed
	   positioned in relation to the row/column, so the first column doesn't
	   actually contain anything and the main spans the whole page.  In desktop
	   view the nav reverts back to a grid cell.
	 */
	:global(.container) {
		width: 100vw;
		height: 100vh;
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: auto 1fr;
	}
	header {
		box-sizing: border-box;
		grid-row: 1;
		grid-column: 1 / -1;
		position: sticky;
		top: 0;
		padding: var(--padding);
		border-bottom: 0.25em solid var(--brand);
		z-index: 20;
		text-align: center;
		background-color: white;
	}
	main {
		background-color: var(--light-grey);
		transition: all 0.3s ease-in-out;
		box-shadow: inset 0 0 var(--radius) var(--mid-grey);
		grid-row: 2;
		grid-column: 2;
	}
	nav {
		position: fixed;
		top: 3.75em;
		height: calc(100vh - 3.75em);
		grid-column: 1;
		grid-row: 2;
		width: 0;
		overflow-x: hidden;
		overflow-y: auto;
		z-index: 10;
		display: flex;
		flex-direction: column;
		color: var(--mid-grey);
		transition: all 0.3s ease-in-out;
		background-color: white;
	}

	/* Header/masthead styling */
	header > img {
		max-height: 2em;
		margin-right: 2em;
	}
	#hamburger {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		float: left;
		color: var(--brand);
	}
	#hamburger > iconify-icon {
		font-size: 1.5em;
	}
	#hamburger > label {
		font-size: 0.5em;
	}

	/* Nav styling */
	nav.showmenu {
		width: 100vw;
	}
	.nav-group {
		display: flex;
		align-items: center;
		padding: var(--padding);
		gap: var(--padding);
	}
	nav > .user {
		font-size: 0.8em;
		justify-content: space-between;
	}
	nav > .user img {
		max-height: 2em;
		margin-right: var(--padding);
		border-radius: 1em;
		border: 1px solid black;
	}

	/* Desktop overrides */
	@media only screen and (min-width: 720px) {
		nav {
			position: static;
		}
		nav.showmenu {
			width: 300px;
		}
	}
</style>
