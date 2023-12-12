<script>
	import { onDestroy } from 'svelte';
	import { token, removeCredentials } from '$lib/credentials.js';
	import { listApplications } from '$lib/client.js';

	import View from '$lib/View.svelte';
	import ItemView from '$lib/ItemView.svelte';
	import Item from '$lib/Item.svelte';
	import Hint from '$lib/Hint.svelte';

	let accessToken;

	let applications = [];

	let selected = null;

	const tokenUnsubscribe = token.subscribe(changeToken);

	const ticker = setInterval(() => updateApplictions(accessToken), 10000);

	onDestroy(() => {
		clearInterval(ticker);
		tokenUnsubscribe();
	});

	function changeToken(value) {
		applications = [];

		accessToken = value;
	}

	async function updateApplictions(accessToken) {
		if (accessToken == null) {
			applications = [];
			return;
		}

		const result = await listApplications({
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
			}
		});

		if (result == null) {
			return;
		}

		applications = result;

		if (selected) {
			const results = applications.filter((x) => x.name == selected.name);

			selected = results[0];
		}
	}

	$: updateApplictions(accessToken);

	function select(app) {
		selected = selected == app ? null : app;
	}
</script>

<View>
	<Hint content="Click an application for more details." />

	<ItemView>
		{#each applications as app}
			<Item selected={app == selected}>
				<div class="image-wrapper" on:click={select(app)} on:keypress={select(app)}>
					{@html atob(app.icon)}
				</div>
				<h5>{app.humanReadableName}</h5>
			</Item>
			{#if app == selected}
				<Item jumbo="true" selected="true">
					<h3>{app.humanReadableName}</h3>
					<dl>
						<dt>Description</dt>
						<dd>{app.description}</dd>
						<dt>Documentation</dt>
						<dd><a href={app.documentation}>{app.documentation}</a></dd>
						<dt>License</dt>
						<dd>{app.license}</dd>
						<dt>Tags</dt>
						<dd>{app.tags.join(', ')}</dd>
						<dt>Versions</dt>
						<dd>
							{#each app.versions as version}
								<dl>
									<dt>Version</dt>
									<dd>{version.version}</dd>
									{#if version.dependencies}
										<dt>Dependencies</dt>
										<dd>{version.dependencies.map((x) => x.name).join(', ')}</dd>
									{/if}
									{#if version.recommends}
										<dt>Recommends</dt>
										<dd>{version.recommends.map((x) => x.name).join(', ')}</dd>
									{/if}
								</dl>
							{/each}
						</dd>
					</dl>
				</Item>
			{/if}
		{/each}
	</ItemView>
</View>

<style>
	.image-wrapper {
		height: 5rem;
	}

	.image-wrapper > :global(svg) {
		max-width: 10rem;
		max-height: 5rem;
		display: block;
		margin: auto;
	}
	h3,
	h5 {
		/* Fix me with better CSS */
		padding-left: unset;
		padding-right: unset;
	}
	h5 {
		/* Fix me with better CSS */
		text-align: center;
	}
	dl {
		display: flex;
		flex-direction: column;
		gap: var(--padding);
		font-size: 0.75rem;
	}
	dt {
		font-weight: bold;
		grid-column-start: 1;
	}
	dd {
		display: flex;
		flex-direction: column;
		gap: var(--padding);
	}
	dd > dl {
		border: 1px solid var(--brand);
		border-radius: var(--radius);
		box-shadow: 0 0 var(--radius) var(--brand-light);
		padding: var(--padding);
	}
	@media only screen and (min-width: 720px) {
		/* In desktop mode, create as many columns as possible for
                   a specific minimum size */
		dl {
			display: grid;
			grid-template-columns: auto 1fr;
			grid-auto-flow: column;
			grid-gap: calc(var(--padding) / 2) var(--padding);
		}
	}
</style>
