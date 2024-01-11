<script>
	export let version;

	export let preview;

	export let endOfLife;
</script>

{version}

{#if preview}
	<span>Preview</span>
{/if}

{#if endOfLife}
	<span>EoL {endOfLife}</span>
{/if}

<style>
	span {
		font-size: 0.75rem;
		color: var(--mid-grey);
	}
</style>
