<script>
	export let jumbo = false;

	export let selected = false;
</script>

<article class="item" class:jumbo class:selected>
	<slot />
</article>

<style>
	.item {
		display: flex;
		flex-direction: column;
		gap: var(--padding);
		border: 1px solid var(--brand);
		background: var(--overlay);
		border-radius: var(--radius);
		box-shadow: 0 0 var(--radius) var(--brand-light);
		padding: var(--padding);
	}

	.jumbo {
		grid-column: 1 / -1;
	}

	.selected {
		background: var(--overlay-brand);
	}
</style>
