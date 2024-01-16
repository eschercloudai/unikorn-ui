<script>
	import { createEventDispatcher } from 'svelte';

	export let selected = false;

	const dispatch = createEventDispatcher();

	function click() {
		dispatch('message', {});
	}
</script>

<article on:click={click} on:keypress={click}>
	<header class:selected>
		<slot name="header" />
	</header>
	<main class:selected>
		<slot name="main" />
	</main>
</article>

<style>
	article {
		cursor: pointer;
	}
	header {
		color: white;
		background-color: var(--brand);
		padding: var(--padding-small);
		border-top-right-radius: var(--radius);
		border-top-left-radius: var(--radius);
	}
	main {
		background-color: var(--overlay);
		padding: var(--padding-small);
		border: 1px solid var(--brand);
		border-bottom-right-radius: var(--radius);
		border-bottom-left-radius: var(--radius);
	}
	header.selected {
		background-color: var(--brand-light);
	}
	main.selected {
		border: 1px solid var(--brand-light);
		background-color: var(--overlay-highlight);
	}

	@media (prefers-color-scheme: dark) {
		header {
			color: white;
			background-color: var(--brand-dark);
		}
		main {
			background-color: var(--overlay);
			border: 1px solid var(--brand-dark);
		}
		header.selected {
			background-color: var(--brand);
		}
		main.selected {
			border: 1px solid var(--brand);
		}
	}
</style>
