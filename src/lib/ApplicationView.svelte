<script>
	import { onDestroy } from 'svelte';
	import { token, removeCredentials } from '$lib/credentials.js';
	import { listApplications } from '$lib/client.js';

	import View from '$lib/View.svelte';
	import ItemView from '$lib/ItemView.svelte';
	import Item from '$lib/Item.svelte';
	import Hint from '$lib/Hint.svelte';
	import Details from '$lib/Details.svelte';

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

	function select(event) {
		selected = selected == event.detail.context ? null : event.detail.context;
	}
</script>

<View>
	<Hint content="Select an application for more details." />

	<ItemView>
		{#each applications as app}
			<Item selected={app == selected} context={app} on:message={select}>
				<div class="image-wrapper">
					{@html atob(app.icon)}
				</div>
				<h5>{app.humanReadableName}</h5>
			</Item>
			{#if app == selected}
				<Item jumbo="true" selected="true">
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
								<Details summary={version.version} icon="mdi:cogs">
									<dl>
										{#if version.dependencies}
											<dt>Dependencies</dt>
											<dd>{version.dependencies.map((x) => x.name).join(', ')}</dd>
										{/if}
										{#if version.recommends}
											<dt>Recommends</dt>
											<dd>{version.recommends.map((x) => x.name).join(', ')}</dd>
										{/if}
									</dl>
								</Details>
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
	h5 {
		/* Fix me with better CSS */
		padding-left: unset;
		padding-right: unset;
	}
	h5 {
		/* Fix me with better CSS */
		text-align: center;
	}
</style>
