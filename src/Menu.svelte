<script>
	export let expanded = false;
</script>

<ul class:expanded>
	<slot />
</ul>

<style>
	ul {
		max-height: 0;
		overflow: hidden;
		margin: 0;
		padding: 0;
		transition: all 0.3s ease-in-out;
	}

	ul.expanded {
		max-height: 20em;
		overflow: scroll;
	}
</style>
