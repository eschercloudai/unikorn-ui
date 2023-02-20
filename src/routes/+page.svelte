<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from '$lib/credentials.js';
	import { getMenu, selected } from '$lib/menu.js';
	import { createToken, listProjects } from '$lib/client.js';

	import Menu from '$lib/Menu.svelte';
	import LoginModal from '$lib/LoginModal.svelte';

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

		token.set(result.token, token.scoped, project.id);
	}

	// When a menu item is selected, hide the menu and update the
	// main view.
	let content;
	let menu;

	selected.subscribe((value) => {
		// TODO: we should only dismiss this in mobile mode.
		showmenu = false;
		content = value;
		menu = getMenu(value);
	});
</script>

<LoginModal />

<header>
	<span id="hamburger" on:click={toggleMenu} on:keypress={toggleMenu}>
		<iconify-icon id="hamburger-icon" icon="material-symbols:menu" />
		<label for="hamburger-icon">Menu</label>
	</span>
	<img src="img/Horizontal_AI.png" alt="EscherCloud AI Logo" />
</header>

<nav class:showmenu>
	<div class="nav-group user">
		<!-- TODO: An API to extract this jazz from oidc -->
		<img
			src="https://www.gravatar.com/avatar/4be664eabb39ff7d1ac5085bfa19cada"
			alt="User Gravatar"
		/>
		s.murray@eschercloud.ai
		<iconify-icon icon="material-symbols:logout" on:click={logout} on:keypress={logout} />
	</div>

	<div class="nav-group project">
		<label for="project-select">Project:</label>
		<select id="project-select" name="project" bind:value={project} on:change={changeProject}>
			{#each projects as choice}
				<option value={choice}>{choice.name}</option>
			{/each}
		</select>
	</div>

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

		/* Various stylings to keep consistency */
		--radius: 0.5rem;
		--shadow-radius: 0.5rem;
		--padding: 0.75rem;
		--padding-header: 4rem;
		--icon-size: 2rem;
	}

	/* Global styles */
	:global(html) {
		font-family: sans;
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
	:global(input) {
		transition: all 0.2s ease-in;
		margin: 0.5em;
		font-size: 1em;
		border: 1px solid var(--mid-grey);
		padding: var(--padding);
		border-radius: var(--radius);
	}
	:global(input:focus) {
		outline: none;
		box-shadow: 0 0 var(--shadow-radius) var(--brand);
	}
	:global(button) {
		color: white;
		background-color: var(--brand);
		padding: var(--padding);
		margin: 0.5em;
		border-radius: var(--radius);
		border: 1px outset var(--brand);
		box-shadow: 0.25em 0.25em var(--shadow-radius) var(--mid-grey);
		font-size: 1em;
	}
	:global(button:hover) {
		background-color: var(--brand-light);
		border-color: var(--brand-light);
	}
	:global(button:focus) {
		background-color: var(--brand-dark);
		border-color: var(--brand-dark);
	}
	:global(select) {
		color: var(--mid-grey);
		background-color: var(--light-grey);
		padding: var(--padding);
		font-size: 1em;
		border: 1px solid var(--mid-grey);
		border-radius: var(--radius);
		width: 100%;
	}
	:global(select:focus) {
		outline: none;
		box-shadow: 0 0 var(--shadow-radius) var(--brand);
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
		cursor: default;
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
	}
	:global(summary) {
		font-weight: bold;
		color: var(--brand);
	}
	:global(.container) {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}
	iconify-icon {
		color: var(--brand);
		font-weight: bold;
	}

	/* Main layout */
	main {
		background-color: var(--light-grey);
		padding-top: var(--padding-header);
		flex: 1;
		transition: all 0.3s ease-in-out;
		box-shadow: inset 0 0 var(--shadow-radius) var(--mid-grey);
	}

	/* Header/masthead styling */
	header {
		position: fixed;
		top: 0;
		width: 100%;
		padding: var(--padding);
		background-color: white;
		border-bottom: 0.25em solid var(--brand);
		z-index: 20;
		text-align: center;
	}
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
	nav {
		position: fixed;
		padding-top: var(--padding-header);
		width: 0;
		height: 100vh;
		overflow-x: hidden;
		z-index: 10;
		display: flex;
		flex-direction: column;
		color: var(--mid-grey);
		background-color: white;
		transition: all 0.3s ease-in-out;
	}
	nav.showmenu {
		width: 100%;
	}
	.nav-group {
		display: flex;
		align-items: center;
		padding: var(--padding);
		border-bottom: 1px solid var(--brand);
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
	nav > .project select {
		margin-left: 0.5em;
		width: 100%;
	}

	/* Desktop overrides */
	@media only screen and (min-width: 720px) {
		nav.showmenu {
			width: 300px;
		}
		main.showmenu {
			margin-left: 300px;
		}
	}
</style>
