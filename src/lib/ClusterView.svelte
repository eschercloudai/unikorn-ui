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
		deleteCluster
	} from '$lib/client.js';

	import Modal from '$lib/Modal.svelte';
	import Breadcrumbs from '$lib/Breadcrumbs.svelte';
	import StatusHeader from '$lib/StatusHeader.svelte';
	import DropDownIcon from '$lib/DropDownIcon.svelte';
	import LabeledInput from '$lib/LabeledInput.svelte';

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

	let createModalActive = false;

	// On creation we on;y consider a single version.
	let versions = [];
	let version = null;

	// Images are a one size fits all for simplicity.
	let images = [];
	let image = null;

	// All flavors (for worker nodes).
	let flavors = [];

	// Control plane flavors are limited to non-GPU.
	let cpFlavors = [];
	let cpFlavor = null;

	let cpReplicas = 3;

	let keyPairs = [];
	let keyPair = null;

	async function updateImages() {
		const results = await listImages({
			token: token.get().token
		});

		// Find a unique set of versions...
		const v = new Set();

		for (const result of results) {
			v.add(result.versions.kubernetes);
		}

		// ... then list them in reverse order (newest first).
		versions = Array.from(v.values()).sort().reverse();
		version = versions[0];

		// Now that is done group the images by version.
		let i = [];

		for (const result of results) {
			// TODO: sorted by date.
			if (result.versions.kubernetes == version) {
				i.push(result);
			}
		}

		images = i;
		image = images[0];

		for (const wp of workloadPools) {
			wp.image = images[0];
		}

		// Trigger a refresh.
		workloadPools = workloadPools;
	}

	async function updateFlavors() {
		const results = await listFlavors({
			token: token.get().token
		});

		const cpf = [];

		for (const result of results) {
			if (result.gpus == null) {
				cpf.push(result);
			}
		}

		cpFlavors = cpf;
		cpFlavor = cpf[0];

		flavors = results;

		for (const wp of workloadPools) {
			wp.flavor = flavors[0];
		}

		// Trigger a refresh.
		workloadPools = workloadPools;
	}

	async function updateKeyPairs() {
		const results = await listKeyPairs({
			token: token.get().token
		});

		// Don't pick a value, it's secure by default.
		keyPairs = results;
	}

	function toggleCreateModal() {
		createModalActive = !createModalActive;

		if (createModalActive) {
			updateKeyPairs();
			updateImages();
			updateFlavors();
		}
	}

	let workloadPools = [
		{
			name: null,
			image: null,
			flavor: null,
			replicas: 3,
			labels: null
		}
	];
</script>

<Modal active={createModalActive} fixed="true">
	<form>
		<h1>Create New Cluster</h1>

		<input id="name" placeholder="Name (required)" />
		<label for="name">Must be unique, contain only characters, numbers and dashes.</label>

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

			<input id="dnsnameservers" placeholder="8.8.8.8,8.8.4.4" />
			<label for="dnsnameservers">Comma separated list of DNS name servers to use.</label>

			<input id="nodeNetwork" placeholder="192.168.0.0/16" />
			<label for="nodeNetwork">IPv4 CIDR to run Kubernetes nodes in.</label>

			<input id="podNetwork" placeholder="10.0.0.0/8" />
			<label for="podNetwork">IPv4 CIDR to run Kubernets pods in.</label>

			<input id="serviceNetwork" placeholder="127.16.0.0/12" />
			<label for="serviceNetwork">IPv4 CIDR to run Kubernetes services in.</label>

			<input id="allowedPrefixes" placeholder="1.2.3.4/32,7.8.0.0/16" />
			<label for="allowedPrefixes"
				>Comma separated list of IPv4 CIDR blocks to permit access to the Kubernetes API.</label
			>

			<input id="sans" placeholder="kubernetes.my-domain.com" />
			<label for="sans"
				>Comma separated list of X.509 subject alterative names to add to the Kubernetes API
				certificate.</label
			>
		</details>

		<h2>Control Plane</h2>

		<select id="version" bind:value={version}>
			{#each versions as v}
				<option value={v}>{v}</option>
			{/each}
		</select>
		<label for="version">Kubernetes version to provision with.</label>

		<select id="cpImage" bind:value={image}>
			{#each images as i}
				<option value={i}>{i.name}</option>
			{/each}
		</select>
		<label for="cpImage">Virtual machine image to use.</label>

		<select id="cpFlavor" bind:value={cpFlavor}>
			{#each cpFlavors as f}
				{#if f.gpus}
					<option value={f}>{f.name} ({f.cpus} core, {f.memory}Gi, {f.gpus} GPU)</option>
				{:else}
					<option value={f}>{f.name} ({f.cpus} core, {f.memory}Gi)</option>
				{/if}
			{/each}
		</select>
		<label for="cpFlavor">Virtual machine type to use.</label>

		<details>
			<summary>Advanced Options</summary>

			<div class="slider">
				<input id="replicas" type="range" min="1" max="9" step="2" bind:value={cpReplicas} />
				<span>{cpReplicas}</span>
			</div>
			<label for="replicas"
				>Number of virtual machines. The default (3) is generally cost effective while providing
				high-availability.</label
			>

			<input id="labels" placeholder="key1=value1,key2=value2" />
			<label for="labels"
				>Comma separated set of labels to apply to Kubernetes nodes on creation.</label
			>
		</details>

		<h2>Workload Pools</h2>

		<section>
			{#each workloadPools as pool}
				<input id="wpName0" placeholder="default" bind:value={pool.name} />
				<label for="wpName0">Unique name of the workload pool.</label>

				<select id="wpImage0" bind:value={pool.image}>
					{#each images as i}
						<option value={i}>{i.name}</option>
					{/each}
				</select>
				<label for="wpImage0">Virtual machine image to use.</label>

				<select id="wpFlavor0" bind:value={pool.flavor}>
					{#each flavors as f}
						{#if f.gpus}
							<option value={f}>{f.name} ({f.cpus} core, {f.memory}Gi, {f.gpus} GPU)</option>
						{:else}
							<option value={f}>{f.name} ({f.cpus} core, {f.memory}Gi)</option>
						{/if}
					{/each}
				</select>
				<label for="wpFlavor0">Virtual machine type to use.</label>

				<div class="slider">
					<input id="wpReplicas0" type="range" min="1" max="50" bind:value={pool.replicas} />
					<span>{pool.replicas}</span>
				</div>
				<label for="wpReplicas0">Number of virtual machines.</label>

				<details>
					<summary>Advanced Options</summary>
					<input id="wpLabels0" placeholder="key1=value1,key2=value2" bind:value={pool.labels} />
					<label for="wpLabels0"
						>Comma separated set of labels to apply to Kubernetes nodes on creation.</label
					>
				</details>
			{/each}

			<button class="no-margin">Remove Pool</button>
		</section>

		<button class="no-margin">Add New Pool</button>

		<div>
			<button type="submit">Submit</button>
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
	div.slider {
		display: flex;
		align-items: center;
	}
	div.slider span {
		margin-left: var(--padding);
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
