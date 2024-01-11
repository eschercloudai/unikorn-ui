<section>
	<div>Loading...</div>
	<iconify-icon icon="svg-spinners:3-dots-fade" />
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		justify-content: center;
		align-items: center;
		padding: var(--padding);
		font-size: 2rem;
		color: var(--brand);
	}

	/* Color preference overrides */
	@media (prefers-color-scheme: dark) {
		section {
			color: #eee;
		}
	}
</style>
