<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from '$lib/credentials.js';
	import { age } from '$lib/time.js';
	import { listControlPlanes, createControlPlane, deleteControlPlane } from '$lib/client.js';

	import Modal from '$lib/Modal.svelte';
	import Breadcrumbs from '$lib/Breadcrumbs.svelte';
	import StatusIcon from '$lib/StatusIcon.svelte';
	import DropDownIcon from '$lib/DropDownIcon.svelte';

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
				reset();
			}
		});

		if (result == null) {
			return;
		}

		controlPlanes = result;
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
			await deleteControlPlane(event.detail.id, {
				token: token.get().token,
				onUnauthorized: () => {
					token.remove();
				}
			});

			updateControlPlanes();
		}
	}

	let createModalActive = false;

	function toggleCreateModal() {
		createModalActive = !createModalActive;
	}

	let newControlPlaneName = null;

	async function submitCreateControlPlane() {
		const body = {
			name: newControlPlaneName
		};

		await createControlPlane({
			token: token.get().token,
			body: body,
			onBadRequest: () => {
				console.log('you have made a mistake');
			},
			onUnauthorized: () => {
				token.remove();
			},
			onConflict: () => {
				console.log('visual feedback on name clash');
			}
		});

		newControlPlaneName = null;

		createModalActive = false;
	}
</script>

<Modal active={createModalActive}>
	<div class="modal-content">
		<h2>Create New Control Plane</h2>
		<form>
			<input
				id="name"
				type="text"
				placeholder="Control plane name"
				required
				bind:value={newControlPlaneName}
			/>
			<label for="name">Must be unique, contain only characters, numbers and dashes.</label>
			<div>
				<button
					type="submit"
					on:click={submitCreateControlPlane}
					on:keydown={submitCreateControlPlane}>Submit</button
				>
				<button on:click={toggleCreateModal}>Cancel</button>
			</div>
		</form>
	</div>
</Modal>

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
			You may group clusters based on stability e.g. prodiction, staging, development. This allows
			upgrades to be tested in a staging control plane before applying those changes to a production
			one.
		</p>
	</details>
</section>

<button on:click={toggleCreateModal}>Create</button>

{#each controlPlanes as cp}
	<article>
		<div class="title">
			<StatusIcon status={statusFromResource(cp.status)} />
			<div class="name">{cp.status.name}</div>
		</div>
		<div class="widgets">
			<DropDownIcon
				icon="mdi:dots-vertical"
				id={cp.status.name}
				items={dropdownItems}
				on:select={selected}
			/>
		</div>
		<dl>
			<dt>Age:</dt>
			<dd>{age(cp.status.creationTime)}</dd>
			<dt>Status:</dt>
			<dd>{cp.status.status}</dd>
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
	form {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--padding);
	}
	form label {
		display: block;
		font-style: italic;
		font-size: 0.75rem;
	}
	div.modal-content {
		padding: var(--padding);
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
