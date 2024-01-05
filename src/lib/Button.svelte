<script>
	import { createEventDispatcher } from 'svelte';

	export let text;

	export let icon;

	export let disabled = false;

	const dispatch = createEventDispatcher();

	function click() {
		dispatch('message', {});
	}
</script>

<button on:click={click} {disabled}>
	<iconify-icon {icon} />
	{text}
</button>
