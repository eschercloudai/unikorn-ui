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
	<slot />
</li>

<style>
	li {
		display: flex;
		align-items: center;
		gap: var(--padding);
	}
</style>
