<script>
	import { createEventDispatcher } from 'svelte';

	export let jumbo = false;

	export let selected = false;

	export let context = null;

	const dispatch = createEventDispatcher();

	function click() {
		dispatch('message', {
			context: context
		});
	}
</script>

<article class="item" class:jumbo class:selected on:click={click} on:keypress={click}>
	<slot />
</article>

<style>
	article {
		display: flex;
		flex-direction: column;
		gap: var(--padding);
		border: 1px solid var(--border);
		background: var(--overlay);
		border-radius: var(--radius);
		padding: var(--padding);
		cursor: pointer;
	}

	.jumbo {
		grid-column: 1 / -1;
	}

	.selected {
		background: var(--overlay-highlight);
	}
</style>
