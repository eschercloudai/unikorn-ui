<section>
	<h4><iconify-icon icon="mdi:tools" />Tools</h4>
	<slot />
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		gap: var(--padding);
		background-color: var(--overlay);
		padding: var(--padding);
		border-bottom: 1px solid var(--brand);
	}

	h4 {
		display: flex;
		align-items: center;
		gap: var(--padding);
		color: var(--brand);
	}
</style>
