<script>
	import { createEventDispatcher } from 'svelte';

	// id is a unique identifier within the menu.
	export let item;

	const dispatch = createEventDispatcher();

	function click() {
		dispatch('select', item);
	}
</script>

<li class="selectable" on:click={click} on:keypress={click}>
	<iconify-icon icon={item.icon} />
	<div>{item.value}</div>
</li>

<style>
	li {
		display: flex;
		align-items: center;
		gap: var(--padding);
		color: var(--dark-grey);
		padding: var(--padding);
		list-style: none;
		transition: all 0.3s ease-in-out;
	}
	li:hover {
		color: black;
		background-color: var(--light-grey);
	}
	li > iconify-icon {
		color: var(--brand);
		font-size: var(--icon-size);
	}
</style>
