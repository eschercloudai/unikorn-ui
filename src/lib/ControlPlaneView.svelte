<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from '$lib/credentials.js';
	import { age } from '$lib/time.js';
	import {
		createProject,
		listControlPlanes,
		createControlPlane,
		deleteControlPlane,
		listApplicationBundlesControlPlane
	} from '$lib/client.js';

	import Modal from '$lib/Modal.svelte';
	import Breadcrumbs from '$lib/Breadcrumbs.svelte';
	import StatusIcon from '$lib/StatusIcon.svelte';
	import DropDownIcon from '$lib/DropDownIcon.svelte';

	let controlPlanes = [];
	let applicationBundles = [];
	let applicationBundle = null;

	function reset() {
		controlPlanes = [];
		applicationBundles = [];
		applicationBundle = null;
	}

	// id is a unique identifier for the component instance.
	let id = Symbol();

	let ticker = null;

	onMount(() => {
		token.subscribe(id, updateAll);
		ticker = setInterval(updateControlPlanes, 10000);
	});

	onDestroy(() => {
		clearInterval(ticker);
		token.unsubscribe(id);
	});

	async function updateAll() {
		updateControlPlanes();
		updateApplicationBundles();
	}

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

	async function updateApplicationBundles() {
		let t = token.get();

		if (t == null || t.scope == token.unscoped) {
			reset();
			return;
		}

		const result = await listApplicationBundlesControlPlane({
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		if (result == null) {
			return;
		}

		// These are returned in ascending order, we want latest first.
		applicationBundles = result.reverse();
	}

	// Update the selected application bundle when the bundles list updates.
	$: if (applicationBundles.length != 0 && applicationBundle == null) {
		for (const b of applicationBundles) {
			if (!b.preview && !b.endOfLife) {
				applicationBundle = b;
				break;
			}
		}
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
		{ id: 'delete', value: 'Delete', icon: 'mdi:delete' }
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
		await createProject({
			token: token.get().token,
			onConflict: () => {
				// this is fine.
			},
			onUnauthorized: () => {
				token.remove();
			}
		});

		const body = {
			name: newControlPlaneName,
			applicationBundle: applicationBundle.name
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

		updateControlPlanes();
	}
</script>

<Modal active={createModalActive}>
	<form>
		<h2>Create New Control Plane</h2>
		<input
			id="name"
			type="text"
			placeholder="Control plane name"
			required
			bind:value={newControlPlaneName}
		/>
		<label for="name">Must be unique, contain only characters, numbers and dashes.</label>

		<details>
			<summary>Lifecycle (Advanced)</summary>
			<p>
				The platform will automatically upgrade control planes to provide confidence in security,
				and periodically enable new features. This section describes those defaults and, where
				applicable, allows you to fine tune those settings.
			</p>

			<select id="appbundle" bind:value={applicationBundle}>
				{#each applicationBundles as b}
					{#if b.preview}
						<option value={b}>{b.version} (Preview)</option>
					{:else if b.endOfLife}
						<option value={b}>{b.version} (End-of-Life {b.endOfLife})</option>
					{:else}
						<option value={b}>{b.version}</option>
					{/if}
				{/each}
			</select>
			<label for="appbundle">
				Selects the control plane version. Versions marked as <em>Preview</em> are early release
				candidates, and may have undergone less rigorous testing. Versions marked
				<em>End-of-Life</em> indicate the date when they will be automatically upgraded by the platform.
			</label>
		</details>

		<div class="buttons">
			<button
				type="submit"
				on:click={submitCreateControlPlane}
				on:keydown={submitCreateControlPlane}
			>
				<iconify-icon icon="mdi:tick" />
				<div>Submit</div>
			</button>
			<button on:click={toggleCreateModal}>
				<iconify-icon icon="mdi:close" />
				<div>Cancel</div>
			</button>
		</div>
	</form>
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
			You may group clusters based on stability e.g. production, staging, development. This allows
			upgrades to be tested in a staging control plane before applying those changes to a production
			one.
		</p>
	</details>
</section>

<section>
	<button on:click={toggleCreateModal}>
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
			<dt>Version:</dt>
			<dd>{cp.applicationBundle}</dd>
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
	div.buttons {
		display: flex;
		justify-content: center;
		gap: var(--padding);
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
		align-items: stretch;
		padding: var(--padding);
		gap: var(--padding);
	}
	form label {
		display: block;
		font-style: italic;
		font-size: 0.75rem;
	}
	form label > em {
		font-weight: bold;
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
