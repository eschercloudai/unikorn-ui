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
		listApplicationBundlesCluster,
		listExternalNetworks,
		updateCluster
	} from '$lib/client.js';

	import Modal from '$lib/Modal.svelte';
	import WorkloadPoolEdit from '$lib/WorkloadPoolEdit.svelte';

	// cluster refers to the existing cluster.
	export let cluster;

	// controlPlane provides a reference to the selected control plane.
	export let controlPlane;

	// active reports whether this modal is visible or not.
	export let active;

	// We will raise clusterCreated on successful cluster creation.
	const dispatch = createEventDispatcher();

	// Define dynamic things from the API.
	let versions = [];
	let allImages = [];
	let images = [];
	let flavors = [];
	let cpFlavors = [];
	let keyPairs = [];
	let computeAZs = [];
	let blockStorageAZs = [];
	let externalNetworks = [];
	let applicationBundles = [];

	// Define things derived from the cluster, and user updatable.
	// If it's not here, please check that CAPI webhooks before
	// adding anything, because it must be allowed by their API.
	let version;
	let image;
	let flavor;
	let computeAZ;
	let applicationBundle;

	let replicas = cluster.controlPlane.replicas;
	let disk = cluster.controlPlane.disk.size;
	let keyPair = cluster.openstack.sshKeyName;
	let allowedPrefixes = cluster.api ? cluster.api.allowedPrefixes.join(',') : null;
	let autoscaling = cluster.features && cluster.features.autoscaling;

	let workloadPools = [];

	for (const pool of cluster.workloadPools) {
		addExistingPool(pool);
	}

	// When all images are available (and by implication versions), we can
	// get the image from the cluster, derive its version, then show all images
	// available for that version.
	function changeAllImages(allImages) {
		if (allImages.length == 0) {
			return;
		}

		image = allImages.find((x) => x.name == cluster.controlPlane.imageName);
		version = versions.find((x) => x == image.versions.kubernetes);
		images = allImages.filter((x) => x.versions.kubernetes == version);
	}

	$: changeAllImages(allImages);

	// When the version changes, so does our view of the images, so pick a new one.
	// However... When the version matches that of the cluster, then default
	// to the existing image to avoid upgrades unless explicitly triggered.
	function changeVersion(version) {
		if (!version) {
			return;
		}

		images = allImages.filter((x) => x.versions.kubernetes == version);

		const existing = images.find((x) => x.name == cluster.controlPlane.imageName);
		if (existing) {
			image = existing;
		} else {
			image = images[0];
		}
	}

	$: changeVersion(version);

	// Update the chosen flavor when the flavors are available.
	function changeFlavors(flavors) {
		if (flavors.length == 0 || flavor) {
			return;
		}

		flavor = flavors.find((x) => x.name == cluster.controlPlane.flavorName);
	}

	$: changeFlavors(flavors);

	// Update the application bundle when they are available.
	function changeApplicationBundles(applicationBundles) {
		// TODO: this second check shouldn't be necessary, why is it triggered
		// on a select??
		if (applicationBundles.length == 0 || applicationBundle) {
			return;
		}

		applicationBundle = applicationBundles.find((x) => x.name == cluster.applicationBundle.name);
	}

	$: changeApplicationBundles(applicationBundles);

	// Update availability zones when they are available.
	function changeComputeAZs(computeAZs) {
		if (computeAZs.length == 0 || computeAZ) {
			return;
		}

		computeAZ = computeAZs.find((x) => x.name == cluster.openstack.computeAvailabilityZone);
	}

	$: changeComputeAZs(computeAZs);

	// Add a new workload pool to the list.
	function addPool() {
		// Create an object to bind the WorkloadPoolCreate component to.
		let object = {};

		let p = {
			existing: null,
			object: object
		};

		workloadPools.push(p);
		workloadPools = workloadPools;
	}

	function addExistingPool(pool) {
		let object = {};

		let p = {
			existing: pool,
			object: object
		};

		workloadPools.push(p);
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

		// Sort by date, newest first.
		results.sort((a, b) => a.creationTime < b.creationTime);

		allImages = results;
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

		flavors = results;
		cpFlavors = flavors.filter((x) => x.gpus == null);
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

	// id is a unique identifier for the component instance.
	let id = Symbol();

	onMount(() => {
		token.subscribe(id, updateAll);
	});

	onDestroy(() => {
		token.unsubscribe(id);
	});

	let loaded = false;

	// When we get a token
	async function updateAll() {
		const t = token.get();

		if (t == null || t.scope == token.unscoped) {
			return;
		}

		await Promise.all([
			updateKeyPairs(t),
			updateImages(t),
			updateFlavors(t),
			updateComputeAZs(t),
			updateBlockStorageAZs(t),
			updateExternalNetworks(t),
			updateApplicationBundles(t)
		]);

		loaded = true;
	}

	// Roll up validity to enable creation.
	let valid = false;

	function changeWorkloadPools(workloadPools) {
		valid = workloadPools.every((x) => x.object.valid);

		// NOTE: if this is on, leave it on, unikorn-cluster-manager will
		// just orphan the application at present, and probably cause issues.
		if (!cluster.features || !cluster.features.autoscaling) {
			autoscaling = workloadPools.some((pool) => pool.object.autoscaling);
		}
	}

	$: changeWorkloadPools(workloadPools);

	async function submit() {
		// Deep copy the object, bad tends to happen when you mutate
		// something non-local.
		let body = JSON.parse(JSON.stringify(cluster));

		// Handle updates of required fields.
		body.applicationBundle = applicationBundle;
		body.openstack.computeAvailabilityZone = computeAZ.name;
		body.controlPlane.replicas = replicas;
		body.controlPlane.version = version;
		body.controlPlane.imageName = image.name;
		body.controlPlane.flavorName = flavor.name;
		body.controlPlane.disk.size = disk;
		body.workloadPools = [];

		// Handle updates of optional fields.
		// TODO: this feels pretty clunky...
		if (keyPair) {
			body.openstack.sshKeyName = keyPair.name;
		} else {
			delete body.openstack.sshKeyName;
		}

		if (allowedPrefixes) {
			if (!body.openstack.api) {
				body.openstack.api = {};
			}

			body.openstack.api.allowedPrefixes = allowedPrefixes.split(',');
		} else {
			if (body.openstack.api) {
				delete body.openstack.api.allowedPrefixes;
			}
		}

		if (autoscaling) {
			if (!body.features) {
				body.features = {};
			}

			body.features.autoscaling = true;
		} else {
			if (body.features) {
				delete body.features.autoscaling;
			}
		}

		for (const p of workloadPools) {
			const wp = p.object;

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

		await updateCluster(controlPlane.name, cluster.name, {
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			},
			body: body
		});

		dispatch('updated', {});
		active = false;
	}
</script>

<Modal {active} fixed="true">
	{#if loaded}
		<form>
			<h1>Edit Cluster</h1>
			<dl>
				<dt>Name</dt>
				<dd>{controlPlane.name}</dd>
			</dl>

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
					Network settings are optional, and if not specified will yield stable and scalable
					defaults.
				</p>
				<p>
					It is possible to connect Kubernetes clusters together with virtual private networks
					(VPNs). While this is discouraged, you must ensure that network CIDRs are globally unique
					and do not overlap.
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
					id="allowedPrefixes"
					type="text"
					placeholder="1.2.3.4/32,7.8.0.0/16"
					bind:value={allowedPrefixes}
				/>
				<label for="allowedPrefixes">
					Comma separated list of IPv4 CIDR blocks to permit access to the Kubernetes API.
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
					<WorkloadPoolEdit
						existing={pool.existing}
						{flavors}
						{images}
						{computeAZs}
						bind:object={pool.object}
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
				<button type="submit" disabled={!valid} on:click={submit} on:keydown={submit}>
					<iconify-icon icon="mdi:tick" />
					<div>Submit</div>
				</button>
				<button on:click={close} on:keydown={close}>
					<iconify-icon icon="mdi:close" />
					<div>Cancel</div>
				</button>
			</div>
		</form>
	{:else}
		<h3>Loading ...</h3>
	{/if}
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
</style>
