<article class="item">
	<slot />
</article>

<style>
	.item {
		display: flex;
		flex-direction: column;
		gap: var(--padding);
		border: 1px solid var(--dark-grey);
		background: white;
		border-radius: var(--radius);
		box-shadow: var(--shadow-offset) var(--shadow-offset) var(--radius) var(--mid-grey);
		padding: var(--padding);
	}
</style>
