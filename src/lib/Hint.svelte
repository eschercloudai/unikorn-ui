<section>
	<iconify-icon icon="tabler:bulb" />
	<div>
		<slot />
	</div>
</section>

<style>
	section {
		display: flex;
		gap: var(--padding-small);
		align-items: center;
		border: 1px solid var(--brand);
		background: var(--overlay);
		border-radius: var(--radius);
		padding: var(--padding-small);
	}
	iconify-icon {
		color: orange;
	}
</style>
