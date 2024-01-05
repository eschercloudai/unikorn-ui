<script>
	export let summary;

	export let icon;
</script>

<details>
	<summary>
		<iconify-icon {icon} />
		{summary}
	</summary>

	<section>
		<slot />
	</section>
</details>

<style>
	details > summary {
		list-style-type: none;
	}
</style>
