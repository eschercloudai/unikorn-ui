<script>
	export let label;
	export let icon;
</script>

<li>
	{#if icon}
		<iconify-icon {icon} />
	{/if}
	<label class:no-icon={!icon}>{label}</label>
</li>

<style>
	li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5em;
		list-style: none;
		transition: all 0.3s ease-in-out;
	}

	li:hover {
		background-color: var(--light-grey);
	}

	label {
		flex: 1;
		color: var(--mid-grey);
	}

	label:hover {
		color: var(--dark-grey);
	}

	iconify-icon {
		color: var(--brand);
		font-size: 2em;
		font-weight: bold;
		margin-right: 0.5em;
	}

	.no-icon {
		margin-left: 3em;
	}
</style>
