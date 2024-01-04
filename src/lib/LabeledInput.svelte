<script>
	export let id;
	export let value;
</script>

<div>
	<slot />
	<label for={id}>{@html value}</label>
</div>

<style>
	div {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: var(--padding);
	}
	label {
		display: block;
		font-style: italic;
		font-size: 0.75rem;
	}
	label > :global(em) {
		font-weight: bold;
	}
</style>
