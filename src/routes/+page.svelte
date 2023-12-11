<script>
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import MD5 from 'crypto-js/md5';

	import { token, email, project, updateCredentials, removeCredentials } from '$lib/credentials.js';
	import { getMenu, selected } from '$lib/menu.js';
	import { listProjects } from '$lib/client.js';
	import { env } from '$env/dynamic/public';

	import Menu from '$lib/Menu.svelte';
	import LoginModal from '$lib/LoginModal.svelte';
	import LabeledInput from '$lib/LabeledInput.svelte';

	import Breadcrumbs from '$lib/Breadcrumbs.svelte';
	import ControlPlaneView from '$lib/ControlPlaneView.svelte';
	import ClusterView from '$lib/ClusterView.svelte';
	import ApplicationView from '$lib/ApplicationView.svelte';
	import Errors from '$lib/Errors.svelte';

	import Portal from 'svelte-portal';

	// Access token, this changing should trigger all the things.
	let accessToken;

	// OpenStack project ID.
	let projectID;

	// User email address from OIDC.
	let emailAddress = '';

	// TODO: we should probably cache this in session storage.
	let showmenu;

	// Menu to display.
	let menu;

	// Content to display.
	let content;

	// Whether or not to behave as if it's a large desktop window.
	let desktop;

	if (browser) {
		// TODO: unlikely but this may change due to a window resize...
		const mql = window.matchMedia('(min-width: 720px)');

		desktop = mql.matches;
		showmenu = mql.matches;
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
		if (!desktop) {
			showmenu = false;
		}

		content = value;
		menu = getMenu(value);
	}
</script>

<LoginModal />

<Portal target="#modal" />
<div id="modal" />

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
		style="max-height: 2.1em; width: auto; margin-right: 2em;"
	/>
</header>

<div id="content">
	<div id="content-inner" class:showmenu>
		<nav class:showmenu>
			<section>
				<h3>User</h3>
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
			</section>

			<section>
				<h3>Project</h3>
				<LabeledInput id="project-select" value="Current project scope">
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
			</section>

			<section>
				<h3>Menu</h3>
				{#if menu}
					<Menu {...menu} />
				{/if}
			</section>

			<div class="about">Version {env.PUBLIC_APPLICATION_VERSION}</div>
		</nav>

		<main class:showmenu>
			<Breadcrumbs />
			<Errors />
			{#if content == 'kubernetes-control-planes'}
				<ControlPlaneView />
			{:else if content == 'kubernetes-clusters'}
				<ClusterView />
			{:else if content == 'kubernetes-applications'}
				<ApplicationView />
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

		--overlay: rgba(240, 230, 230, 0.95);
		--overlay-brand: rgba(234, 218, 236, 0.95);
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
		padding: var(--padding);
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
		padding: var(--padding);
		font-weight: bold;
		font-size: 1rem;
		transition: all 0.2s ease-in;
		display: inline-flex;
		align-items: center;
		gap: var(--padding);
		cursor: pointer;
		color: currentColor;
		background-color: var(--overlay);
		border-radius: var(--radius);
		border-style: none;
		border: 1px solid var(--brand);
		box-shadow: 0 0 var(--padding) var(--brand);
	}
	:global(button:hover) {
		box-shadow: 0 0 var(--padding) var(--brand-light);
	}
	:global(button:focus) {
		box-shadow: 0 0 var(--padding) var(--brand-light);
	}
	:global(button:disabled) {
		cursor: not-allowed;
		color: var(--mid-grey);
		box-shadow: 0 0 var(--padding) var(--mid-grey);
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
		transition: all 0.3s ease-in-out;
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
		display: inline-flex;
		gap: var(--padding);
		align-items: center;
		background-color: var(--overlay);
		border-bottom: 1px solid var(--brand);
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
		background-color: var(--overlay);
		display: flex;
		gap: 2em;
		align-content: center;
	}

	#hamburger {
		display: flex;
		flex-direction: column;
		align-items: center;
		color: var(--brand);
		/* Fixed size for when the icon updates... */
		width: 2em;
		height: 2em;
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
		max-width: 100vw;
		height: 100%;
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	/* Nav styling */
	nav {
		min-width: var(--nav-width);
		height: 100%;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--padding);
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

	.about {
		font-size: 0.8em;
		color: var(--dark-grey);
		padding: var(--padding);
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
			--overlay: rgba(40, 40, 40, 0.75);
			--overlay-brand: rgba(50, 33, 51, 0.75);
			--modal: rgb(13, 13, 28);
		}
		:global(body) {
			background-color: #0d0d1c;
			color: white;
		}
		:global(h1, h2, h3, h4, h5, h6) {
			color: white;
		}
		:global(summary) {
			color: var(--brand-light);
		}
		:global(summary:hover) {
			color: var(--brand);
		}
	}
</style>
