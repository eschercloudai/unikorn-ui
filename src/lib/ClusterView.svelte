<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from '$lib/credentials.js';
	import { age } from '$lib/time.js';
	import { listControlPlanes, listClusters, deleteCluster } from '$lib/client.js';

	import Breadcrumbs from '$lib/Breadcrumbs.svelte';
	import StatusHeader from '$lib/StatusHeader.svelte';
	import DropDownIcon from '$lib/DropDownIcon.svelte';

	let controlPlanes = [];
	let controlPlane = null;
	let clusters = [];

	function reset() {
		controlPlanes = [];
		controlPlane = null;
		clusters = [];
	}

	// id is a unique identifier for the component instance.
	let id = Symbol();

	// ticker does periodic updates.
	let ticker = null;

	onMount(() => {
		token.subscribe(id, updateControlPlanes);
		ticker = setInterval(updateClusters, 10000);
	});

	onDestroy(() => {
		clearInterval(ticker);
		token.unsubscribe(id);
	});

	async function updateControlPlanes() {
		let t = token.get();

		if (t == null || t.scope == token.unscoped) {
			reset();
			return;
		}

		const result = await listControlPlanes({
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			},
			onNotFound: () => {
				reset();
			}
		});

		if (result == null) {
			return;
		}

		controlPlanes = result;

		if (controlPlanes.length != 0) {
			controlPlane = controlPlanes[0];

			updateClusters();
		}
	}

	async function updateClusters() {
		if (controlPlane == null) {
			return;
		}

		const result = await listClusters(controlPlane.status.name, {
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		if (result == null) {
			return;
		}

		clusters = result;
	}

	function statusFromResource(status) {
		if (status.status == 'Provisioned') {
			return 'ok';
		} else if (['Provisioning', 'Deprovisioning'].includes(status.status)) {
			return 'progressing';
		} else if (['Unknown', 'Cancelled'].includes(status.status)) {
			return 'warning';
		} else {
			return 'error';
		}
	}

	// Define the per-control plane drop down menu.
	let dropdownItems = [
		{ id: 'detail', value: 'Show Details' },
		{ id: 'delete', value: 'Delete' }
	];

	async function selected(event) {
		if (event.detail.item.id == 'delete') {
			await deleteCluster(controlPlane.status.name, event.detail.id, {
				token: token.get().token,
				onUnauthorized: () => {
					token.remove();
				}
			});

			updateClusters();
		}
	}
</script>

<Breadcrumbs />

<div class="selection">
	<label for="control-plane-select">Control Plane:</label>
	<select id="control-plane-select" bind:value={controlPlane} on:change={updateClusters}>
		{#each controlPlanes as choice}
			<option value={choice}>{choice.status.name}</option>
		{/each}
	</select>
</div>

{#each clusters as cl}
	<article>
		<StatusHeader name={cl.status.name} status={statusFromResource(cl.status)}>
			<iconify-icon icon="mdi:favorite-border" />
			<DropDownIcon
				icon="mdi:dots-vertical"
				id={cl.status.name}
				items={dropdownItems}
				on:select={selected}
			/>
		</StatusHeader>
		<dl>
			<dt>Age</dt>
			<dd>{age(cl.status.creationTime)}</dd>
			<dt>Status</dt>
			<dd>{cl.status.status}</dd>
			<dt>Kubernetes Version</dt>
			<dd>{cl.controlPlane.version}</dd>
		</dl>
	</article>
{/each}

<style>
	article {
		border: 1px outset var(--brand);
		border-radius: var(--radius);
		box-shadow: 0.25em 0.25em var(--shadow-radius) var(--mid-grey);
	}
	dt {
		font-weight: bold;
	}
	dd {
		margin: 0;
	}
	dd:not(:last-child) {
		margin-bottom: var(--padding);
	}
	.selection {
		display: flex;
		align-items: center;
		padding: var(--padding);
		border-bottom: 1px solid var(--brand);
	}
	.selection select {
		margin-left: 0.5em;
	}
	@media only screen and (min-width: 720px) {
		dl {
			display: grid;
			grid-auto-flow: column;
			grid-template-rows: auto auto;
		}
		dd:not(:last-child) {
			margin-bottom: 0;
		}
	}
</style>
