<script>
	import { onMount } from 'svelte';

	export let trail = [];
</script>

<section>
	{#each trail as crumb, i}
		<div class="crumb">
			<div>{crumb}</div>
			{#if i < trail.length - 1}
				<iconify-icon icon="material-symbols:chevron-right" />
			{/if}
		</div>
	{/each}
</section>

<style>
	section {
		width: 100%;
		color: white;
		background-color: var(--brand);
		padding: var(--padding);
		display: flex;
		flex-wrap: wrap;
		align-content: center;
	}
	div.crumb {
		display: flex;
		align-items: center;
	}
</style>
