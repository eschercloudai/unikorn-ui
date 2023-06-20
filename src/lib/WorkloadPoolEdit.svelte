<script>
	import { namedObjectFormatter, flavorFormatter } from '$lib/formatters.js';

	import TextField from '$lib/TextField.svelte';
	import SelectField from '$lib/SelectField.svelte';
	import CheckBoxField from '$lib/CheckBoxField.svelte';
	import SliderField from '$lib/SliderField.svelte';

	// existing is an existing configuration in server API format.
	export let existing;

	// Define dynamic things from the API.  Passed in from the parent.
	export let flavors;
	export let images;
	export let computeAZs;
	export let advanced;

	// These are all the things that can be configured.  With defaults for
	// creating a new pool...
	let name = '';
	let replicas = 3;
	let image;
	let flavor;
	let disk = 50;
	let autoscaling = true;
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
			labels = Object.keys(existing.labels)
				.map((x) => `${x}=${existing.labels[x]}`)
				.join(',');
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

	let nameValid = true;

	// TODO: must be unique!
	function validateName(name) {
		return name.match(/^(?!-)[a-z0-9-]{0,62}[a-z0-9]$/);
	}

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
	<TextField
		id="name"
		placeholder="Workload pool name"
		help="A valid Kubernetes name, unique within the cluster."
		validator={validateName}
		invalidtext="Name must contain only lower-case characters, numbers or hyphens (-), it must start and end
        with a character or number, and must be at most 63 characters."
		bind:value={name}
		bind:valid={nameValid}
	/>
{/if}

{#if advanced}
	<SelectField
		id="image"
		help="Virtual machine image to use."
		formatter={namedObjectFormatter}
		options={images}
		bind:value={image}
	/>
{/if}

<SelectField
	id="flavor"
	help="Virtual machine type to use."
	formatter={flavorFormatter}
	options={flavors}
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

<CheckBoxField
	id="autoscaling"
	help="Enables workload pool autoscaling."
	label="Enable autoscaling?"
	bind:checked={autoscaling}
/>

{#if autoscaling}
	<SliderField
		id="minReplicas"
		help="Minimunm number of virtual machines."
		min="0"
		max="50"
		bind:value={minReplicas}
	/>

	<!-- TODO: this should be relative to the minimum -->
	<SliderField
		id="maxReplicas"
		help="Maximunm number of virtual machines."
		min="0"
		max="50"
		bind:value={maxReplicas}
	/>
{:else}
	<SliderField
		id="replicas"
		help="Number of virtual machines."
		min="1"
		max="50"
		bind:value={replicas}
	/>
{/if}

{#if advanced}
	<details>
		<summary>Advanced Options</summary>

		<section>
			<TextField
				id="labels"
				placeholder="key1=value1,key2=value2"
				help="Comma separated set of labels to apply to Kubernetes nodes on creation."
				bind:value={labels}
			/>

			<SelectField
				id="computeAZ"
				help="Availability zone to provision the pool in."
				formatter={namedObjectFormatter}
				nullable="true"
				options={computeAZs}
				bind:value={computeAZ}
			/>
		</section>
	</details>
{/if}

<style>
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
