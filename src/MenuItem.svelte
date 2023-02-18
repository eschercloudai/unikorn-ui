<script>
	import { selected } from './menu.js';

	export let id;
	export let label;
	export let icon = null;

	let highlight = false;

	selected.subscribe((value) => {
		highlight = value == id;
	});

	function select() {
		selected.set(id);
	}
</script>

<li class:highlight on:click={select} on:keypress={select}>
	{#if icon}
		<iconify-icon {icon} />
	{/if}
	<span class:no-icon={!icon}>{label}</span>
</li>

<style>
	li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: all 0.3s ease-in-out;
	}

	li.highlight {
		color: white;
		background-color: var(--brand);
	}

	li.highlight iconify-icon:first-child {
		color: white;
	}

	span {
		flex: 1;
	}

	.no-icon {
		padding-left: calc(var(--icon-size) + var(--padding));
	}
</style>
