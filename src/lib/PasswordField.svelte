<script>
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

<input {id} type="password" {placeholder} {autocomplete} {required} bind:value />
{#if help}
	<label for={id} class="fieldlabel">{@html help}</label>
{/if}
{#if !valid && invalidtext}
	<label for={id} class="fieldlabel error">{@html invalidtext}</label>
{/if}

<style>
	:global(.fieldlabel) {
		color: var(--mid-grey);
		display: block;
		font-style: italic;
		font-size: 0.75rem;
	}
	:global(.fieldlabel > em) {
		font-weight: bold;
	}
</style>
