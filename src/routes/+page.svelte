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

	import Breadcrumbs from '$lib/Breadcrumbs.svelte';
	import DashboardView from '$lib/DashboardView.svelte';
	import ControlPlaneView from '$lib/ControlPlaneView.svelte';
	import ClusterView from '$lib/ClusterView.svelte';
	import Errors from '$lib/Errors.svelte';

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
	<div class="user">
		<img src="https://www.gravatar.com/avatar/{MD5(email)}" alt="User Gravatar" />
		<span>{email}</span>
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
	<Breadcrumbs />
	<Errors />
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
		--nav-width-desktop: 300px;
	}

	/* Global styles */
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}
	:global(html) {
		font-family: sans-serif;
	}
	:global(h1, h2, h3, h4, h5, h6) {
		color: var(--brand);
		text-align: center;
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
		background: linear-gradient(0, var(--brand-dark) 0%, var(--brand) 50%, var(--brand-light) 100%);
		background-size: auto 200%;
		transition: background-position 0.2s ease-in;
		display: inline-flex;
		align-items: center;
		gap: var(--padding);
		cursor: pointer;
		border-radius: var(--radius);
		border-style: none;
	}
	:global(button:hover) {
		background-position: center bottom;
	}
	:global(button:focus) {
		background-position: center bottom;
	}
	:global(button:disabled) {
		background: linear-gradient(0, var(--dark-grey) 0%, var(--mid-grey) 100%);
		cursor: not-allowed;
	}
	:global(details) {
		background-color: white;
	}
	:global(details > section) {
		padding: var(--padding);
		border: 1px solid var(--brand);
		border-top: none;
		display: flex;
		flex-direction: column;
		gap: var(--padding);
	}

	:global(summary) {
		padding: var(--padding);
		color: var(--brand);
		cursor: pointer;
		border-radius: var(--radius) 0 0 0;
		border: 1px solid var(--brand);
	}
	:global(summary:hover) {
		color: var(--brand-dark);
	}
	:global(.selectable) {
		cursor: pointer;
	}
	:global(.error) {
		color: var(--error);
	}
	:global(.modal-header) {
		padding: var(--padding);
		background: linear-gradient(0, var(--brand-dark) 0%, var(--brand) 50%, var(--brand-light) 100%);
		color: white;
		display: inline-flex;
		gap: var(--padding);
		align-items: center;
	}

	/* Main styling */
	:global(.container) {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
	}
	main {
		background-color: var(--light-grey);
		transition: all 0.3s ease-in-out;
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	/* Header/masthead styling */
	header {
		box-sizing: border-box;
		position: sticky;
		top: 0;
		padding: var(--padding);
		border-bottom: 0.25em solid var(--brand);
		z-index: 20;
		text-align: center;
		background-color: white;
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
		top: 3.75em;
		height: calc(100vh - 3.75em);
		width: 100vw;
		overflow-y: auto;
		z-index: 10;
		display: flex;
		flex-direction: column;
		color: var(--mid-grey);
		transform-origin: left;
		transform: translateX(-100vh);
		transition: transform 0.3s ease-in-out;
		background-color: white;
	}
	nav.showmenu {
		transform: none;
	}

	/* User nav element */
	.user {
		display: flex;
		align-items: center;
		padding: var(--padding);
		gap: var(--padding);
		justify-content: space-between;
	}
	.user span {
		font-size: 0.8em;
	}
	.user img {
		max-height: var(--nav-icon-size);
		margin-right: var(--padding);
		border-radius: 1em;
		border: 1px solid black;
	}
	.user iconify-icon {
		font-size: var(--icon-size);
		color: var(--brand);
	}

	/* Desktop overrides */
	@media only screen and (min-width: 720px) {
		main.showmenu {
			margin-left: var(--nav-width-desktop);
		}
		nav {
			width: var(--nav-width-desktop);
			transform: translateX(calc(var(--nav-width-desktop) * -1));
			border-right: 1px solid var(--brand);
			box-shadow: 0 var(--shadow-offset) var(--radius) var(--mid-grey);
		}
	}
</style>
