<script>
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import MD5 from 'crypto-js/md5';

	import { token, email, project, updateCredentials, removeCredentials } from '$lib/credentials.js';
	import { getMenu, selected } from '$lib/menu.js';
	import { listProjects } from '$lib/client.js';

	import Menu from '$lib/Menu.svelte';
	import LoginModal from '$lib/LoginModal.svelte';
	import LabeledInput from '$lib/LabeledInput.svelte';

	import Breadcrumbs from '$lib/Breadcrumbs.svelte';
	import ControlPlaneView from '$lib/ControlPlaneView.svelte';
	import ClusterView from '$lib/ClusterView.svelte';
	import Errors from '$lib/Errors.svelte';

	// Access token, this changing should trigger all the things.
	let accessToken;

	// OpenStack project ID.
	let projectID;

	// User email address from OIDC.
	let emailAddress = '';

	// TODO: we should probably cache this in session storage.
	let showmenu = false;

	// Menu to display.
	let menu;

	// Content to display.
	let content;

	// Whether or not to behave as if it's a large desktop window.
	let desktop;

	if (browser) {
		desktop = window.matchMedia('(min-width: 720px)');
	}

	let projects = [];
	let currentProject = null;

	const emailUnsubscribe = email.subscribe(changeEmail);
	const tokenUnsubscribe = token.subscribe(changeToken);
	const projectUnsubscribe = project.subscribe(changeProjectID);
	const selectedUnsubscribe = selected.subscribe(changeMenuItem);

	onDestroy(() => {
		tokenUnsubscribe();
		emailUnsubscribe();
		projectUnsubscribe();
		selectedUnsubscribe();
	});

	function toggleMenu() {
		showmenu = !showmenu;
	}

	// logout flushes the token.
	function logout() {
		removeCredentials();
	}

	function changeProjectID(value) {
		projectID = value;
	}

	function changeEmail(value) {
		emailAddress = value;
	}

	function changeToken(value) {
		accessToken = value;
	}

	async function updateProjects(accessToken) {
		if (accessToken == null) {
			projects = [];
			currentProject = null;
			return;
		}

		const result = await listProjects({
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
			}
		});

		if (result == null) {
			return;
		}

		projects = result;

		// projectID *should* be set before the access token changes.
		currentProject = projects.filter((p) => p.id == projectID)[0];
	}

	$: updateProjects(accessToken);

	// When the project changes, rescope the token.
	async function changeProject() {
		await updateCredentials(accessToken, currentProject.id);
	}

	function changeMenuItem(value) {
		// Hide the menu on mobile view, it's covering everything.
		if (desktop && !desktop.matches) {
			showmenu = false;
		}

		content = value;
		menu = getMenu(value);
	}
</script>

<LoginModal />

<header>
	<span id="hamburger" class="selectable" on:click={toggleMenu} on:keypress={toggleMenu}>
		{#if showmenu}
			<iconify-icon id="hamburger-icon" icon="material-symbols:close" />
		{:else}
			<iconify-icon id="hamburger-icon" icon="material-symbols:menu" />
		{/if}
		<label for="hamburger-icon">Menu</label>
	</span>
	<!--
	 This needs to be injected into the DOM in order for the "currentColor" stuff to
	 work, as such, the <img> will be replaced with an <svg>, and Svelte will complain
	 about styles being unused due to no <svg> tags...
	-->
	<img
		src="img/ecai.svg"
		alt="EscherCloud AI Logo"
		onload="SVGInject(this)"
		style="max-height: 2em; width: auto; margin-right: 2em;"
	/>
</header>

<div id="content">
	<div id="content-inner" class:showmenu>
		<nav class:showmenu>
			<div class="user">
				<img src="https://www.gravatar.com/avatar/{MD5(emailAddress)}" alt="User Gravatar" />
				<span>{emailAddress}</span>
				<iconify-icon
					class="selectable"
					icon="material-symbols:logout"
					on:click={logout}
					on:keypress={logout}
				/>
			</div>

			<LabeledInput id="project-select" value="Project">
				<select
					id="project-select"
					name="project"
					bind:value={currentProject}
					on:change={changeProject}
				>
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
			{#if content == 'kubernetes-control-planes'}
				<ControlPlaneView />
			{:else if content == 'kubernetes-clusters'}
				<ClusterView />
			{/if}
		</main>
	</div>
</div>

<style>
	/* Global constants */
	:global(:root) {
		/* Brand color palette */
		--brand: rgb(144, 97, 148);
		--brand-light: rgb(171, 132, 174);
		--brand-dark: rgb(108, 73, 111);

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
		--nav-width: 100vw;

		--overlay: rgba(255, 255, 255, 0.75);
		--modal: rgb(255, 255, 255);
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
	:global(body) {
		background-image: url('/img/wave.svg');
		background-repeat: no-repeat;
		background-position: top right;
		background-size: cover;
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
		color: inherit;
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
		color: inherit;
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
	:global(input[type='checkbox']:disabled) {
		border: 2px solid var(--mid-grey);
	}
	:global(input[type='checkbox']::before) {
		content: '';
		width: 0.75em;
		height: 0.75em;
		transform: scale(0);
		transition: all 0.2s ease-in;
		background-color: var(--brand);
	}
	:global(input[type='checkbox']:disabled::before) {
		background-color: var(--mid-grey);
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
		background-color: var(--overlay);
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
		backdrop-filter: blur(2px);
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
		background-color: var(--overlay);
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

	#content {
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	#content-inner {
		width: calc(var(--nav-width) + 100%);
		height: 100%;
		transition: all 0.3s ease-in-out;
		transform: translateX(calc(var(--nav-width) * -1));
		display: flex;
	}

	#content-inner.showmenu {
		transform: none;
	}

	main {
		width: 100%;
		height: 100%;
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	/* Nav styling */
	nav {
		width: var(--nav-width);
		height: 100%;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		background-color: var(--overlay);
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
		border: 1px solid currentColor;
	}
	.user iconify-icon {
		font-size: var(--icon-size);
		color: var(--brand);
	}

	/* Desktop overrides */
	@media only screen and (min-width: 720px) {
		:global(:root) {
			--nav-width: 300px;
		}
		#content-inner.showmenu {
			width: 100%;
		}
		nav {
			border-right: 1px solid var(--brand);
		}
	}

	/* Color preference overrides */
	@media (prefers-color-scheme: dark) {
		:global(:root) {
			/* Brand color palette */
			--brand: rgb(171, 90, 177);
			--brand-light: rgb(203, 93, 215);
			--brand-dark: rgb(116, 49, 121);

			--overlay: rgba(40, 40, 40, 0.75);
			--modal: rgb(13, 13, 28);
		}
		:global(body) {
			background-color: #0d0d1c;
			color: white;
		}
		:global(h1, h2, h3, h4, h5, h6) {
			color: var(--brand-light);
		}
	}
</style>
