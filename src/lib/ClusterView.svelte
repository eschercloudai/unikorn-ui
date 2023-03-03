<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { token } from '$lib/credentials.js';
	import { age } from '$lib/time.js';
	import {
		listControlPlanes,
		listClusters,
		deleteCluster,
		getClusterKubeconfig
	} from '$lib/client.js';

	import Breadcrumbs from '$lib/Breadcrumbs.svelte';
	import StatusIcon from '$lib/StatusIcon.svelte';
	import DropDownIcon from '$lib/DropDownIcon.svelte';
	import LabeledInput from '$lib/LabeledInput.svelte';
	import CreateClusterModal from '$lib/CreateClusterModal.svelte';

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
		if (status.deletionTime) {
			return 'progressing';
		} else if (status.status == 'Provisioned') {
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
		{ id: 'detail', value: 'Show Details', icon: 'bx:detail' },
		{ id: 'kubeconfig', value: 'Download Kubeconfig', icon: 'mdi:kubernetes' },
		{ id: 'delete', value: 'Delete', icon: 'mdi:delete' }
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
			return;
		}

		if (event.detail.item.id == 'kubeconfig') {
			const blob = await getClusterKubeconfig(controlPlane.status.name, event.detail.id, {
				token: token.get().token,
				onUnauthorized: () => {
					token.remove();
				}
			});

			if (blob == null) {
				return;
			}

			if (browser) {
				const url = window.URL.createObjectURL(blob);

				const a = document.createElement('a');
				a.style.display = 'none';
				a.href = url;
				a.download = `kubeconfig-${event.detail.id}.yaml`;

				document.body.appendChild(a);
				a.click();

				window.URL.revokeObjectURL(url);
			}
		}
	}

	let createModalActive = false;

	function toggleCreateModal() {
		createModalActive = !createModalActive;
	}

	function clusterCreated() {
		updateClusters();
	}
</script>

<CreateClusterModal
	bind:active={createModalActive}
	{controlPlane}
	on:clusterCreated={clusterCreated}
/>

<Breadcrumbs />

<LabeledInput id="control-plane-select" value="Control Plane to display clusters for">
	<select id="control-plane-select" bind:value={controlPlane} on:change={updateClusters}>
		{#each controlPlanes as choice}
			<option value={choice}>{choice.status.name}</option>
		{/each}
	</select>
</LabeledInput>

{#if controlPlanes.length == 0}
	<section class="sad-kitty">
		<iconify-icon icon="emojione:crying-cat-face" />
		<p>No control planes found. Create one first to enable cluster creation.</p>
	</section>
{:else}
	<section>
		<button on:click={toggleCreateModal}>
			<iconify-icon icon="material-symbols:add" />
			<div>Create</div>
		</button>
	</section>

	{#each clusters as cl}
		<article>
			<div class="title">
				<StatusIcon status={statusFromResource(cl.status)} />
				<div class="name">{cl.status.name}</div>
			</div>
			<div class="widgets">
				<DropDownIcon
					icon="mdi:dots-vertical"
					id={cl.status.name}
					items={dropdownItems}
					on:select={selected}
				/>
			</div>
			<dl>
				<dt>Age:</dt>
				<dd>{age(cl.status.creationTime)}</dd>
				<dt>Status:</dt>
				<dd>{cl.status.status}</dd>
				<dt>Kubernetes:</dt>
				<dd>{cl.controlPlane.version}</dd>
			</dl>
		</article>
	{/each}
{/if}

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
	}
	section.sad-kitty {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	section.sad-kitty iconify-icon {
		font-size: 5rem;
	}
	section.sad-kitty p {
		color: var(--mid-grey);
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
