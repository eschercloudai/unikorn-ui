<script>
	import { onDestroy } from 'svelte';
	import { token, removeCredentials } from '$lib/credentials.js';
	import { errors } from '$lib/errors.js';
	import { createEventDispatcher } from 'svelte';
	import { env } from '$env/dynamic/public';

	import {
		listFlavors,
		listImages,
		listKeyPairs,
		listComputeAvailabilityZones,
		listBlockStorageAvailabilityZones,
		listExternalNetworks,
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
	import TimeWindowField from '$lib/TimeWindowField.svelte';
	import Details from '$lib/Details.svelte';
	import Button from '$lib/Button.svelte';
	import Ribbon from '$lib/Ribbon.svelte';

	// clusters allows name uniqueness checking.
	export let clusters;

	// controlPlane provides a reference to the selected control plane.
	export let controlPlane;

	// active reports whether this modal is visible or not.
	export let active;

	let loaded = false;

	// When we get a token
	let accessToken;

	// We will raise clusterCreated on successful cluster creation.
	const dispatch = createEventDispatcher();

	let submitting = false;

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

	let defaultNodePrefix = env.PUBLIC_NODE_PREFIX;
	let defaultServicePrefix = env.PUBLIC_SERVICE_PREFIX;
	let defaultPodPrefix = env.PUBLIC_POD_PREFIX;

	// Whether the cluster-autoscaler add-on is provisioned.
	let autoscaling = false;
	let ingress = false;
	let certManager = false;
	let kubernetesDashboard = false;
	let fileStorage = false;
	let prometheus = false;
	let controlPlanePersistentStorage = false;

	// The kubernetes dashboard implies ingress and cert-manager.
	// The individual inputs are disabled below so they cannot be turned off.
	$: if (kubernetesDashboard) {
		ingress = certManager = true;
	}

	// Autoscaling is enabled if it's on for any workload pool.
	$: autoscaling = workloadPools.some((pool) => pool.autoscaling);

	// A set of workload pools for the cluster.
	let workloadPools = [];
	addPool();

	let hasWorkloadPools = true;

	$: hasWorkloadPools = workloadPools.length > 0;

	// Availability zones to use.
	let computeAZs = [];
	let computeAZ = null;

	let blockStorageAZs = [];

	// External network to provision routers and VIPs on.
	let externalNetworks = [];

	// Cluster versioning support.
	let applicationBundles = [];
	let applicationBundle = null;

	let autoUpgrade = false;
	let autoUpgradeDaysOfWeek = false;

	let daysOfTheWeekWindows = {
		sunday: {},
		monday: {},
		tuesday: {},
		wednesday: {},
		thursday: {},
		friday: {},
		saturday: {}
	};

	let advanced = false;

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
	async function updateImages() {
		const results = await listImages({
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
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
	function updateCPImages(allImages, version) {
		if (allImages.length == 0 || version == null) {
			return;
		}

		let i = [];

		for (const image of allImages) {
			if (image.versions.kubernetes == version) {
				i.push(image);
			}
		}

		images = i;
		image = images[0];
	}

	$: updateCPImages(allImages, version);

	// Update the flavors available.
	async function updateFlavors() {
		const results = await listFlavors({
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
			}
		});

		if (results == null) {
			return;
		}

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
	async function updateKeyPairs() {
		const results = await listKeyPairs({
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
			}
		});

		if (results == null) {
			return;
		}

		// Don't pick a value, it's secure by default.
		keyPairs = results;
	}

	// Update the available compute AZs.
	async function updateComputeAZs() {
		const results = await listComputeAvailabilityZones({
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
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
	async function updateBlockStorageAZs() {
		const results = await listBlockStorageAvailabilityZones({
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
			}
		});

		if (results == null) {
			return;
		}

		blockStorageAZs = results;
	}

	// Update the available external networks.
	async function updateExternalNetworks() {
		const results = await listExternalNetworks({
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
			}
		});

		if (results == null) {
			return;
		}

		externalNetworks = results;
	}

	async function updateApplicationBundles() {
		const result = await listApplicationBundlesCluster({
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
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

	const tokenUnsubscribe = token.subscribe(updateAll);

	onDestroy(tokenUnsubscribe);

	async function updateAll(t) {
		if (t == null) {
			return;
		}

		accessToken = t;

		await Promise.all([
			updateKeyPairs(),
			updateImages(),
			updateFlavors(),
			updateComputeAZs(),
			updateBlockStorageAZs(),
			updateExternalNetworks(),
			updateApplicationBundles()
		]);

		loaded = true;
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
	$: valid = [nameValid].every((x) => x) && hasWorkloadPools && workloadPools.every((x) => x.valid);

	async function submit() {
		submitting = true;

		const body = {
			name: name,
			applicationBundle: applicationBundle,
			openstack: {
				computeAvailabilityZone: computeAZ.name,
				volumeAvailabilityZone: blockStorageAZs[0].name,
				externalNetworkID: externalNetworks[0].id
			},
			network: {
				nodePrefix: nodePrefix ? nodePrefix : defaultNodePrefix,
				servicePrefix: servicePrefix ? servicePrefix : defaultServicePrefix,
				podPrefix: podPrefix ? podPrefix : defaultPodPrefix,
				dnsNameservers: dnsNameservers ? dnsNameservers.split(',') : ['8.8.8.8', '8.8.4.4']
			},
			controlPlane: {
				replicas: replicas,
				version: version,
				imageName: image.name,
				flavorName: flavor.name
			},
			workloadPools: [],
			features: {
				autoscaling: autoscaling,
				ingress: ingress,
				certManager: certManager,
				kubernetesDashboard: kubernetesDashboard,
				fileStorage: fileStorage,
				prometheus: prometheus
			}
		};

		if (controlPlanePersistentStorage) {
			body.controlPlane.disk = {
				size: disk
			};
		}

		if (autoUpgrade) {
			// Empty object means platform managed.
			const aa = {};

			if (autoUpgradeDaysOfWeek) {
				let dow = {};

				for (const [day, o] of Object.entries(daysOfTheWeekWindows)) {
					if (!o.enabled) {
						continue;
					}

					Object.defineProperty(dow, day, {
						enumerable: true,
						value: {
							start: o.start,
							end: o.end
						}
					});
				}

				aa.daysOfWeek = dow;
			}

			body.applicationBundleAutoUpgrade = aa;
		}

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

		let controlPlaneName = 'default';

		if (controlPlane) {
			controlPlaneName = controlPlane.name;
		}

		await createCluster(controlPlaneName, {
			token: accessToken,
			onBadRequest: (message) => {
				if (message) {
					errors.add(message);
				}
			},
			onInternalServerError: (message) => {
				if (message) {
					errors.add(message);
				}
			},
			onUnauthorized: () => {
				removeCredentials();
			},
			body: body
		});

		dispatch('created', {});
		active = false;
	}
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

			<SelectField
				id="version"
				help="Kubernetes version to provision with."
				options={versions}
				bind:value={version}
			/>

			<CheckBoxField
				id="advanced"
				label="Enable advanced options?"
				help="Enables advanced configuration options."
				bind:checked={advanced}
			/>

			{#if advanced}
				<Details summary="Lifecycle (Advanced)" icon="material-symbols:cycle-rounded">
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
						options={applicationBundles}
						bind:value={applicationBundle}
					/>

					<CheckBoxField
						id="autoUpgrade"
						label="Enable auto-upgrade?"
						help="Enables auto-upgrade of the cluster application bundle.  When checked the default setting will be to perform upgrades randomly from Monday-Friday 00:00-07:00 UTC.  This allows support to be be readily available in the rare event of disruption."
						bind:checked={autoUpgrade}
					/>

					{#if autoUpgrade}
						<section class="autoupgrade">
							<CheckBoxField
								id="autoUpgradeDaysOfWeek"
								label="Enable auto-upgrade scheduling?"
								help="The default auto-upgrade time-windows are recommended.  If this isn't suitable for your use case, this allows the days and time-windows to be manually specified."
								bind:checked={autoUpgradeDaysOfWeek}
							/>

							{#if autoUpgradeDaysOfWeek}
								{#each Object.keys(daysOfTheWeekWindows) as day}
									<TimeWindowField
										id="autoupgrade-{day}"
										label="Enable {day}?"
										bind:object={daysOfTheWeekWindows[day]}
									/>
								{/each}
							{/if}
						</section>
					{/if}
				</Details>

				<Details summary="Topology (Advanced)" icon="tabler:topology-star-3">
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
						options={computeAZs}
						bind:value={computeAZ}
					/>
				</Details>

				<Details summary="Networking (Advanced)" icon="mdi:lan">
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
						options={keyPairs}
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
						placeholder={defaultNodePrefix}
						help="IPv4 CIDR to run Kubernetes nodes in."
						bind:value={nodePrefix}
					/>

					<TextField
						id="podNetwork"
						placeholder={defaultPodPrefix}
						help="IPv4 CIDR to run Kubernets pods in."
						bind:value={podPrefix}
					/>

					<TextField
						id="serviceNetwork"
						placeholder={defaultServicePrefix}
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
				</Details>
			{/if}

			<Details summary="Add-on Features" icon="mdi:puzzle-plus-outline">
				<p>
					Add-on features allow the management of typical Kubernetes componenents that are not
					included by default, but are considered standard.
				</p>
				<p>
					They are not enabled by default to improve baseline security and resource utilisation.
				</p>

				<CheckBoxField
					id="ingress"
					label="Enable ingress controller?"
					help="Enables Nginx ingress controller"
					bind:checked={ingress}
					disabled={kubernetesDashboard}
				/>

				<CheckBoxField
					id="cert-manager"
					label="Enable cert-manager controller?"
					help="Enables cert-manager TLS certificate management controller"
					bind:checked={certManager}
					disabled={kubernetesDashboard}
				/>

				<CheckBoxField
					id="kubernetes-dashboard"
					label="Enable Kubernetes dashboard?"
					help="Enables Kubernetes dashboard, automatically require
s ingress and cert-manager add-ons"
					bind:checked={kubernetesDashboard}
				/>

				<CheckBoxField
					id="file-storage"
					label="Enable Longhorn?"
					help="Enables Longhorn for persistent storage, includes read-write-many (RWX) support"
					bind:checked={fileStorage}
				/>

				<CheckBoxField
					id="prometheus"
					label="Enable Prometheus?"
					help="Enables the Prometheus operator that can be used to provide platform monitoring"
					bind:checked={prometheus}
				/>
			</Details>

			{#if advanced}
				<h2>Control Plane</h2>

				<SelectField
					id="image"
					help="Virtual machine image to use."
					formatter={namedObjectFormatter}
					options={images}
					bind:value={image}
				/>

				<SelectField
					id="flavor"
					help="Virtual machine type to use."
					formatter={flavorFormatter}
					options={cpFlavors}
					bind:value={flavor}
				/>

				<Details summary="Advanced Options" icon="mdi:cog">
					<p>Number of virtual machines.</p>
					<SliderField
						id="replicas"
						help=" The default (3) is generally cost effective while providing high-availability."
						min="1"
						max="5"
						step="2"
						bind:value={replicas}
					/>

					<CheckBoxField
						id="controlplane-storage"
						label="Use persistent storage?"
						help="Whether to use a dedicated persistent volume for
							control plane nodes.  It is recommended to leave this
							unchecked, as ephemeral storage provides higher performance
							for Kubernetes' etcd database.  If left unchecked, the default ephemeral
							storage size of {flavor.disk}GB is used.  Checking this also allows
							you to specify the volume size.  You may wish to do this
							to increase storage capacity."
						bind:checked={controlPlanePersistentStorage}
					/>

					{#if controlPlanePersistentStorage}
						<SliderField
							id="disk"
							help="The size of the root disk."
							min="50"
							max="2000"
							step="50"
							formatter={(x) => `${x}GiB`}
							bind:value={disk}
						/>
					{/if}
				</Details>
			{/if}

			<h2>Workload Pools</h2>

			{#if !hasWorkloadPools}
				<p class="error">At least one workload pool is required.</p>
			{/if}

			{#each workloadPools as pool, index}
				<section class="workloadpool">
					<WorkloadPoolCreate {flavors} {images} {computeAZs} bind:object={pool} bind:advanced />
					<Button
						text="Remove Pool"
						icon="mdi:toy-brick-minus"
						on:message={() => removePool(index)}
					/>
				</section>
			{/each}

			<Button text="Add New Pool" icon="mdi:toy-brick-plus" on:message={addPool} />

			<Ribbon grow="true">
				{#if submitting}
					<Button text="Creating..." icon="svg-spinners:ring-resize" disabled="true" />
				{:else}
					<Button text="Create" icon="mdi:tick" disabled={!valid} on:message={submit} />
				{/if}
				<Button text="Cancel" icon="mdi:close" on:message={close} />
			</Ribbon>
		</form>
	{:else}
		<div class="loader">
			<div class="loader-content">
				<h2>Loading ...</h2>
				<img src="img/wait.png" alt="A sleepy cat" />
				<div class="attribution">
					<a
						href="https://www.freepik.com/free-vector/cute-cat-sleeping-with-chick-cartoon-vector-icon-illustration-animal-nature-icon-concept-isolated_28268935.htm#query=sleeping%20cat&position=40&from_view=keyword&track=ais"
						>Image by catalyststuff</a
					> on Freepik
				</div>
			</div>
		</div>
	{/if}
</Modal>

<style>
	form {
		display: flex;
		flex-direction: column;
		padding: var(--padding);
		gap: var(--padding);
	}
	.loader {
		display: flex;
		flex-direction: column;
		justify-content: center;
		flex: 1;
	}
	.loader-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--padding);
		padding: var(--padding);
	}
	.loader-content > img {
		max-width: 300px;
	}
	.attribution {
		font-size: 0.75em;
	}
	.autoupgrade {
		padding: var(--padding);
		border: 1px solid var(--border);
		align-items: stretch;
		display: flex;
		flex-direction: column;
		gap: var(--padding);
	}
	.workloadpool {
		padding: var(--padding);
		border: 1px solid var(--border);
		align-items: stretch;
		display: flex;
		flex-direction: column;
		gap: var(--padding);
	}
</style>
