<script>
	export let content;
</script>

<section>
	<iconify-icon icon="tabler:bulb" />
	{content}
</section>

<style>
	section {
		display: flex;
		gap: var(--padding);
		align-items: center;
		border: 1px solid var(--brand);
		background: var(--overlay);
		border-radius: var(--radius);
		padding: var(--padding);
	}
	iconify-icon {
		font-size: 1.5rem;
		color: orange;
	}
</style>
