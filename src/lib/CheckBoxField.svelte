<script>
	import LabeledInput from '$lib/LabeledInput.svelte';

	// ID of the field, for linking label text.
	export let id;

	// label associated with the check box.
	export let label;

	// checked of the field, for setting initally and binding to for updates.
	export let checked;

	// help text.
	export let help;

	// disable the input.
	export let disabled = false;
</script>

<LabeledInput {id} value={help}>
	<div class="checkbox">
		<input {id} type="checkbox" bind:checked {disabled} />
		<span>{label}</span>
	</div>
</LabeledInput>

<style>
	.checkbox {
		display: flex;
		align-items: center;
		gap: var(--padding);
	}
</style>
