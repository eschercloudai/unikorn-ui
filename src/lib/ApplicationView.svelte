<script>
	import { onDestroy } from 'svelte';
	import { token, removeCredentials } from '$lib/credentials.js';
	import { listApplications } from '$lib/client.js';

	import View from '$lib/View.svelte';
	import ItemView from '$lib/ItemView.svelte';
	import Item from '$lib/Item.svelte';

	let accessToken;

	let applications = [];

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

		applications = await listApplications({
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
			}
		});
	}

	$: updateApplictions(accessToken);
</script>

<View>
	<ItemView>
		{#each applications as app}
			<Item>
				<div class="image-wrapper">
					{@html atob(app.icon)}
				</div>
				<dl>
					<dt>Name</dt>
					<dd>{app.humanReadableName}</dd>
					<dt>Version</dt>
					<dd>{app.version}</dd>
					<dt>License</dt>
					<dd>{app.license}</dd>
				</dl>
			</Item>
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
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-auto-flow: column;
		grid-gap: calc(var(--padding) / 2) var(--padding);
		font-size: 0.75em;
	}
	dt {
		font-weight: bold;
		grid-column-start: 1;
	}
</style>
