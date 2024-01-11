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
	import ItemHeader from '$lib/ItemHeader.svelte';
	import Info from '$lib/Info.svelte';
	import Hint from '$lib/Hint.svelte';
	import Alert from '$lib/Alert.svelte';
	import ToolBar from '$lib/ToolBar.svelte';
	import Button from '$lib/Button.svelte';
	import Ribbon from '$lib/Ribbon.svelte';
	import Version from '$lib/Version.svelte';

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

	{#if controlPlanes.length == 0}
		<Hint>
			No control planes found, select <em>New</em> to get started!
		</Hint>
	{:else}
		<Hint>Select a control plane for more details and options.</Hint>
	{/if}

	<ItemView items={controlPlanes}>
		<svelte:fragment slot="header" let:item>
			<ItemHeader
				name={item.name}
				status={statusFromResource(item.status)}
				alert={item.upgradable}
			/>
		</svelte:fragment>

		<svelte:fragment slot="main" let:item>
			<dl>
				<dt>Provisioning Status:</dt>
				<dd>{item.status.status}</dd>
				<dt>Age:</dt>
				<dd>{age(item.status.creationTime)}</dd>
			</dl>
		</svelte:fragment>

		<svelte:fragment slot="detail" let:item>
			{#if item.upgradable}
				<Alert content="Upgrade available" />
			{/if}
			<dl>
				<dt>Software Version:</dt>
				<dd>
					<Version
						version={item.applicationBundle.version}
						preview={item.applicationBundle.preview}
						endOfLife={item.applicationBundle.endOfLife}
					/>
				</dd>
			</dl>

			<hr />

			<Ribbon>
				<Button text="Update" icon="mdi:square-edit-outline" on:message={handleEdit(item)} />
				<Button
					text="Delete"
					icon="mdi:delete"
					disabled={item.status.status == 'Deprovisioning'}
					on:message={handleDelete(item)}
				/>
			</Ribbon>
		</svelte:fragment>
	</ItemView>
</View>
