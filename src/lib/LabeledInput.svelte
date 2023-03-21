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
		border-bottom: 1px solid var(--brand);
		background-color: white;
	}
	label {
		display: block;
		font-style: italic;
		font-size: 0.75rem;
	}
</style>
