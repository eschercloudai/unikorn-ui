<script>
	export let text;

	export let icon;
</script>

<header>
	<iconify-icon {icon} />
	{text}
</header>

<style>
	header {
		display: flex;
		gap: var(--padding);
		align-items: center;
		padding: var(--padding);
		background-color: var(--brand);
		color: white;
		font-size: 1.5rem;
	}
</style>
