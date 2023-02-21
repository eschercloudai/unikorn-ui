<script>
	export let id;
	export let value;
</script>

<div>
	<label for={id}>{value}</label>
	<slot />
</div>

<style>
	div {
		display: flex;
		align-items: center;
		padding: var(--padding);
		border-bottom: 1px solid var(--brand);
	}
</style>
