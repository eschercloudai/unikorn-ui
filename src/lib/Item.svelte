<article class="item">
	<slot />
</article>

<style>
	.item {
		display: flex;
		flex-direction: column;
		gap: var(--padding);
		border: 1px solid var(--dark-grey);
		background: var(--overlay);
		border-radius: var(--radius);
		box-shadow: 0 0 var(--radius) var(--brand-light);
		padding: var(--padding);
	}
</style>
