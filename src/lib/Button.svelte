<script>
	import { createEventDispatcher } from 'svelte';

	export let text;

	export let icon;

	const dispatch = createEventDispatcher();

	function click() {
		dispatch('message', {});
	}
</script>

<button on:click={click}>
	<iconify-icon {icon} />
	{text}
</button>

<style>
	iconify-icon {
		font-size: 1.5rem;
		color: var(--brand);
	}
</style>
