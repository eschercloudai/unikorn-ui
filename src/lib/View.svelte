<section class="view">
	<slot />
</section>

<style>
	.view {
		padding: var(--padding);
		display: flex;
		flex-direction: column;
		gap: var(--padding);
		overflow-y: scroll;
		flex-grow: 1;
	}
</style>
