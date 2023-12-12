<script>
	import { onDestroy } from 'svelte';
	import { lt } from 'semver';
	import { browser } from '$app/environment';
	import { token, removeCredentials } from '$lib/credentials.js';
	import { age } from '$lib/time.js';
	import {
		listControlPlanes,
		listClusters,
		deleteCluster,
		getClusterKubeconfig,
		listApplicationBundlesCluster
	} from '$lib/client.js';

	import StatusIcon from '$lib/StatusIcon.svelte';
	import DropDownIcon from '$lib/DropDownIcon.svelte';
	import LabeledInput from '$lib/LabeledInput.svelte';
	import CreateClusterModal from '$lib/CreateClusterModal.svelte';
	import EditClusterModal from '$lib/EditClusterModal.svelte';
	import View from '$lib/View.svelte';
	import ItemView from '$lib/ItemView.svelte';
	import Item from '$lib/Item.svelte';

	let accessToken;

	let controlPlanes = [];
	let controlPlane = null;
	let clusters = [];

	const tokenUnsubscribe = token.subscribe(changeToken);

	const ticker = setInterval(() => clustersMutated(), 10000);

	onDestroy(() => {
		clearInterval(ticker);
		tokenUnsubscribe();
	});

	function changeToken(value) {
		// If the token changes, then we need to purge the control plane at least
		// as that will trigger a refresh of the clusters, and doing so may provision
		// an existing control plane in the new project.
		controlPlanes = [];
		controlPlane = null;
		clusters = [];

		accessToken = value;
	}

	async function updateControlPlanes(accessToken) {
		if (accessToken == null) {
			controlPlanes = [];
			controlPlane = null;
			return;
		}

		const result = await listControlPlanes({
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
			}
		});

		if (result == null) {
			return;
		}

		controlPlanes = result;

		let newControlPlane = null;

		// If we have an existing control plane selected, then try and retain
		// that one, it'll get annoying if we select a random one every refresh.
		if (controlPlane) {
			newControlPlane = controlPlanes.find((x) => x.name == controlPlane.name);
		}

		// If there is no control plane selected, then pick one, these will be
		// sorted by name.
		// TODO: add some session state to preserve this?
		if (!newControlPlane && controlPlanes.length != 0) {
			newControlPlane = controlPlanes[0];
		}

		controlPlane = newControlPlane;
	}

	$: updateControlPlanes(accessToken);

	// TODO: clusters update should rely on application bundles, saving API traffic.
	async function updateClusters(accessToken, controlPlane) {
		if (accessToken == null || controlPlane == null) {
			clusters = [];
			return;
		}

		const result = await listClusters(controlPlane.status.name, {
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
			}
		});

		if (result == null) {
			return;
		}

		if (result.length == 0) {
			clusters = [];
			return;
		}

		const bresult = await listApplicationBundlesCluster({
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
			}
		});

		if (bresult == null) {
			return;
		}

		const bundles = bresult.reverse().filter((x) => !x.endOfLife && !x.preview);

		for (const cluster of result) {
			if (lt(cluster.applicationBundle.version, bundles[0].version)) {
				cluster.upgradable = true;
			}
		}

		clusters = result;
	}

	$: updateClusters(accessToken, controlPlane);

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

	// Define dropdown callback handlers.
	async function handleKubeconfig(cl) {
		const blob = await getClusterKubeconfig(controlPlane.name, cl.name, {
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
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
			a.download = `kubeconfig-${cl.name}.yaml`;

			document.body.appendChild(a);
			a.click();

			window.URL.revokeObjectURL(url);
		}
	}

	// cluster defines the cluster subject to edit/details views.
	let cluster = null;

	let editModalActive = false;

	function handleEdit(cl) {
		cluster = cl;
		editModalActive = true;
	}

	async function handleDelete(cl) {
		await deleteCluster(controlPlane.name, cl.name, {
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
			}
		});

		updateClusters(accessToken, controlPlane);
	}

	// Define the per-control plane drop down menu.
	let dropdownItems = [
		{
			id: 'kubeconfig',
			value: 'Kubeconfig',
			icon: 'mdi:kubernetes',
			handler: handleKubeconfig,
			disablable: true
		},
		{ id: 'edit', value: 'Update', icon: 'bx:edit', handler: handleEdit },
		{ id: 'delete', value: 'Delete', icon: 'bx:trash', handler: handleDelete }
	];

	let createModalActive = false;

	function showCreateModal() {
		createModalActive = true;
	}

	// Clusters can implictly create control planes, so update these first before
	// listing clusters in them.  Additionally, when deleting a control plane, and
	// doing a cascading delete, it's possible that polling for a cluster on a
	// cached control plane will bring the control plane back to life magically!
	// NOTE: The control plane update will trigger a reload of the clusters.
	async function clustersMutated() {
		await updateControlPlanes(accessToken);
	}
</script>

{#if createModalActive}
	<CreateClusterModal
		{controlPlane}
		{clusters}
		bind:active={createModalActive}
		on:created={clustersMutated}
	/>
{/if}

{#if editModalActive}
	<EditClusterModal
		{controlPlane}
		{cluster}
		bind:active={editModalActive}
		on:updated={clustersMutated}
	/>
{/if}

<div class="tools">
	<LabeledInput id="control-plane-select" value="Control Plane to display clusters for">
		<select
			id="control-plane-select"
			bind:value={controlPlane}
			on:change={() => updateClusters(accessToken, controlPlane)}
		>
			{#each controlPlanes as choice}
				<option value={choice}>
					{choice.name}
					{#if choice.status.deletionTime}
						(Deleting...)
					{/if}
				</option>
			{/each}
		</select>
	</LabeledInput>
</div>

<View>
	<section class="buttons">
		<button on:click={showCreateModal}>
			<iconify-icon icon="material-symbols:add" />
			<div>Create</div>
		</button>
	</section>

	{#if controlPlanes.length == 0 || clusters.length == 0}
		<section class="sad-kitty">
			<img src="img/sad.png" alt="A sad kitty" />
			<div class="attribution">
				<a
					href="https://www.freepik.com/free-vector/cute-cat-crying-cartoon-vector-icon-illustration-animal-nature-icon-concept-isolated-premium-vector_30924706.htm#query=cat%20sad&position=0&from_view=author"
					>Image by catalyststuff</a
				>
				on Freepik
			</div>

			{#if controlPlanes.length == 0}
				<p>
					No control planes found. Either create a cluster to provision a default one (defaults to
					latest version with auto-upgrade enabled), or create a control plane manually.
				</p>
			{:else}
				<p>No clusters found, create one to begin!</p>
			{/if}
		</section>
	{:else}
		<ItemView>
			{#each clusters as cl}
				<Item>
					<div class="header">
						<StatusIcon status={statusFromResource(cl.status)} />
						<div class="name">{cl.status.name}</div>
						<div class="widgets">
							{#if cl.upgradable}
								<iconify-icon class="upgrade" icon="material-symbols:upgrade-rounded" />
							{/if}
							<DropDownIcon
								icon="mdi:dots-vertical"
								resource={cl}
								items={dropdownItems}
								disabled={cl.status.status != 'Provisioned'}
							/>
						</div>
					</div>
					<dl>
						<dt>Age:</dt>
						<dd>{age(cl.status.creationTime)}</dd>
						<dt>Status:</dt>
						<dd>{cl.status.status}</dd>
						<dt>Version:</dt>
						{#if cl.applicationBundle.preview}
							<dd>{cl.applicationBundle.version} <span class="detail">Preview</span></dd>
						{:else if cl.applicationBundle.endOfLife}
							<dd>
								{cl.applicationBundle.version}
								<span class="detail"
									>EOL {new Date(cl.applicationBundle.endOfLife).toDateString()}</span
								>
							</dd>
						{:else}
							<dd>{cl.applicationBundle.version}</dd>
						{/if}
						<dt>Kubernetes:</dt>
						<dd>{cl.controlPlane.version}</dd>
					</dl>
				</Item>
			{/each}
		</ItemView>
	{/if}
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
		align-content: space-between;
		align-items: center;
		gap: var(--padding);
	}
	.tools {
		background-color: var(--overlay);
		padding: var(--padding);
		border-bottom: 1px solid var(--brand);
	}
	div.name {
		color: var(--brand);
		font-weight: bold;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	div.widgets {
		display: flex;
		align-items: center;
	}
	section.sad-kitty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--padding);
	}
	section.sad-kitty > img {
		max-width: 200px;
		padding-right: 40px;
	}
	section.sad-kitty p {
		color: var(--mid-grey);
	}
	.attribution {
		font-size: 0.75em;
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
	.buttons {
		display: flex;
		gap: var(--padding);
	}
</style>
