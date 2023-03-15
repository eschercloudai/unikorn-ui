<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from '$lib/credentials.js';
	import { age } from '$lib/time.js';
	import { listControlPlanes, deleteControlPlane } from '$lib/client.js';

	import Breadcrumbs from '$lib/Breadcrumbs.svelte';
	import StatusIcon from '$lib/StatusIcon.svelte';
	import DropDownIcon from '$lib/DropDownIcon.svelte';
	import CreateControlPlaneModal from '$lib/CreateControlPlaneModal.svelte';
	import EditControlPlaneModal from '$lib/EditControlPlaneModal.svelte';

	let controlPlanes = [];

	function reset() {
		controlPlanes = [];
	}

	// id is a unique identifier for the component instance.
	let id = Symbol();

	let ticker = null;

	onMount(() => {
		token.subscribe(id, updateControlPlanes);
		ticker = setInterval(updateControlPlanes, 10000);
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
				// This means the project hasn't been provisioned yet.
			}
		});

		if (result == null) {
			return;
		}

		controlPlanes = result;
	}

	function statusFromResource(status) {
		if (status.deletionTime) {
			return 'progressing';
		} else if (status.status == 'Provisioned') {
			return 'ok';
		} else if (['Provisioning', 'Deprovisioning', 'Updating'].includes(status.status)) {
			return 'progressing';
		} else if (['Unknown', 'Cancelled'].includes(status.status)) {
			return 'warning';
		} else {
			return 'error';
		}
	}

	// controlPlane defines the active CP for instance specific modals.
	let controlPlane = null;

	// Define dropdown callbacks.
	function handleDetails() {}

	let editModalActive = false;

	function handleEdit(cp) {
		controlPlane = cp;
		editModalActive = true;
	}

	async function handleDelete(cp) {
		await deleteControlPlane(cp.name, {
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		updateControlPlanes();
	}

	// Define the per-control plane drop down menu.
	let dropdownItems = [
		{ id: 'detail', value: 'Details', icon: 'bx:detail', handler: handleDetails },
		{ id: 'edit', value: 'Edit', icon: 'bx:edit', handler: handleEdit },
		{ id: 'delete', value: 'Delete', icon: 'bx:trash', handler: handleDelete }
	];

	let createModalActive = false;

	function showCreateModal() {
		createModalActive = true;
	}

	function controlPlanesMutated() {
		updateControlPlanes();
	}
</script>

{#if createModalActive}
	<CreateControlPlaneModal
		{controlPlanes}
		bind:active={createModalActive}
		on:created={controlPlanesMutated}
	/>
{/if}

{#if editModalActive}
	<EditControlPlaneModal
		{controlPlane}
		bind:active={editModalActive}
		on:updated={controlPlanesMutated}
	/>
{/if}

<Breadcrumbs />

<section>
	<p>Kubernetes control planes manage the lifecycle of Kubernetes clusters.</p>
	<details>
		<summary>Details</summary>
		<p>
			Kubernetes control planes manage Kubernetes cluster creation, updates, upgrades, and deletion.
			A Kubernetes cluster is managed by a single control plane, providing groupings of Kubernetes
			clusters.
		</p>
		<p>
			You may group clusters based on stability e.g. production, staging, development. This allows
			upgrades to be tested in a staging control plane before applying those changes to a production
			one.
		</p>
	</details>
</section>

<section>
	<button on:click={showCreateModal}>
		<iconify-icon icon="material-symbols:add" />
		<div>Create</div>
	</button>
</section>

{#each controlPlanes as cp}
	<article>
		<div class="title">
			<StatusIcon status={statusFromResource(cp.status)} />
			<div class="name">{cp.status.name}</div>
		</div>
		<div class="widgets">
			<DropDownIcon icon="mdi:dots-vertical" resource={cp} items={dropdownItems} />
		</div>
		<dl>
			<dt>Age:</dt>
			<dd>{age(cp.status.creationTime)}</dd>
			<dt>Status:</dt>
			<dd>{cp.status.status}</dd>
			<dt>Version:</dt>
			{#if cp.applicationBundle.preview}
				<dd>{cp.applicationBundle.version} (Preview)</dd>
			{:else if cp.applicationBundle.endOfLife}
				<dd>{cp.applicationBundle.version} (End-of-Life {cp.applicationBundle.endOfLife})</dd>
			{:else}
				<dd>{cp.applicationBundle.version}</dd>
			{/if}
		</dl>
	</article>
{/each}

<style>
	article {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-gap: var(--padding);
	}
	div.name {
		color: var(--brand);
		font-weight: bold;
	}
	div.title {
		display: flex;
		align-items: center;
		gap: var(--padding);
		grid-row: 1;
		grid-column: 1;
	}
	div.widgets {
		display: flex;
		align-items: center;
		gap: var(--padding);
		grid-row: 1;
		grid-column: 2;
	}
	dl {
		grid-row: 2;
		grid-column: 1 / -1;
		margin: 0;
		display: grid;
		grid-template-columns: auto 1fr;
		grid-auto-flow: column;
		grid-gap: calc(var(--padding) / 2) var(--padding);
	}
	dt {
		font-weight: bold;
		grid-column-start: 1;
	}
	dd {
		margin: 0;
	}
	@media only screen and (min-width: 720px) {
		article {
			grid-template-columns: auto 1fr auto;
		}
		div.widgets {
			grid-column: 3;
		}
		dl {
			grid-row: 1;
			grid-column: 2;
			display: flex;
			align-items: center;
		}
	}
</style>
