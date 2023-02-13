<script>
	import Menu from './Menu.svelte';

	export let label;
	export let icon;

	let expanded = false;

	function toggle(event) {
		expanded = !expanded;
	}
</script>

<li on:click={toggle}>
	<iconify-icon {icon} />
	<label>{label}</label>
	<iconify-icon class:expanded icon="material-symbols:arrow-drop-down" />
</li>
<Menu expanded={expanded}>
	<slot/>
</Menu>

<style>
	li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5em;
		list-style: none;
		transition: all 0.3s ease-in-out;
	}

	li:hover {
		background-color: var(--light-grey);
	}

	label {
		flex: 1;
		color: var(--mid-grey);
	}

	label:hover {
		color: var(--dark-grey);
	}

	iconify-icon {
		color: var(--brand);
		font-size: 2em;
		font-weight: bold;
		margin-right: 0.5em;
	}

	iconify-icon.expanded {
		transform: rotate(180deg);
	}
</style>
