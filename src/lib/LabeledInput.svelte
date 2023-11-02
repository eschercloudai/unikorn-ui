<script>
	export let id;
	export let value;
</script>

<div>
	<slot />
	<label for={id}>{value}</label>
</div>

<style>
	div {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		padding: var(--padding);
		gap: var(--padding);
	}
	label {
		display: block;
		font-style: italic;
		font-size: 0.75rem;
	}
</style>
