<script>
	import Details from '$lib/Details.svelte';

	export let summary;
</script>

<Details {summary} icon="material-symbols:info-outline" color="skyblue">
	<slot />
</Details>
