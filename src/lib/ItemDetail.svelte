<article>
	<slot />
</article>

<style>
	article {
		display: flex;
		flex-direction: column;
		gap: var(--padding);
		border: 1px solid var(--border);
		background-color: var(--overlay-highlight);
		border-radius: var(--radius);
		padding: var(--padding-small);
		grid-column: 1 / -1;
	}
</style>
