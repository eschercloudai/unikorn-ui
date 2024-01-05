<script>
	import { clickOutside } from '$lib/clickout.js';
	import DropDownItem from '$lib/DropDownItem.svelte';

	// Unique resource the menu belongs to.
	export let resource;

	// icon for the dropdown.
	export let icon;

	// items describes the menu, this is a list of objects with:
	//   id: unique menu item id
	//   value: value of the menu item (aka text)
	export let items = [];

	// disabled propagates this to individual items.
	export let disabled = false;

	let active = false;

	function show() {
		active = true;
	}

	function hide() {
		active = false;
	}

	// Intercept selection messages raise the handler and close the menu.
	function selected(event) {
		active = false;
		event.detail.handler(resource);
	}
</script>

<div class="dropdown selectable">
	<iconify-icon {icon} on:click={show} on:keypress={show} />
	{#if active}
		<div class="dropdown-menu" class:active use:clickOutside on:click_outside={hide}>
			<ul>
				{#each items as item}
					{#if !item.disablable || !disabled}
						<DropDownItem on:select={selected} {item} />
					{/if}
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	div.dropdown {
		position: relative;
		color: var(--mid-grey);
		display: flex;
	}
	div.dropdown-menu {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 1;
		background-color: var(--overlay);
		border: 1px outset var(--dark-grey);
		animation: growDown 300ms ease-in-out forwards;
		transform-origin: top;
	}
	iconify-icon {
		font-size: var(--icon-size);
	}
	@keyframes growDown {
		0% {
			transform: scaleY(0);
		}
		80% {
			transform: scaleY(1.1);
		}
		100% {
			transform: scaleY(1);
		}
	}
	@media (prefers-color-scheme: dark) {
		div.dropdown {
			color: var(--light-grey);
		}
	}
</style>
