<script>
	import { namedObjectFormatter, flavorFormatter } from '$lib/formatters.js';

	import TextField from '$lib/TextField.svelte';
	import SelectField from '$lib/SelectField.svelte';
	import CheckBoxField from '$lib/CheckBoxField.svelte';
	import SliderField from '$lib/SliderField.svelte';
	import Details from '$lib/Details.svelte';

	export let flavors;
	export let images;
	export let computeAZs;
	export let advanced;

	let name = '';
	let nameValid = false;

	let image = null;
	let flavor = null;
	let autoscaling = true;
	let replicas = 3;
	let minReplicas = 0;
	let maxReplicas = 3;
	let labels = null;
	let disk = 50;
	let computeAZ = null;

	// Set defaults when they are available.
	function changeImages(images) {
		if (images.length != 0) {
			image = images[0];
		}
	}

	$: changeImages(images);

	function changeFlavors(flavors) {
		if (flavors.length != 0) {
			flavor = flavors[0];
		}
	}

	$: changeFlavors(flavors);

	let maxReplicasValid = true;

	$: maxReplicasValid = autoscaling ? maxReplicas > minReplicas : true;

	// TODO: must be unique!
	function validateName(name) {
		return name.match(/^(?!-)[a-z0-9-]{0,62}[a-z0-9]$/);
	}

	$: valid = [nameValid, maxReplicasValid].every((x) => x);

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

<TextField
	id="name"
	placeholder="Workload pool name"
	help="A valid Kubernetes name, unique within the cluster.  This will present itself on Kubernetes nodes as the label <em>topology.eschercloud.ai/node-pool</em>."
	validator={validateName}
	invalidtext="Name must contain only lower-case characters, numbers or hyphens (-), it must start and end
	with a character or number, and must be at most 63 characters."
	bind:value={name}
	bind:valid={nameValid}
/>

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
		help="Minimum number of virtual machines."
		min="0"
		max="50"
		bind:value={minReplicas}
	/>

	<!-- TODO: this should be relative to the minimum -->
	<SliderField
		id="maxReplicas"
		help="Maximum number of virtual machines."
		min="0"
		max="50"
		bind:value={maxReplicas}
		bind:valid={maxReplicasValid}
		invalidText="Maximum replicas must be greater than minimum replicas"
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
	<Details summary="Advanced Options" icon="mdi:cog">
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
	</Details>
{/if}
