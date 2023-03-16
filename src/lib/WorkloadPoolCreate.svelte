<script>
	export let flavors;
	export let images;
	export let computeAZs;

	let name = '';
	let nameValid = false;

	let image = null;
	let flavor = null;
	let autoscaling = false;
	let replicas = 3;
	let minReplicas = 0;
	let maxReplicas = 3;
	let labels = null;
	let disk = 50;
	let computeAZ = null;

	// Set defaults when they are available.
	// TODO: the image list will change when the version does, so this
	// doesn't work properly.
	$: if (image == null && images.length != 0) {
		image = images[0];
	}
	$: if (flavor == null && flavors.length != 0) {
		flavor = flavors[0];
	}

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
</style>
