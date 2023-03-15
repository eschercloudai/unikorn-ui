<script>
	// existing is an existing configuration in server API format.
	export let existing;

	// Define dynamic things from the API.  Passed in from the parent.
	export let flavors;
	export let images;
	export let computeAZs;

	// These are all the things that can be configured.  With defaults for
	// creating a new pool...
	let name = '';
	let replicas = 3;
	let image;
	let flavor;
	let disk = 50;
	let autoscaling = false;
	let minReplicas = 0;
	let maxReplicas = 3;
	let labels = null;
	let computeAZ = null;

	// Existing pools on the other hand can override these defaults.
	if (existing) {
		name = existing.name;
		replicas = existing.machine.replicas;
		disk = existing.machine.disk.size;

		if (existing.autoscaling) {
			autoscaling = true;
			minReplicas = existing.autoscaling.minimumReplicas;
			maxReplicas = existing.autoscaling.maximumReplicas;
		}

		if (existing.labels) {
			labels = existing.labels.keys.map((x) => `${x}=${existing.labels[x]}`).join(',');
		}
	}

	// When images are available update the image selection.  List the control
	// plane, try keep the existing image in order to avoid rolling upgrades.
	function changeImages(images) {
		if (images.length == 0) {
			return;
		}

		if (existing) {
			const existingImage = images.find((x) => x.name == existing.machine.imageName);
			if (existingImage) {
				image = existingImage;
				return;
			}
		}

		image = images[0];
	}

	$: changeImages(images);

	// Update the chosen flavor when the flavors are available.
	function changeFlavours(flavors) {
		if (flavors.length == 0) {
			return;
		}

		if (existing) {
			const existingFlavor = flavors.find((x) => x.name == existing.machine.flavorName);
			if (existingFlavor) {
				flavor = existingFlavor;
				return;
			}
		}

		flavor = flavors[0];
	}

	$: changeFlavours(flavors);

	// Update availability zones when they are available.
	function changeComputeAZs(computeAZs) {
		if (computeAZs.length == 0) {
			return;
		}

		if (existing && existing.machine.availabilityZone) {
			const existingAZ = computeAZs.find((x) => x == existing.machine.availabilityZone);
			if (existingAZ) {
				computeAZ = existingAZ;
				return;
			}
		}
	}

	$: changeComputeAZs(computeAZs);

	// Check if the name constraints are valid.  RFC-1123.
	// Upto 63 characters, lower case alpha, numeric and -.
	// Must start and end with alphanumeric.
	$: nameValid = name.match(/^(?!-)[a-z0-9-]{0,62}[a-z0-9]$/);

	$: valid = [nameValid].every((x) => x);

	// Roll up all the parameters in an easy to use/bind variable.
	// On an update to any of the variables, update the object/any bindings
	// and notify any listeners of the change.
	export let object;

	$: {
		object = {
			valid: valid,
			name: name,
			image: image,
			flavor: flavor,
			autoscaling: autoscaling,
			replicas: replicas,
			minReplicas: minReplicas,
			maxReplicas: maxReplicas,
			labels: labels,
			disk: disk,
			computeAZ: computeAZ
		};
	}
</script>

{#if existing}
	<dl>
		<dt>Name</dt>
		<dd>{existing.name}</dd>
	</dl>
{:else}
	<input id="name" type="text" placeholder="Workload pool name" bind:value={name} />
	<label for="name"
		>Workload pool name. Must be unique, contain only characters, numbers and dashes.</label
	>
	{#if !nameValid}
		<label for="name" class="error"
			>Name must contain only lower-case characters, numbers or hyphens (-), it must start and end
			with a character or number, and must be at most 63 characters.</label
		>
	{/if}
{/if}

<select id="image" bind:value={image} required>
	{#each images as i}
		<option value={i}>{i.name}</option>
	{/each}
</select>
<label for="image">Virtual machine image to use.</label>

<select id="flavor" bind:value={flavor} required>
	{#each flavors as f}
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

<div class="checkbox">
	<input id="autoscaling" type="checkbox" bind:checked={autoscaling} />
	<span>Autoscaling enabled</span>
</div>
<label for="autoscaling">Enables workload pool autoscaling.</label>

{#if autoscaling}
	<div class="slider">
		<input id="minReplicas" type="range" min="0" max="50" bind:value={minReplicas} />
		<span>{minReplicas}</span>
	</div>
	<label for="minReplicas">Minumum number of virtual machines.</label>

	<!-- TODO: this should be relative to the minimum -->
	<div class="slider">
		<input id="maxReplicas" type="range" min="0" max="50" bind:value={maxReplicas} />
		<span>{maxReplicas}</span>
	</div>
	<label for="maxReplicas">Maximunm number of virtual machines.</label>
{:else}
	<div class="slider">
		<input id="meplicas" type="range" min="1" max="50" bind:value={replicas} />
		<span>{replicas}</span>
	</div>
	<label for="replicas">Number of virtual machines.</label>
{/if}

<details>
	<summary>Advanced Options</summary>
	<input id="labels" type="text" placeholder="key1=value1,key2=value2" bind:value={labels} />
	<label for="labels">Comma separated set of labels to apply to Kubernetes nodes on creation.</label
	>

	<select id="computeAZ" bind:value={computeAZ} required>
		<option value={null}>(None)</option>
		{#each computeAZs as a}
			<option value={a}>{a.name}</option>
		{/each}
	</select>
	<label for="image">Availability zone to provision the pool in.</label>
</details>

<style>
	label {
		display: block;
		font-style: italic;
		font-size: 0.75rem;
		margin-bottom: var(--padding);
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
