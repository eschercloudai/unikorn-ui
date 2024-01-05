<script>
	export let summary;
</script>

<details>
	<summary>
		<iconify-icon icon="material-symbols:info-outline" />
		{summary}
	</summary>

	<section>
		<slot />
	</section>
</details>

<style>
	iconify-icon {
		font-size: 1.5rem;
		color: dodgerblue;
	}
</style>
