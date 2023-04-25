<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from '$lib/credentials.js';
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
	import WorkloadPoolEdit from '$lib/WorkloadPoolEdit.svelte';
	import TextField from '$lib/TextField.svelte';
	import SelectField from '$lib/SelectField.svelte';
	import CheckBoxField from '$lib/CheckBoxField.svelte';
	import SliderField from '$lib/SliderField.svelte';
	import TimeWindowField from '$lib/TimeWindowField.svelte';

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
	let disk = cluster.controlPlane.disk.size;
	let keyPair = cluster.openstack.sshKeyName;
	let allowedPrefixes = cluster.api ? cluster.api.allowedPrefixes.join(',') : null;
	let autoscaling = cluster.features && cluster.features.autoscaling;
	let ingress = cluster.features && cluster.features.ingress;

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
		// Don't display end-of-life bundles, unless the existing one is
		// marked EOL.
		applicationBundles = result
			.reverse()
			.filter((x) => !x.endOfLife || x.name == cluster.applicationBundle.name);
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

		if (ingress) {
			if (!body.features) {
				body.features = {};
			}

			body.features.ingress = true;
		} else {
			if (body.features) {
				delete body.features.ingress;
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
			onBadRequest: (message) => {
				if (message) {
					errors.add(message);
				}
			},
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
		<h2 class="modal-header"><iconify-icon icon="bx:edit" />Edit Cluster</h2>
		<form>
			<dl>
				<dt>Name</dt>
				<dd>{controlPlane.name}</dd>
			</dl>

			<SelectField
				id="version"
				help="Kubernetes version to provision with."
				bind:options={versions}
				bind:value={version}
			/>

			<CheckBoxField
				id="advanced"
				label="Enable advanced options?"
				help="Enables advanced configuration options."
				bind:checked={advanced}
			/>

			{#if advanced}
				<details>
					<summary>Lifecycle (Advanced)</summary>

					<section>
						<p>
							The platform will automatically upgrade clusters to provide confidence in security,
							and periodically enable new features. This section describes those defaults and, where
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
							id="allowedPrefixes"
							placeholder="1.2.3.4/32,7.8.0.0/16"
							help="Comma separated list of IPv4 CIDR blocks to permit access to the Kubernetes API."
							bind:value={allowedPrefixes}
						/>
					</section>
				</details>
			{/if}

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

			{#if advanced}
				<h2>Control Plane</h2>

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
			{/if}

			<h2>Workload Pools</h2>

			{#each workloadPools as pool, index}
				<section class="workloadpool">
					<WorkloadPoolEdit
						existing={pool.existing}
						{flavors}
						{images}
						{computeAZs}
						bind:object={pool.object}
						bind:advanced
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
		border: 1px solid var(--brand);
		align-items: stretch;
		display: flex;
		flex-direction: column;
		gap: var(--padding);
	}
	.workloadpool {
		padding: var(--padding);
		border: 1px solid var(--brand);
		align-items: stretch;
		display: flex;
		flex-direction: column;
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
