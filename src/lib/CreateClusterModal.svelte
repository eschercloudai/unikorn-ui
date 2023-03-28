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

	import {
		namedObjectFormatter,
		applicationBundleFormatter,
		flavorFormatter
	} from '$lib/formatters.js';

	import Modal from '$lib/Modal.svelte';
	import WorkloadPoolCreate from '$lib/WorkloadPoolCreate.svelte';
	import TextField from '$lib/TextField.svelte';
	import SelectField from '$lib/SelectField.svelte';
	import CheckBoxField from '$lib/CheckBoxField.svelte';
	import SliderField from '$lib/SliderField.svelte';

	// clusters allows name uniqueness checking.
	export let clusters;

	// controlPlane provides a reference to the selected control plane.
	export let controlPlane;

	// active reports whether this modal is visible or not.
	export let active;

	// We will raise clusterCreated on successful cluster creation.
	const dispatch = createEventDispatcher();

	// name of the cluster.
	let name = null;
	let nameValid = false;
	let nameValidMessage;

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
	let ingress = false;

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
		// Also don't allow users to create new end-of-life resources.
		applicationBundles = result.reverse().filter((x) => !x.endOfLife);
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

	// Define the application credential name.
	function appCredName() {
		return `${controlPlane.status.name}-${name}`;
	}

	const nameInvalidUnset =
		'Name must contain only lower-case characters, numbers or hyphens (-), it must start and end with a character or number, and must be at most 63 characters.';
	const nameInvalidUsed = 'Name already used by another cluster';

	function validateName(name, clusters) {
		if (name == null || clusters == null) {
			nameValidMessage = nameInvalidUnset;
			return false;
		}

		// RFC-1123.  Must start and end with alphanumeric.
		// Upto 63 characters, lower case alpha, numeric and -.
		if (!name.match(/^(?!-)[a-z0-9-]{0,62}[a-z0-9]$/)) {
			nameValidMessage = nameInvalidUnset;
			return false;
		}

		if (clusters.some((x) => x.name == name)) {
			nameValidMessage = nameInvalidUsed;
			return false;
		}

		return true;
	}

	// Roll up validity to enable creation.
	$: valid = [nameValid].every((x) => x) && workloadPools.every((x) => x.valid);

	async function submit() {
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
			applicationBundle: applicationBundle,
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

		if (autoscaling || ingress) {
			body.features = {};

			if (autoscaling) {
				body.features.autoscaling = true;
			}

			if (ingress) {
				body.features.ingress = true;
			}
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

		await createCluster(controlPlane.name, {
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			},
			body: body
		});

		dispatch('created', {});
		active = false;
	}

	$: autoscaling = workloadPools.some((pool) => pool.autoscaling);
</script>

<Modal {active} fixed="true">
	{#if loaded}
		<h2 class="modal-header"><iconify-icon icon="bx:edit" />Create Cluster</h2>
		<form>
			<TextField
				id="name"
				placeholder="Cluster name"
				help="A valid Kubernetes name, unique within the control plane"
				validator={(x) => validateName(x, clusters)}
				invalidtext={nameValidMessage}
				bind:value={name}
				bind:valid={nameValid}
			/>

			<details>
				<summary>Lifecycle (Advanced)</summary>
				<section>
					<p>
						The platform will automatically upgrade clusters to provide confidence in security, and
						periodically enable new features. This section describes those defaults and, where
						applicable, allows you to fine tune those settings.
					</p>

					<SelectField
						id="appbundle"
						help="Selects the cluster version. Versions marked as <em>Preview</em> are early release
                                                candidates, and may have undergone less rigorous testing. Versions marked
                                                <em>End-of-Life</em> indicate the date when they will be automatically upgraded by the platform."
						formatter={applicationBundleFormatter}
						bind:options={applicationBundles}
						bind:value={applicationBundle}
					/>
				</section>
			</details>

			<details>
				<summary>Topology (Advanced)</summary>

				<section>
					<p>
						Cluster topology defines top-level scheduling/placement, and allows you to explicitly
						define availability zones in which to provision infrastructure for high-availability.
					</p>
					<p>By default the platform will schedule across any availabilty zone.</p>

					<SelectField
						id="compute-az"
						help="Select the global availability zone for compute instances. You can override this on a
						per-workload pool basis to improve cluster availability."
						formatter={namedObjectFormatter}
						bind:options={computeAZs}
						bind:value={computeAZ}
					/>
				</section>
			</details>

			<details>
				<summary>Networking (Advanced)</summary>

				<section>
					<p>
						Network settings are optional, and if not specified will yield stable and scalable
						defaults.
					</p>
					<p>
						It is possible to connect Kubernetes clusters together with virtual private networks
						(VPNs). While this is discouraged, you must ensure that network CIDRs are globally
						unique and do not overlap.
					</p>

					<SelectField
						id="keypair"
						help="SSH key pair to include on each node. It is advised this not be used to improve
						security."
						nullable="true"
						formatter={namedObjectFormatter}
						bind:options={keyPairs}
						bind:value={keyPair}
					/>

					<TextField
						id="dnsnameservers"
						placeholder="8.8.8.8,8.8.4.4"
						help="Comma separated list of DNS name servers to use."
						bind:value={dnsNameservers}
					/>

					<TextField
						id="nodeNetwork"
						placeholder="192.168.0.0/16"
						help="IPv4 CIDR to run Kubernetes nodes in."
						bind:value={nodePrefix}
					/>

					<TextField
						id="podNetwork"
						placeholder="10.0.0.0/8"
						help="IPv4 CIDR to run Kubernets pods in."
						bind:value={podPrefix}
					/>

					<TextField
						id="serviceNetwork"
						placeholder="127.16.0.0/12"
						help="IPv4 CIDR to run Kubernetes services in."
						bind:value={servicePrefix}
					/>

					<TextField
						id="allowedPrefixes"
						placeholder="1.2.3.4/32,7.8.0.0/16"
						help="Comma separated list of IPv4 CIDR blocks to permit access to the Kubernetes API."
						bind:value={allowedPrefixes}
					/>

					<TextField
						id="sans"
						placeholder="kubernetes.my-domain.com"
						help="Comma separated list of X.509 subject alterative names to add to the Kubernetes API
                                                certificate."
						bind:value={sans}
					/>
				</section>
			</details>

			<details>
				<summary>Add-on Features</summary>

				<section>
					<p>
						Add-on features allow the management of typical Kubernetes componenents that are not
						include by default, but are considered standard.
					</p>
					<p>
						They are not enabled by default to improve baseline security and resource utilisation.
					</p>

					<CheckBoxField
						id="ingress"
						label="Enable ingress controller?"
						help="Enables Nginx ingress controller"
						bind:checked={ingress}
					/>
				</section>
			</details>

			<h2>Control Plane</h2>

			<SelectField
				id="version"
				help="Kubernetes version to provision with."
				bind:options={versions}
				bind:value={version}
			/>

			<SelectField
				id="image"
				help="Virtual machine image to use."
				formatter={namedObjectFormatter}
				bind:options={images}
				bind:value={image}
			/>

			<SelectField
				id="flavor"
				help="Virtual machine type to use."
				formatter={flavorFormatter}
				bind:options={cpFlavors}
				bind:value={flavor}
			/>

			<SliderField
				id="disk"
				help="The size of the root disk."
				min="50"
				max="2000"
				step="50"
				formatter={(x) => `${x}GiB`}
				bind:value={disk}
			/>

			<details>
				<summary>Advanced Options</summary>

				<section>
					<SliderField
						id="replicas"
						help="Number of virtual machines. The default (3) is generally cost effective while providing
                                                high-availability."
						min="1"
						max="9"
						step="2"
						bind:value={replicas}
					/>
				</section>
			</details>

			<h2>Workload Pools</h2>

			{#each workloadPools as pool, index}
				<section>
					<WorkloadPoolCreate {flavors} {images} {computeAZs} bind:object={pool} />
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
				<button on:click={close}>
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
	form > section {
		margin: 0;
		padding: var(--padding);
		border: 1px solid var(--brand);
		align-items: stretch;
	}
</style>
