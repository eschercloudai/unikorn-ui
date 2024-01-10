<section>
	<slot />
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		gap: var(--padding-small);
	}

	@media only screen and (min-width: 720px) {
		section {
			flex-direction: row;
			flex-wrap: wrap;
		}
	}
</style>
