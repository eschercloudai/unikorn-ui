<script>
	import { createEventDispatcher } from 'svelte';

	// id is a unique identifier within the menu.
	export let item;

	// disabled allows the parent to control when the item is clickable.
	export let disabled;

	$: itemDisabled = item.disablable && disabled;

	const dispatch = createEventDispatcher();

	function click() {
		if (!itemDisabled) {
			dispatch('select', item);
		}
	}
</script>

<li class="selectable" class:disabled={itemDisabled} on:click={click} on:keypress={click}>
	<slot />
</li>

<style>
	.disabled {
		cursor: not-allowed;
		color: var(--mid-grey);
	}
	li {
		display: flex;
		align-items: center;
		gap: var(--padding);
	}
</style>
