<div class="items">
	<slot />
</div>

<style>
	/* In mobile view stack as rows */
	.items {
		display: flex;
		flex-direction: column;
		gap: var(--padding);
	}

	@media only screen and (min-width: 720px) {
		/* In desktop mode, create as many columns as possible for
		   a specific minimum size */
		.items {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		}
	}
</style>
