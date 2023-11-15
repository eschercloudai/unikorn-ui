<script>
	import { selected, getBreadcrumbs } from '$lib/menu.js';

	let trail = [];

	selected.subscribe((value) => {
		if (value != null) {
			trail = getBreadcrumbs(value);
		}
	});
</script>

<ul>
	{#each trail as crumb, i}
		{#if crumb.value}
			<li>{crumb.value}</li>
		{/if}
	{/each}
</ul>

<style>
	ul {
		color: white;
		background-color: var(--brand-dark);
		display: flex;
		align-items: center;
		gap: 1.25em;
		overflow-x: auto;
		min-height: 2em;
	}

	li {
		position: relative;
		line-height: 2.5em;
		list-style: none;
		background-color: var(--brand);
		padding: 0 1em;
		white-space: nowrap;
	}

	li:before {
		position: absolute;
		content: '';
		border-left: 1em solid transparent;
		border-top: 2.5em solid var(--brand);
		right: 100%;
	}

	li:after {
		position: absolute;
		content: '';
		border-left: 1em solid var(--brand);
		border-top: 2.5em solid transparent;
		left: 100%;
	}
</style>
