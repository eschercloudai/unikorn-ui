<script>
	import { selected } from './menu.js';
	import { get } from 'svelte/store';

	export let id;
	export let label;
	export let icon = null;

	let highlight = get(selected) == id;

	selected.subscribe((value) => {
		if (value != id) {
			highlight = false;
		}
	});

	function select() {
		selected.set(id);
		highlight = true;
	}
</script>

<li class:highlight on:click={select}>
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
