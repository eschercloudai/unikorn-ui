<script>
	// ID of the field, for linking label text.
	export let id;

	// value of the field, for setting initally and binding to for updates.
	export let value;

	// help text.
	export let help;

	export let min;
	export let max;
	export let step = 0;

	// formatter allow values to be formatted.
	export let formatter = null;

	export let invalidText = null;
	export let valid;
</script>

<div class="slider">
	<input {id} type="range" {min} {max} {step} bind:value />
	{#if formatter}
		<span>{formatter(value)}</span>
	{:else}
		<span>{value}</span>
	{/if}
</div>
<label for={id} class="fieldlabel">{@html help}</label>
{#if !valid && invalidText}
	<label for={id} class="fieldlabel error">{@html invalidText}</label>
{/if}

<style>
	.slider {
		display: flex;
		align-items: center;
		gap: var(--padding);
	}
</style>
