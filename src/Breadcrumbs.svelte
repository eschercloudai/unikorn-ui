<script>
	export let trail = [];
</script>

<div class="breadcrumbs">
	{#each trail as crumb, i}
		<div>{crumb}</div>
		{#if i < trail.length - 1}
			<iconify-icon icon="material-symbols:chevron-right" />
		{/if}
	{/each}
</div>

<style>
	div.breadcrumbs {
		flex: 1;
		color: white;
		background-color: var(--brand);
		padding: var(--padding);
		display: flex;
		align-items: center;
		overflow: scroll;
	}
</style>
