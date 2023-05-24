<script>
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

<div class="checkbox">
	<input {id} type="checkbox" bind:checked {disabled} />
	<span>{label}</span>
</div>
<label for={id} class="fieldlabel">{@html help}</label>

<style>
	.checkbox {
		display: flex;
		align-items: center;
		gap: var(--padding);
	}
</style>
