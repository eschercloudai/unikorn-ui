<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from '$lib/credentials.js';
	import { age } from '$lib/time.js';
	import {
		listControlPlanes,
		listClusters,
		listFlavors,
		listImages,
		listKeyPairs,
		listComputeAvailabilityZones,
		listBlockStorageAvailabilityZones,
		listExternalNetworks,
		createApplicationCredential,
		deleteApplicationCredential,
		createCluster,
		deleteCluster
	} from '$lib/client.js';

	import Modal from '$lib/Modal.svelte';
	import Breadcrumbs from '$lib/Breadcrumbs.svelte';
	import StatusHeader from '$lib/StatusHeader.svelte';
	import DropDownIcon from '$lib/DropDownIcon.svelte';
	import LabeledInput from '$lib/LabeledInput.svelte';
	import WorkloadPoolCreate from '$lib/WorkloadPoolCreate.svelte';

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

		// Kick off other requests to hide the latency while
		// we work out caching.
		updateKeyPairs();
		updateImages();
		updateFlavors();
		updateComputeAZs();
		updateBlockStorageAZs();
		updateExternalNetworks();
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

	function appCredName(clusterName) {
		return `${controlPlane.status.name}-${clusterName}`;
	}

	async function selected(event) {
		if (event.detail.item.id == 'delete') {
			await deleteCluster(controlPlane.status.name, event.detail.id, {
				token: token.get().token,
				onUnauthorized: () => {
					token.remove();
				}
			});

			updateClusters();
		}
	}

	let name;

	// On creation we only consider a single version.
	let versions = [];
	let version;

	// Images are a one size fits all for simplicity.
	let allImages = [];
	let images = [];
	let image;

	// All flavors (for worker nodes).
	let flavors = [];

	// Control plane flavors are limited to non-GPU.
	let cpFlavors = [];
	let flavor;

	let replicas = 3;

	let keyPairs = [];
	let keyPair;

	let disk = 50;

	// Network options.
	let nodePrefix;
	let podPrefix;
	let servicePrefix;
	let dnsNameservers;
	let allowedPrefixes;
	let sans;

	let autoscaling = false;

	let workloadPools = [];

	addPool();

	function addPool() {
		// Create an object to bind the WorkloadPoolCreate component to.
		let object = {};

		workloadPools.push(object);
		workloadPools = workloadPools;
	}

	function removePool(index) {
		workloadPools.splice(index, 1);
		workloadPools = workloadPools;
	}

	// Get a list of images from the origin, and derive a list of
	// Kubernetes versions.
	async function updateImages() {
		const results = await listImages({
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		// Find a unique set of versions...
		const v = new Set();

		for (const result of results) {
			v.add(result.versions.kubernetes);
		}

		// ... then list them in reverse order (newest first).
		versions = Array.from(v.values()).sort().reverse();
		version = versions[0];

		// Sort by date, newest first.
		results.sort((a, b) => a.creationTime < b.creationTime);

		allImages = results;
	}

	// When images update, or the version, then trigger an update to the
	// version filtered view of images.
	$: if (allImages.length > 0 && version != null) {
		let i = [];

		for (const image of allImages) {
			if (image.versions.kubernetes == version) {
				i.push(image);
			}
		}

		images = i;
		image = images[0];
	}

	async function updateFlavors() {
		const results = await listFlavors({
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		results.sort((a, b) => a.name < b.name);

		const cpf = [];

		for (const result of results) {
			if (result.gpus == null) {
				cpf.push(result);
			}
		}

		cpFlavors = cpf;
		flavor = cpf[0];

		flavors = results;
	}

	async function updateKeyPairs() {
		const results = await listKeyPairs({
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		// Don't pick a value, it's secure by default.
		keyPairs = results;
	}

	let computeAZs = [];
	let blockStorageAZs = [];
	let externalNetworks = [];

	async function updateComputeAZs() {
		const results = await listComputeAvailabilityZones({
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		computeAZs = results;
	}

	async function updateBlockStorageAZs() {
		const results = await listBlockStorageAvailabilityZones({
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		blockStorageAZs = results;
	}

	async function updateExternalNetworks() {
		const results = await listExternalNetworks({
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		externalNetworks = results;
	}

	let createModalActive = false;

	function toggleCreateModal() {
		createModalActive = !createModalActive;
	}

	async function submitCreateCluster() {
		// TODO: sanity checking/validation before doing anything
		// potentially destructive!

		// Delete an existing application credential that may be
		// in the way.
		// TODO: we should garbage collect these after cluster deprovision
		// but that's somewhat difficult.
		await deleteApplicationCredential(appCredName(name), {
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			},
			onNotFound: () => {}
		});

		let ac = await createApplicationCredential({
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			},
			body: {
				name: appCredName(name)
			}
		});

		if (ac == null) {
			return;
		}

		const body = {
			name: name,
			openstack: {
				applicationCredentialID: ac.id,
				applicationCredentialSecret: ac.secret,
				computeAvailabilityZone: computeAZs[0].name,
				volumeAvailabilityZone: blockStorageAZs[0].name,
				externalNetworkID: externalNetworks[0].id
			},
			network: {
				nodePrefix: nodePrefix ? nodePrefix : '192.168.0.0/16',
				servicePrefix: servicePrefix ? servicePrefix : '172.16.0.0/12',
				podPrefix: podPrefix ? podPrefix : '10.0.0.0/8',
				dnsNameservers: dnsNameservers ? dnsNameservers.split(',') : ['8.8.8.8', '8.8.4.4']
			},
			controlPlane: {
				replicas: replicas,
				version: `v${version}`,
				imageName: image.name,
				flavorName: flavor.name,
				disk: {
					size: disk
				}
			},
			workloadPools: []
		};

		if (sans || allowedPrefixes) {
			body.api = {};

			if (sans) {
				body.api.sans = sans.split(',');
			}

			if (allowedPrefixes) {
				body.api.allowedPrefixes = allowedPrefixes.split(',');
			}
		}

		if (autoscaling) {
			body.features = {
				autoscaling: true
			};
		}

		for (const wp of workloadPools) {
			const pool = {
				name: wp.name,
				machine: {
					replicas: wp.replicas,
					// TODO: there is a mismatch between input and output
					// that should be handled in the server.
					version: `v${version}`,
					imageName: wp.image.name,
					flavorName: wp.flavor.name,
					disk: {
						size: wp.disk
					}
				}
			};

			if (wp.autoscaling) {
				pool.autoscaling = {
					minimumReplicas: wp.minReplicas,
					maximumReplicas: wp.maxReplicas,
					scheduler: {
						cpus: wp.flavor.cpus,
						memory: wp.flavor.memory
					}
				};

				if (wp.flavor.gpus) {
					pool.autoscaling.scheduler.gpu = {
						type: 'nvidia.com/gpu',
						count: wp.flavor.gpus
					};
				}
			}

			body.workloadPools.push(pool);
		}

		await createCluster(controlPlane.status.name, {
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			},
			body: body
		});

		updateClusters();
		toggleCreateModal();
	}

	// TODO: this is just a bit of fun to prove how it could work, this
	// data needs to come from an API, not a spreadsheet embedded in a
	// presentation.
	const prices = {
		'g.48.highmem.a100.2': 10.12,
		'g.24.highmem.a100.1': 5.06,
		'g.12.highmem.a100.3g.40gb': 2.53,
		'g.8.highmem.a100.2g.20gb': 1.51,
		'g.4.highmem.a100.1g.10gb': 0.76,
		'g.4.standard': 0.16,
		'g.2.standard': 0.08
	};

	let cost = 0.0;
	let costMax = 0.0;

	function updateCost() {
		if (flavor == null) {
			return;
		}

		let c = prices[flavor.name] * replicas;
		let e = 0.0;

		for (const wp of workloadPools) {
			if (wp.flavor == null) {
				continue;
			}

			if (wp.autoscaling) {
				c = c + prices[wp.flavor.name] * wp.minReplicas;
				e = e + prices[wp.flavor.name] * (wp.maxReplicas - wp.minReplicas);
			} else {
				c = c + prices[wp.flavor.name] * wp.replicas;
			}
		}

		cost = c;
		costMax = c + e;
	}

	$: if (flavor != null) {
		updateCost();
	}
</script>

<Modal active={createModalActive} fixed="true">
	<form>
		<h1>Create New Cluster</h1>

		<input id="name" type="text" placeholder="Name (required)" required bind:value={name} />
		<label for="name"
			>Cluster name. Must be unique, contain only characters, numbers and dashes.</label
		>

		<div class="checkbox">
			<input id="autoscaling" type="checkbox" bind:checked={autoscaling} />
			<span>Autoscaling enabled</span>
		</div>
		<label for="autoscaling"
			>Enables cluster autoscaling, this must be configured for each workload pool.</label
		>

		<details>
			<summary>Networking (Advanced Options)</summary>

			<p>
				Network settings are optional, and if not specified will yield stable and scalable defaults.
			</p>
			<p>
				It is possible to connect Kubernetes clusters together with virtual private networks (VPNs).
				While this is discouraged, you must ensure that network CIDRs are globally unique and do not
				overlap.
			</p>

			<select id="keypair" bind:value={keyPair}>
				<option value="">(None)</option>
				{#each keyPairs as k}
					<option value={k}>{k.name}</option>
				{/each}
			</select>
			<label for="keypair"
				>SSH key pair to include on each node. It is advised this not be used to improve security.</label
			>

			<input
				id="dnsnameservers"
				type="text"
				placeholder="8.8.8.8,8.8.4.4"
				bind:value={dnsNameservers}
			/>
			<label for="dnsnameservers">Comma separated list of DNS name servers to use.</label>

			<input id="nodeNetwork" type="text" placeholder="192.168.0.0/16" bind:value={nodePrefix} />
			<label for="nodeNetwork">IPv4 CIDR to run Kubernetes nodes in.</label>

			<input id="podNetwork" type="text" placeholder="10.0.0.0/8" bind:value={podPrefix} />
			<label for="podNetwork">IPv4 CIDR to run Kubernets pods in.</label>

			<input
				id="serviceNetwork"
				type="text"
				placeholder="127.16.0.0/12"
				bind:value={servicePrefix}
			/>
			<label for="serviceNetwork">IPv4 CIDR to run Kubernetes services in.</label>

			<input
				id="allowedPrefixes"
				type="text"
				placeholder="1.2.3.4/32,7.8.0.0/16"
				bind:value={allowedPrefixes}
			/>
			<label for="allowedPrefixes"
				>Comma separated list of IPv4 CIDR blocks to permit access to the Kubernetes API.</label
			>

			<input id="sans" type="text" placeholder="kubernetes.my-domain.com" bind:value={sans} />
			<label for="sans"
				>Comma separated list of X.509 subject alterative names to add to the Kubernetes API
				certificate.</label
			>
		</details>

		<h2>Control Plane</h2>

		<select id="version" bind:value={version} required>
			{#each versions as v}
				<option value={v}>{v}</option>
			{/each}
		</select>
		<label for="version">Kubernetes version to provision with.</label>

		<select id="image" bind:value={image} required>
			{#each images as i}
				<option value={i}>{i.name}</option>
			{/each}
		</select>
		<label for="image">Virtual machine image to use.</label>

		<select id="flavor" bind:value={flavor} required>
			{#each cpFlavors as f}
				{#if f.gpus}
					<option value={f}>{f.name} ({f.cpus} core, {f.memory}Gi, {f.gpus} GPU)</option>
				{:else}
					<option value={f}>{f.name} ({f.cpus} core, {f.memory}Gi)</option>
				{/if}
			{/each}
		</select>
		<label for="flavor">Virtual machine type to use.</label>

		<div class="slider">
			<input id="disk" type="range" min="50" max="2000" step="50" bind:value={disk} />
			<span>{disk}GiB</span>
		</div>
		<label for="disk">The size of the root disk.</label>

		<details>
			<summary>Advanced Options</summary>

			<div class="slider">
				<input id="replicas" type="range" min="1" max="9" step="2" bind:value={replicas} />
				<span>{replicas}</span>
			</div>
			<label for="replicas"
				>Number of virtual machines. The default (3) is generally cost effective while providing
				high-availability.</label
			>

			<input id="labels" type="text" placeholder="key1=value1,key2=value2" />
			<label for="labels"
				>Comma separated set of labels to apply to Kubernetes nodes on creation.</label
			>
		</details>

		<h2>Workload Pools</h2>

		{#each workloadPools as pool, index}
			<section>
				<WorkloadPoolCreate
					{autoscaling}
					{flavors}
					{images}
					bind:object={pool}
					on:workload-update={updateCost}
				/>
				<button class="no-margin" on:click={() => removePool(index)}>Remove Pool</button>
			</section>
		{/each}

		<button class="no-margin" on:click={addPool}>Add New Pool</button>

		<h2>Estimated Cost</h2>
		<div>Fixed cost: &euro;{cost.toFixed(2)}/h</div>

		{#if autoscaling}
			<div>Maximum burst cost: &euro;{costMax.toFixed(2)}/h</div>
		{/if}

		<div>
			<button type="submit" on:click={submitCreateCluster}>Submit</button>
			<button on:click={toggleCreateModal}>Cancel</button>
		</div>
	</form>
</Modal>

<Breadcrumbs />

<LabeledInput id="control-plane-select" value="Control Plane">
	<select id="control-plane-select" bind:value={controlPlane} on:change={updateClusters}>
		{#each controlPlanes as choice}
			<option value={choice}>{choice.status.name}</option>
		{/each}
	</select>
</LabeledInput>

<button on:click={toggleCreateModal}>Create</button>

{#each clusters as cl}
	<article class="cluster">
		<StatusHeader name={cl.status.name} status={statusFromResource(cl.status)}>
			<iconify-icon icon="mdi:favorite-border" />
			<DropDownIcon
				icon="mdi:dots-vertical"
				id={cl.status.name}
				items={dropdownItems}
				on:select={selected}
			/>
		</StatusHeader>
		<dl>
			<dt>Age</dt>
			<dd>{age(cl.status.creationTime)}</dd>
			<dt>Status</dt>
			<dd>{cl.status.status}</dd>
			<dt>Kubernetes Version</dt>
			<dd>{cl.controlPlane.version}</dd>
		</dl>
	</article>
{/each}

<style>
	article {
		border: 2px solid var(--brand);
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
		align-items: stretch;
		padding: var(--padding);
		gap: var(--padding);
	}
	form label {
		display: block;
		font-style: italic;
		font-size: 0.75rem;
		margin-bottom: var(--padding);
	}
	form section {
		margin: 0;
		padding: var(--padding);
		border: 1px solid var(--brand);
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: var(--padding);
	}
	button.no-margin {
		margin: 0;
	}
	div.checkbox {
		display: flex;
		align-items: center;
		gap: var(--padding);
	}
	div.slider {
		display: flex;
		align-items: center;
		gap: var(--padding);
	}
	@media only screen and (min-width: 720px) {
		dl {
			display: grid;
			grid-auto-flow: column;
			grid-template-rows: auto auto;
		}
		dd:not(:last-child) {
			margin-bottom: 0;
		}
	}
</style>
