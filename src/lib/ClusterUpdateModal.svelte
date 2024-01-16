<script>
	import { onDestroy } from 'svelte';
	import { token, removeCredentials } from '$lib/credentials.js';
	import { errors } from '$lib/errors.js';
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

	import {
		namedObjectFormatter,
		applicationBundleFormatter,
		flavorFormatter
	} from '$lib/formatters.js';

	import Modal from '$lib/Modal.svelte';
	import ModalHeader from '$lib/ModalHeader.svelte';
	import ModalLoader from '$lib/ModalLoader.svelte';
	import WorkloadPoolUpdate from '$lib/WorkloadPoolUpdate.svelte';
	import TextField from '$lib/TextField.svelte';
	import SelectField from '$lib/SelectField.svelte';
	import CheckBoxField from '$lib/CheckBoxField.svelte';
	import SliderField from '$lib/SliderField.svelte';
	import TimeWindowField from '$lib/TimeWindowField.svelte';
	import Details from '$lib/Details.svelte';
	import Button from '$lib/Button.svelte';
	import Ribbon from '$lib/Ribbon.svelte';

	let accessToken;

	let loaded = false;

	// cluster refers to the existing cluster.
	export let cluster;

	// controlPlane provides a reference to the selected control plane.
	export let controlPlane;

	// active reports whether this modal is visible or not.
	export let active;

	// We will raise clusterCreated on successful cluster creation.
	const dispatch = createEventDispatcher();

	let submitting = false;

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

	let autoUpgrade = cluster.applicationBundleAutoUpgrade != null;
	let autoUpgradeDaysOfWeek =
		cluster.applicationBundleAutoUpgrade != null &&
		cluster.applicationBundleAutoUpgrade.daysOfWeek != null;

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

	function getExistingDayOfWeek(day) {
		if (!cluster.applicationBundleAutoUpgrade) {
			return null;
		}

		if (!cluster.applicationBundleAutoUpgrade.daysOfWeek) {
			return null;
		}

		const desc = Object.getOwnPropertyDescriptor(
			cluster.applicationBundleAutoUpgrade.daysOfWeek,
			day
		);
		if (!desc) {
			return null;
		}

		return desc.value;
	}

	let replicas = cluster.controlPlane.replicas;
	let keyPair = cluster.openstack.sshKeyName;
	let allowedPrefixes = cluster.api ? cluster.api.allowedPrefixes.join(',') : null;
	let autoscaling = cluster.features && cluster.features.autoscaling;
	let ingress = cluster.features && cluster.features.ingress;
	let certManager = cluster.features && cluster.features.certManager;
	let kubernetesDashboard = cluster.features && cluster.features.kubernetesDashboard;
	let fileStorage = cluster.features && cluster.features.fileStorage;
	let prometheus = cluster.features && cluster.features.prometheus;

	let controlPlanePersistentStorage = cluster.controlPlane.disk != null;

	let disk = 50;
	if (controlPlanePersistentStorage) {
		disk = cluster.controlPlane.disk.size;
	}

	$: if (kubernetesDashboard) {
		ingress = certManager = true;
	}

	let workloadPools = [];

	for (const pool of cluster.workloadPools) {
		addExistingPool(pool);
	}

	// When all images are available (and by implication versions), we can
	// get the image from the cluster, derive its version.
	function changeAllImages(allImages) {
		if (allImages.length == 0) {
			return;
		}

		image = allImages.find((x) => x.name == cluster.controlPlane.imageName);
		version = versions.find((x) => x == image.versions.kubernetes);
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
		if (flavors.length == 0) {
			return;
		}

		flavor = flavors.find((x) => x.name == cluster.controlPlane.flavorName);
	}

	$: changeFlavors(flavors);

	// Update the application bundle when they are available.
	function changeApplicationBundles(applicationBundles) {
		if (applicationBundles.length == 0) {
			return;
		}

		applicationBundle = applicationBundles.find((x) => x.name == cluster.applicationBundle.name);
	}

	$: changeApplicationBundles(applicationBundles);

	// Update availability zones when they are available.
	function changeComputeAZs(computeAZs) {
		if (computeAZs.length == 0) {
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

		// Sort by date, newest first.
		results.sort((a, b) => a.creationTime < b.creationTime);

		allImages = results;
	}

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

		flavors = results;
		cpFlavors = flavors.filter((x) => x.gpus == null);
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
		// Don't display end-of-life bundles, unless the existing one is
		// marked EOL.
		applicationBundles = result
			.reverse()
			.filter((x) => !x.endOfLife || x.name == cluster.applicationBundle.name);
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

	// Roll up validity to enable creation.
	let valid = false;
	let hasWorkloadPools = true;

	function changeWorkloadPools(workloadPools) {
		hasWorkloadPools = workloadPools.length > 0;

		valid = hasWorkloadPools && workloadPools.every((x) => x.object.valid);

		// Autoscaling is enabled if it's on for any workload pool.
		autoscaling = workloadPools.some((pool) => pool.object.autoscaling);
	}

	$: changeWorkloadPools(workloadPools);

	async function submit() {
		submitting = true;

		// Deep copy the object, bad tends to happen when you mutate
		// something non-local.
		let body = JSON.parse(JSON.stringify(cluster));

		// Handle updates of required fields.
		body.applicationBundle = applicationBundle;

		delete body.applicationBundleAutoUpgrade;

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

		body.openstack.computeAvailabilityZone = computeAZ.name;
		body.controlPlane.replicas = replicas;
		body.controlPlane.version = version;
		body.controlPlane.imageName = image.name;
		body.controlPlane.flavorName = flavor.name;
		body.workloadPools = [];

		if (controlPlanePersistentStorage) {
			if (!body.controlPlane.disk) {
				body.controlPlane.disk = {};
			}

			body.controlPlane.disk.size = disk;
		} else {
			delete body.controlPlane.disk;
		}

		// Handle updates of optional fields.
		// TODO: this feels pretty clunky...
		if (keyPair) {
			body.openstack.sshKeyName = keyPair.name;
		} else {
			delete body.openstack.sshKeyName;
		}

		if (allowedPrefixes) {
			if (!body.api) {
				body.api = {};
			}

			body.api.allowedPrefixes = allowedPrefixes.split(',');
		} else {
			if (body.api) {
				delete body.api.allowedPrefixes;
			}
		}

		body.features = {
			autoscaling: autoscaling,
			ingress: ingress,
			certManager: certManager,
			kubernetesDashboard: kubernetesDashboard,
			fileStorage: fileStorage,
			prometheus: prometheus
		};

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

		dispatch('updated', {});
		active = false;
	}
</script>

<Modal {active} fixed="true">
	{#if loaded}
		<ModalHeader text="Update Cluster" icon="mdi:pencil" />

		<form>
			<dl>
				<dt>Name</dt>
				<dd>{cluster.name}</dd>
			</dl>

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
										existing={getExistingDayOfWeek(day)}
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
						id="allowedPrefixes"
						placeholder="1.2.3.4/32,7.8.0.0/16"
						help="Comma separated list of IPv4 CIDR blocks to permit access to the Kubernetes API."
						bind:value={allowedPrefixes}
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
					help="Enables Kubernetes dashboard, automatically requires ingress and cert-manager add-ons"
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
						help="The default (3) is generally cost effective while providing high-availability."
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
					<WorkloadPoolUpdate
						existing={pool.existing}
						{flavors}
						{images}
						{computeAZs}
						bind:object={pool.object}
						bind:advanced
					/>
					<Button
						text="Remove Pool"
						icon="mdi:toy-brick-minus"
						on:message={() => removePool(index)}
					/>
				</section>
			{/each}

			<Button text="Add New Pool" icon="mdi:toy-brick-plus" on:message={addPool} />

			<hr />

			<Ribbon>
				{#if submitting}
					<Button text="Updating..." icon="svg-spinners:ring-resize" disabled="true" />
				{:else}
					<Button text="Update" icon="mdi:tick" disabled={!valid} on:message={submit} />
				{/if}
				<Button text="Cancel" icon="mdi:close" on:message={close} />
			</Ribbon>
		</form>
	{:else}
		<ModalLoader />
	{/if}
</Modal>

<style>
	form {
		display: flex;
		flex-direction: column;
		padding: var(--padding);
		gap: var(--padding);
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
