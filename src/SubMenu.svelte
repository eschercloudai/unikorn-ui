<script>
	export let label;
	export let icon;

	let expanded = false;

	function toggle(event) {
		expanded = !expanded;
	}
</script>

<li on:click={toggle}>
	<iconify-icon {icon} />
	<span>{label}</span>
	<iconify-icon class:expanded icon="material-symbols:arrow-drop-down" />
</li>
<ul class:expanded>
	<slot />
</ul>

<style>
	li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: all 0.3s ease-in-out;
	}

	li:hover {
		background-color: var(--light-grey);
	}

	span {
		flex: 1;
	}

	iconify-icon:last-child {
		transition: all 0.3s ease-in-out;
	}

	iconify-icon.expanded {
		transform: rotate(-180deg);
	}

	ul {
		max-height: 0;
		overflow: hidden;
		transition: all 0.3s ease-in-out;
	}

	ul.expanded {
		max-height: 20em;
		overflow: scroll;
	}
</style>
