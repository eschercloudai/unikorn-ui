<script>
	import { createEventDispatcher } from 'svelte';
	import DropDownItem from '$lib/DropDownItem.svelte';

	// Unique ID for the menu instance.
	export let id;

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

	const dispatch = createEventDispatcher();

	// Intercept selection messages, close the menu, then propagate upward.
	function selected(event) {
		show = false;

		dispatch('select', {
			id: id,
			item: event.detail
		});
	}
</script>

<div class="dropdown">
	<iconify-icon {icon} on:click={toggle} on:keypress={toggle} />
	<div class="dropdown-menu" class:show>
		<ul>
			{#each items as item}
				<DropDownItem on:select={selected} id={item.id}>{item.value}</DropDownItem>
			{/each}
		</ul>
	</div>
</div>

<style>
	div.dropdown {
		position: relative;
	}
	div.dropdown-menu {
		display: none;
		position: absolute;
		top: var(--icon-size);
		right: 0;
		z-index: 1;
		background-color: white;
		border: 1px outset var(--brand);
		box-shadow: 0.25em 0.25em var(--shadow-radius) var(--mid-grey);
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
