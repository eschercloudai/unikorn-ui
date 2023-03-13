<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from '$lib/credentials.js';
	import { createEventDispatcher } from 'svelte';

	import {
		listFlavors,
		listImages,
		listKeyPairs,
		listComputeAvailabilityZones,
		listBlockStorageAvailabilityZones,
		listExternalNetworks,
		createApplicationCredential,
		deleteApplicationCredential,
		createCluster,
		listApplicationBundlesCluster
	} from '$lib/client.js';

	import Modal from '$lib/Modal.svelte';
	import WorkloadPoolCreate from '$lib/WorkloadPoolCreate.svelte';

	// controlPlane provides a reference to the selected control plane.
	export let controlPlane;

	// active reports whether this modal is visible or not.
	export let active;

	// We will raise clusterCreated on successful cluster creation.
	const dispatch = createEventDispatcher();

	// name of the cluster.
	let name = null;
	let nameValid = false;

	// On creation we only consider a single version.
	let versions = [];
	let version;

	// Images are a one size fits all for simplicity.
	let allImages = [];

	// Images are filtered based on the version.
	let images = [];
	let image;

	// All flavors (for worker nodes).
	let flavors = [];

	// Control plane flavors are limited to non-GPU.
	let cpFlavors = [];
	let flavor;

	// Default replicas for the kubernetes control plane.
	let replicas = 3;

	// SSH keys.
	let keyPairs = [];
	let keyPair;

	// Default disk size for control plane nodes.
	let disk = 50;

	// Network options.
	let nodePrefix;
	let podPrefix;
	let servicePrefix;
	let dnsNameservers;
	let allowedPrefixes;
	let sans;

	// Whether the cluster-autoscaler add-on is provisioned.
	let autoscaling = false;

	// A set of workload pools for the cluster.
	let workloadPools = [];
	addPool();

	// Availability zones to use.
	let computeAZs = [];
	let computeAZ = null;

	let blockStorageAZs = [];

	// External network to provision routers and VIPs on.
	let externalNetworks = [];

	// Cluster versioning support.
	let applicationBundles = [];
	let applicationBundle = null;

	// Add a new workload pool to the list.
	function addPool() {
		// Create an object to bind the WorkloadPoolCreate component to.
		let object = {};

		workloadPools.push(object);
		workloadPools = workloadPools;
	}

	// Remove the workload pool at the given index.
	function removePool(index) {
		workloadPools.splice(index, 1);
		workloadPools = workloadPools;
	}

	// Close the modal.
	function close() {
		active = false;
	}

	// Get a list of images from the origin, and derive a list of
	// Kubernetes versions.
	async function updateImages(t) {
		const results = await listImages({
			token: t.token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		if (results == null) {
			return;
		}

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

	// Update the flavors available.
	async function updateFlavors(t) {
		const results = await listFlavors({
			token: t.token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		if (results == null) {
			return;
		}

		// TODO: push this into server.
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

	// Update the available SSH keypairs.
	async function updateKeyPairs(t) {
		const results = await listKeyPairs({
			token: t.token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		if (results == null) {
			return;
		}

		// Don't pick a value, it's secure by default.
		keyPairs = results;
	}

	// Update the available compute AZs.
	async function updateComputeAZs(t) {
		const results = await listComputeAvailabilityZones({
			token: t.token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		if (results == null) {
			return;
		}

		computeAZs = results;
	}

	$: if (computeAZs.length > 0 && computeAZ == null) {
		let set = false;

		// Hack!  We don't/can't know the topology so we have to "guess".
		// Server cannot figure this out either as it's acting as the user
		// with their credentials.
		for (const az of computeAZs) {
			if (az.name == 'nova') {
				computeAZ = az;
				set = true;
			}
		}

		if (!set) {
			console.log('unable to find default compute AZ');

			computeAZ = computeAZs[0];
		}
	}

	// Update the available block storage AZs.
	async function updateBlockStorageAZs(t) {
		const results = await listBlockStorageAvailabilityZones({
			token: t.token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		if (results == null) {
			return;
		}

		blockStorageAZs = results;
	}

	// Update the available external networks.
	async function updateExternalNetworks(t) {
		const results = await listExternalNetworks({
			token: t.token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		if (results == null) {
			return;
		}

		externalNetworks = results;
	}

	async function updateApplicationBundles(t) {
		const result = await listApplicationBundlesCluster({
			token: t.token,
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

	// id is a unique identifier for the component instance.
	let id = Symbol();

	onMount(() => {
		token.subscribe(id, updateAll);
	});

	onDestroy(() => {
		token.unsubscribe(id);
	});

	// When we get a token
	async function updateAll() {
		const t = token.get();

		if (t == null || t.scope == token.unscoped) {
			return;
		}

		updateKeyPairs(t);
		updateImages(t);
		updateFlavors(t);
		updateComputeAZs(t);
		updateBlockStorageAZs(t);
		updateExternalNetworks(t);
		updateApplicationBundles(t);
	}

	// Define the application credential name.
	function appCredName() {
		return `${controlPlane.status.name}-${name}`;
	}

	// Check if the name constraints are valid.  RFC-1123.
	// Upto 63 characters, lower case alpha, numeric and -.
	// Must start and end with alphanumeric.
	$: if (name != null) {
		nameValid = name.match(/^(?!-)[a-z0-9-]{0,62}[a-z0-9]$/);
	}

	let valid = false;

	$: valid = [nameValid].every((x) => x) && workloadPools.every((x) => x.valid);

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
			applicationBundle: applicationBundle.name,
			openstack: {
				applicationCredentialID: ac.id,
				applicationCredentialSecret: ac.secret,
				computeAvailabilityZone: computeAZ.name,
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
				version: version,
				imageName: image.name,
				flavorName: flavor.name,
				disk: {
					size: disk
				}
			},
			workloadPools: []
		};

		if (keyPair) {
			body.openstack.sshKeyName = keyPair.name;
		}

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
					version: version,
					imageName: wp.image.name,
					flavorName: wp.flavor.name,
					disk: {
						size: wp.disk
					}
				}
			};

			if (wp.labels) {
				pool.labels = Object.fromEntries(wp.labels.split(',').map((x) => x.split('=')));
			}

			if (wp.computeAZ) {
				pool.machine.availabilityZone = wp.computeAZ.name;
			}

			if (wp.autoscaling) {
				pool.autoscaling = {
					minimumReplicas: wp.minReplicas,
					maximumReplicas: wp.maxReplicas
				};
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

		dispatch('clusterCreated', {});
		active = false;
	}

	function updateWorkloadPool() {
		// TODO: given validity "just works (tm)" is this event based stuff
		// actually necessary??
		autoscaling = workloadPools.some((pool) => pool.autoscaling);
	}
</script>

<Modal {active} fixed="true">
	<form>
		<h1>Create New Cluster</h1>

		<input id="name" type="text" placeholder="Cluster name" bind:value={name} />
		<label for="name">
			Cluster name. Must be unique, contain only characters, numbers and dashes.
		</label>
		{#if !nameValid}
			<label for="name" class="error"
				>Name must contain only lower-case characters, numbers or hyphens (-), it must start and end
				with a character or number, and must be at most 63 characters.</label
			>
		{/if}

		<details>
			<summary>Lifecycle (Advanced)</summary>

			<p>
				The platform will automatically upgrade clusters to provide confidence in security, and
				periodically enable new features. This section describes those defaults and, where
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
				Selects the cluster version. Versions marked as <em>Preview</em> are early release
				candidates, and may have undergone less rigorous testing. Versions marked
				<em>End-of-Life</em> indicate the date when they will be automatically upgraded by the platform.
			</label>
		</details>

		<details>
			<summary>Topology (Advanced)</summary>

			<select id="compute-az" bind:value={computeAZ}>
				{#each computeAZs as az}
					<option value={az}>{az.name}</option>
				{/each}
			</select>
			<label for="compute-az">
				Select the global availability zone for compute instances. You can override this on a
				per-workload pool basis to improve cluster availability.
			</label>
		</details>

		<details>
			<summary>Networking (Advanced)</summary>

			<p>
				Network settings are optional, and if not specified will yield stable and scalable defaults.
			</p>
			<p>
				It is possible to connect Kubernetes clusters together with virtual private networks (VPNs).
				While this is discouraged, you must ensure that network CIDRs are globally unique and do not
				overlap.
			</p>

			<select id="keypair" bind:value={keyPair}>
				<option value={null}>(None)</option>
				{#each keyPairs as k}
					<option value={k}>{k.name}</option>
				{/each}
			</select>
			<label for="keypair">
				SSH key pair to include on each node. It is advised this not be used to improve security.
			</label>

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
			<label for="allowedPrefixes">
				Comma separated list of IPv4 CIDR blocks to permit access to the Kubernetes API.
			</label>

			<input id="sans" type="text" placeholder="kubernetes.my-domain.com" bind:value={sans} />
			<label for="sans">
				Comma separated list of X.509 subject alterative names to add to the Kubernetes API
				certificate.
			</label>
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
			<label for="replicas">
				Number of virtual machines. The default (3) is generally cost effective while providing
				high-availability.
			</label>
		</details>

		<h2>Workload Pools</h2>

		{#each workloadPools as pool, index}
			<section>
				<WorkloadPoolCreate
					{flavors}
					{images}
					{computeAZs}
					bind:object={pool}
					on:workload-update={updateWorkloadPool}
				/>
				<button on:click={() => removePool(index)}>
					<iconify-icon icon="mdi:delete" />
					<div>Remove Pool</div>
				</button>
			</section>
		{/each}

		<button on:click={addPool}>
			<iconify-icon icon="material-symbols:add" />
			<div>Add New Pool</div>
		</button>

		<div class="buttons">
			<button type="submit" disabled={!valid} on:click={submitCreateCluster}>
				<iconify-icon icon="mdi:tick" />
				<div>Submit</div>
			</button>
			<button on:click={close}>
				<iconify-icon icon="mdi:close" />
				<div>Cancel</div>
			</button>
		</div>
	</form>
</Modal>

<style>
	div.buttons {
		display: flex;
		justify-content: center;
		gap: var(--padding);
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
	/*
	div.checkbox {
		display: flex;
		align-items: center;
		gap: var(--padding);
	}
	*/
	div.slider {
		display: flex;
		align-items: center;
		gap: var(--padding);
	}
</style>
