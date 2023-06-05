<script>
	import { onDestroy } from 'svelte';
	import { lt } from 'semver';
	import { token, removeCredentials } from '$lib/credentials.js';
	import { age } from '$lib/time.js';
	import {
		listControlPlanes,
		deleteControlPlane,
		listApplicationBundlesControlPlane
	} from '$lib/client.js';

	import StatusIcon from '$lib/StatusIcon.svelte';
	import DropDownIcon from '$lib/DropDownIcon.svelte';
	import CreateControlPlaneModal from '$lib/CreateControlPlaneModal.svelte';
	import EditControlPlaneModal from '$lib/EditControlPlaneModal.svelte';
	import View from '$lib/View.svelte';
	import ItemView from '$lib/ItemView.svelte';
	import Item from '$lib/Item.svelte';

	let accessToken;

	let controlPlanes = [];

	const tokenUnsubscribe = token.subscribe(changeToken);

	const ticker = setInterval(() => updateControlPlanes(accessToken), 10000);

	onDestroy(() => {
		clearInterval(ticker);
		tokenUnsubscribe();
	});

	function changeToken(value) {
		accessToken = value;
	}

	// TODO: control planes update should rely on application bundles, saving API traffic.
	async function updateControlPlanes(accessToken) {
		if (accessToken == null) {
			controlPlanes = [];
			return;
		}

		const bresult = await listApplicationBundlesControlPlane({
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
			}
		});

		if (bresult == null) {
			return;
		}

		const bundles = bresult.reverse().filter((x) => !x.endOfLife && !x.preview);

		const result = await listControlPlanes({
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
			},
			onNotFound: () => {
				// This means the project hasn't been provisioned yet.
			}
		});

		if (result == null) {
			return;
		}

		for (const cp of result) {
			if (lt(cp.applicationBundle.version, bundles[0].version)) {
				cp.upgradable = true;
			}
		}

		controlPlanes = result;
	}

	$: updateControlPlanes(accessToken);

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
	let editModalActive = false;

	function handleEdit(cp) {
		controlPlane = cp;
		editModalActive = true;
	}

	async function handleDelete(cp) {
		await deleteControlPlane(cp.name, {
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
			}
		});

		updateControlPlanes(accessToken);
	}

	// Define the per-control plane drop down menu.
	let dropdownItems = [
		{ id: 'edit', value: 'Edit', icon: 'bx:edit', handler: handleEdit, disablable: true },
		{ id: 'delete', value: 'Delete', icon: 'bx:trash', handler: handleDelete }
	];

	let createModalActive = false;

	function showCreateModal() {
		createModalActive = true;
	}

	function controlPlanesMutated() {
		updateControlPlanes(accessToken);
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

<View>
	<section class="blurb">
		<p>Kubernetes control planes manage the lifecycle of Kubernetes clusters.</p>
		<details>
			<summary>What are Control Planes?</summary>
			<section>
				<p>
					Kubernetes control planes manage Kubernetes cluster creation, updates, upgrades, and
					deletion. A Kubernetes cluster is managed by a single control plane, providing groupings
					of Kubernetes clusters.
				</p>
				<p>
					You may group clusters based on stability e.g. production, staging, development. This
					allows upgrades to be tested in a staging control plane before applying those changes to a
					production one.
				</p>
			</section>
		</details>
	</section>

	<section class="buttons">
		<button on:click={showCreateModal}>
			<iconify-icon icon="material-symbols:add" />
			<div>Create</div>
		</button>
	</section>

	<ItemView>
		{#each controlPlanes as cp}
			<Item>
				<div class="header">
					<div class="title">
						<StatusIcon status={statusFromResource(cp.status)} />
						<div class="name">{cp.status.name}</div>
					</div>
					<div class="widgets">
						{#if cp.upgradable}
							<iconify-icon class="upgrade" icon="material-symbols:upgrade-rounded" />
						{/if}
						<DropDownIcon
							icon="mdi:dots-vertical"
							resource={cp}
							items={dropdownItems}
							disabled={cp.status.status != 'Provisioned'}
						/>
					</div>
				</div>
				<dl>
					<dt>Age:</dt>
					<dd>{age(cp.status.creationTime)}</dd>
					<dt>Status:</dt>
					<dd>{cp.status.status}</dd>
					<dt>Version:</dt>
					{#if cp.applicationBundle.preview}
						<dd>{cp.applicationBundle.version} <span class="detail">(Preview)</span></dd>
					{:else if cp.applicationBundle.endOfLife}
						<dd>
							{cp.applicationBundle.version}
							<span class="detail"
								>EOL {new Date(cp.applicationBundle.endOfLife).toDateString()}</span
							>
						</dd>
					{:else}
						<dd>{cp.applicationBundle.version}</dd>
					{/if}
				</dl>
			</Item>
		{/each}
	</ItemView>
</View>

<style>
	iconify-icon {
		font-size: var(--icon-size);
	}
	.upgrade {
		color: var(--error);
	}
	.header {
		display: flex;
	}
	div.name {
		color: var(--brand);
		font-weight: bold;
	}
	div.title {
		display: flex;
		align-items: center;
		gap: var(--padding);
		flex: 1;
	}
	div.widgets {
		display: flex;
		align-items: center;
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
	dd span.detail {
		font-size: 0.75rem;
		color: var(--mid-grey);
	}
	.blurb {
		display: flex;
		flex-direction: column;
		gap: var(--padding);
	}
	.buttons {
		display: flex;
		gap: var(--padding);
	}
</style>
