<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from '$lib/credentials.js';
	import { age } from '$lib/time.js';
	import { listControlPlanes, createControlPlane, deleteControlPlane } from '$lib/client.js';

	import Modal from '$lib/Modal.svelte';
	import Breadcrumbs from '$lib/Breadcrumbs.svelte';
	import StatusHeader from '$lib/StatusHeader.svelte';
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
			<input id="name" placeholder="Name" required bind:value={newControlPlaneName} />
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
		<StatusHeader name={cp.status.name} status={statusFromResource(cp.status)}>
			<iconify-icon icon="mdi:favorite-border" />
			<DropDownIcon
				icon="mdi:dots-vertical"
				id={cp.status.name}
				items={dropdownItems}
				on:select={selected}
			/>
		</StatusHeader>
		<dl>
			<dt>Age</dt>
			<dd>{age(cp.status.creationTime)}</dd>
			<dt>Status</dt>
			<dd>{cp.status.status}</dd>
		</dl>
	</article>
{/each}

<style>
	article {
		border: 2px solid var(--brand);
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
</style>
