<script>
	export let summary;
</script>

<details>
	<summary>
		<iconify-icon icon="mdi:filter-outline" />
		{summary}
	</summary>

	<section>
		<slot />
	</section>
</details>

<style>
	details > summary {
		font-weight: bold;
		list-style-type: none;
	}

	iconify-icon {
		font-size: 1.5rem;
		color: var(--brand);
	}
</style>
