<script>
	import { selected, getBreadcrumbs } from '$lib/menu.js';

	let trail = [];

	selected.subscribe((value) => {
		if (value != null) {
			trail = getBreadcrumbs(value);
		}
	});
</script>

<div class="breadcrumbs">
	{#each trail as crumb, i}
		{#if crumb.value}
			<div>{crumb.value}</div>
			{#if i < trail.length - 1}
				<iconify-icon icon="material-symbols:chevron-right" />
			{/if}
		{/if}
	{/each}
</div>

<style>
	div.breadcrumbs {
		color: white;
		background-color: var(--brand);
		padding: var(--padding);
		display: flex;
		align-items: center;
		overflow-x: auto;
	}
</style>
