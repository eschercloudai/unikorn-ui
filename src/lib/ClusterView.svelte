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
	import { namedObjectFormatter } from '$lib/formatters.js';

	import SelectField from '$lib/SelectField.svelte';
	import ClusterCreateModal from '$lib/ClusterCreateModal.svelte';
	import ClusterUpdateModal from '$lib/ClusterUpdateModal.svelte';
	import View from '$lib/View.svelte';
	import ItemView from '$lib/ItemView.svelte';
	import ItemHeader from '$lib/ItemHeader.svelte';
	import ToolBar from '$lib/ToolBar.svelte';
	import Details from '$lib/Details.svelte';
	import Button from '$lib/Button.svelte';
	import Ribbon from '$lib/Ribbon.svelte';
	import Hint from '$lib/Hint.svelte';
	import Alert from '$lib/Alert.svelte';

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
	<ClusterCreateModal
		{controlPlane}
		{clusters}
		bind:active={createModalActive}
		on:created={clustersMutated}
	/>
{/if}

{#if editModalActive}
	<ClusterUpdateModal
		{controlPlane}
		{cluster}
		bind:active={editModalActive}
		on:updated={clustersMutated}
	/>
{/if}

<ToolBar>
	<Ribbon>
		<Button text="New" icon="material-symbols:add" on:message={showCreateModal} />

		<Details summary="Filters" icon="mdi:filter-outline">
			<SelectField
				id="control-plane-select"
				help="Filter clusters by control plane"
				formatter={namedObjectFormatter}
				options={controlPlanes}
				bind:value={controlPlane}
			/>
		</Details>
	</Ribbon>
</ToolBar>

<View>
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
		<Hint content="Select a cluster for more details and options." />

		<ItemView items={clusters}>
			<svelte:fragment slot="header" let:item>
				<ItemHeader
					name={item.name}
					status={statusFromResource(item.status)}
					alert={item.upgradable}
				/>
			</svelte:fragment>

			<svelte:fragment slot="main" let:item>
				<dl>
					<dt>Provisioning Status</dt>
					<dd>{item.status.status}</dd>

					<dt>Age</dt>
					<dd>{age(item.status.creationTime)}</dd>
				</dl>
			</svelte:fragment>

			<svelte:fragment slot="detail" let:item>
				{#if item.upgradable}
					<Alert content="Upgrade available" />
				{/if}
				<dl>
					<dt>Software Version</dt>
					{#if item.applicationBundle.preview}
						<dd>{item.applicationBundle.version} <span class="detail">Preview</span></dd>
					{:else if item.applicationBundle.endOfLife}
						<dd>
							{item.applicationBundle.version}
							<span class="detail"
								>EOL {new Date(item.applicationBundle.endOfLife).toDateString()}</span
							>
						</dd>
					{:else}
						<dd>{item.applicationBundle.version}</dd>
					{/if}
					<dt>Kubernetes Version</dt>
					<dd>{item.controlPlane.version}</dd>
					<dt>Workload Pools</dt>
					<dd>
						{#each item.workloadPools as pool}
							<Details summary={pool.name} icon="mdi:cogs">
								<dl>
									{#if pool.autoscaling}
										<dt>Minimum replicas</dt>
										<dd>{pool.autoscaling.minimumReplicas}</dd>
										<dt>Maximum replicas</dt>
										<dd>{pool.autoscaling.maximumReplicas}</dd>
									{:else}
										<dt>Replicas</dt>
										<dd>pool.machine.replicas</dd>
									{/if}
									<dt>Image</dt>
									<dd>{pool.machine.imageName}</dd>
									<dt>Flavor</dt>
									<dd>{pool.machine.flavorName}</dd>
									<dt>Disk</dt>
									<dd>{pool.machine.disk.size}GiB</dd>
									{#if pool.labels}
										<dt>Labels</dt>
										<dd>
											{Object.keys(pool.labels)
												.map((x) => `${x}=${pool.labels[x]}`)
												.join(',')}
										</dd>
									{/if}
								</dl>
							</Details>
						{/each}
					</dd>
				</dl>

				<hr />

				<Ribbon>
					<Button
						text="Download kubeconfig"
						icon="mdi:kubernetes"
						on:message={handleKubeconfig(item)}
					/>
					<Button text="Update" icon="mdi:square-edit-outline" on:message={handleEdit(item)} />
					<Button text="Delete" icon="mdi:delete" on:message={handleDelete(item)} />
				</Ribbon>
			</svelte:fragment>
		</ItemView>
	{/if}
</View>

<style>
	.detail {
		font-size: 0.75rem;
		color: var(--mid-grey);
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
</style>
