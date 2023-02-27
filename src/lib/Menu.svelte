<script>
	import { selected } from '$lib/menu.js';

	export let id;
	export let value = null;
	export let icon = null;
	export let children = null;

	export let expanded = false;

	function toggle() {
		expanded = !expanded;
	}

	let highlight = false;

	selected.subscribe((value) => {
		highlight = value == id;
	});

	function select() {
		selected.set(id);
	}
</script>

{#if value}
	{#if children}
		<div class="item" on:click={toggle} on:keypress={toggle}>
			{#if icon}
				<iconify-icon {icon} />
			{/if}
			<span>{value}</span>
			{#if children}
				<iconify-icon class:expanded icon="material-symbols:arrow-drop-down" />
			{/if}
		</div>
	{:else}
		<div class="item" class:highlight on:click={select} on:keypress={select}>
			{#if icon}
				<iconify-icon {icon} />
			{/if}
			<span class:no-icon={!icon}>{value}</span>
			{#if children}
				<iconify-icon class:expanded icon="material-symbols:arrow-drop-down" />
			{/if}
		</div>
	{/if}
{/if}

{#if children}
	<div class="children" class:expanded>
		{#each children as child}
			<svelte:self {...child} />
		{/each}
	</div>
{/if}

<style>
	div.item {
		color: var(--mid-grey);
		padding: var(--padding);
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: all 0.3s ease-in-out;
	}
	div.item:hover {
		color: var(--dark-grey);
		background-color: var(--light-grey);
	}
	div.item span {
		flex: 1;
	}
	iconify-icon {
		font-size: var(--nav-icon-size);
	}
	iconify-icon:first-child {
		color: var(--brand);
		margin-right: var(--padding);
	}
	iconify-icon:last-child {
		transition: all 0.3s ease-in-out;
	}
	iconify-icon.expanded {
		transform: rotate(-180deg);
	}
	div.children {
		max-height: 0;
		overflow: hidden;
		transition: all 0.3s ease-in-out;
	}
	div.expanded {
		max-height: 20em;
		overflow: scroll;
	}
	.no-icon {
		padding-left: calc(var(--nav-icon-size) + var(--padding));
	}
	div.item.highlight {
		color: white;
		background-color: var(--brand);
	}
	div.item.highlight iconify-icon:first-child {
		color: white;
	}
</style>
