<script>
	export let content;
</script>

<section>
	<iconify-icon icon="mdi:bell-alert-outline" />
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
		padding: var(--padding-input);
	}
	iconify-icon {
		font-size: var(--icon-size);
		color: orange;
	}
</style>
