<script>
	export let grow = false;
</script>

<section class:grow>
	<slot />
</section>

<style>
	section {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: var(--padding-input);
	}

	section.grow > :global(button) {
		flex-grow: 1;
	}
</style>
