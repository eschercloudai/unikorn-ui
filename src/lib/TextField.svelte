<script>
	import LabeledInput from '$lib/LabeledInput.svelte';

	// ID of the field, for linking label text.
	export let id;

	// value of the field, for setting initally and binding to for updates.
	export let value;

	// placeholder text.
	export let placeholder;

	// help text.
	export let help;

	// autocomplete hints.
	export let autocomplete;

	// required field, for when validators are overkill.
	export let required;

	// validator callback function (optional).
	export let validator = null;

	// text to explain why something is invalid.
	export let invalidtext = null;

	// reactive validation.
	export let valid;

	$: valid = validator ? validator(value) : true;
</script>

<LabeledInput {id} value={help}>
	<input {id} type="text" {placeholder} {autocomplete} {required} bind:value />
</LabeledInput>

{#if !valid && invalidtext}
	<label for={id} class="error">{@html invalidtext}</label>
{/if}
