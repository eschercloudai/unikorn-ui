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

	import ControlPlaneCreateModal from '$lib/ControlPlaneCreateModal.svelte';
	import ControlPlaneUpdateModal from '$lib/ControlPlaneUpdateModal.svelte';
	import View from '$lib/View.svelte';
	import ItemView from '$lib/ItemView.svelte';
	import Item from '$lib/Item.svelte';
	import ItemHeader from '$lib/ItemHeader.svelte';
	import Info from '$lib/Info.svelte';
	import Hint from '$lib/Hint.svelte';
	import Alert from '$lib/Alert.svelte';
	import ToolBar from '$lib/ToolBar.svelte';
	import Button from '$lib/Button.svelte';
	import Ribbon from '$lib/Ribbon.svelte';

	let accessToken;

	let controlPlanes = [];

	let selected = null;

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

		if (selected) {
			const results = controlPlanes.filter((x) => x.name == selected.name);

			selected = results[0];
		}
	}

	$: updateControlPlanes(accessToken);

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

	let createModalActive = false;

	function showCreateModal() {
		createModalActive = true;
	}

	function controlPlanesMutated() {
		updateControlPlanes(accessToken);
	}

	function select(event) {
		selected = selected == event.detail.context ? null : event.detail.context;
	}
</script>

{#if createModalActive}
	<ControlPlaneCreateModal
		{controlPlanes}
		bind:active={createModalActive}
		on:created={controlPlanesMutated}
	/>
{/if}

{#if editModalActive}
	<ControlPlaneUpdateModal
		{controlPlane}
		bind:active={editModalActive}
		on:updated={controlPlanesMutated}
	/>
{/if}

<ToolBar>
	<Ribbon>
		<Button text="New" icon="material-symbols:add" on:message={showCreateModal} />
	</Ribbon>
</ToolBar>

<View>
	<Info summary="Click to learn more about control planes">
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
	</Info>

	<Hint content="Select a control plane for more details and options." />

	<ItemView>
		{#each controlPlanes as cp}
			<Item selected={cp == selected} context={cp} on:message={select}>
				<ItemHeader name={cp.name} status={statusFromResource(cp.status)} alert={cp.upgradable} />
				<dl>
					<dt>Provisioning Status:</dt>
					<dd>{cp.status.status}</dd>
					<dt>Age:</dt>
					<dd>{age(cp.status.creationTime)}</dd>
				</dl>
			</Item>
			{#if cp == selected}
				<Item jumbo="true" selected="true">
					{#if cp.upgradable}
						<Alert content="Upgrade available" />
					{/if}
					<dl>
						<dt>Software Version:</dt>
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

					<hr />

					<Ribbon>
						<Button text="Update" icon="mdi:square-edit-outline" on:message={handleEdit(cp)} />
						<Button text="Delete" icon="mdi:delete" on:message={handleDelete(cp)} />
					</Ribbon>
				</Item>
			{/if}
		{/each}
	</ItemView>
</View>
