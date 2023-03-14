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

	let show = false;

	function toggle() {
		show = !show;
	}

	function hide() {
		if (show) {
			show = false;
		}
	}

	// Intercept selection messages raise the handler and close the menu.
	function selected(event) {
		show = false;
		event.detail.handler(resource);
	}
</script>

<div class="dropdown selectable">
	<iconify-icon {icon} on:click={toggle} on:keypress={toggle} />
	<div class="dropdown-menu" class:show use:clickOutside on:click_outside={hide}>
		<ul>
			{#each items as item}
				<DropDownItem on:select={selected} {item}>
					<iconify-icon icon={item.icon} />
					<div>{item.value}</div>
				</DropDownItem>
			{/each}
		</ul>
	</div>
</div>

<style>
	div.dropdown {
		position: relative;
		display: flex;
		align-items: center;
		color: var(--mid-grey);
	}
	div.dropdown-menu {
		display: none;
		position: absolute;
		top: var(--icon-size);
		right: 0;
		z-index: 1;
		background-color: white;
		border: 1px outset var(--brand);
		box-shadow: var(--shadow-offset) var(--shadow-offset) var(--radius) var(--mid-grey);
		animation: growDown 300ms ease-in-out forwards;
	}
	div.dropdown-menu.show {
		display: block;
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
</style>
