<script>
	// ID of the field, for linking label text.
	export let id;

	// value of the field, for setting initally and binding to for updates.
	export let value;

	// options that can be selector.
	export let options;

	// whether we provide a null/unset option.
	export let nullable = false;

	// formatter allow values to be formatted.
	export let formatter = null;

	// help text.
	export let help;
</script>

<select {id} bind:value>
	{#if nullable}
		<option value={null}>(None)</option>
	{/if}
	{#each options as o}
		{#if formatter}
			<option value={o}>{formatter(o)}</option>
		{:else}
			<option value={o}>{o}</option>
		{/if}
	{/each}
</select>
<label for={id} class="fieldlabel">{@html help}</label>
