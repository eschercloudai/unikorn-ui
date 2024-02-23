<script>
	export let summary;

	export let icon;

	export let color;
</script>

<details>
	<summary>
		<iconify-icon {icon} style:color />
		{summary}
	</summary>

	<section>
		<slot />
	</section>
</details>

<style>
	details[open] {
		width: 100%;
	}
	details[open] > summary {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}
	summary {
		background-color: var(--brand);
		border-radius: var(--radius);
		list-style-type: none;
		cursor: pointer;
		display: flex;
		gap: var(--padding);
		align-items: center;
		padding: var(--padding-small);
		color: white;
		transition: all 0.3s ease-in-out;
	}
	summary:hover {
		background-color: var(--brand-dark);
	}
	section {
		display: flex;
		flex-direction: column;
		gap: var(--padding);
		padding: var(--padding-small);
		background-color: var(--overlay);
		border-bottom-left-radius: var(--radius);
		border-bottom-right-radius: var(--radius);
		border: 1px solid var(--brand);
	}

	/* Color preference overrides */
	@media (prefers-color-scheme: dark) {
		summary {
			background-color: var(--brand-dark);
		}
		summary:hover {
			background-color: var(--brand);
		}
		section {
			border: 1px solid var(--brand-dark);
		}
	}
</style>
