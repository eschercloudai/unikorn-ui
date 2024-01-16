<script>
	import Item from '$lib/Item.svelte';
	import ItemDetail from '$lib/ItemDetail.svelte';

	export let items = [];

	export let selected = null;

	// When the list of items updates, try and maintain a reference to an
	// existing selected item;
	function updateSelected(items) {
		if (!selected) {
			return;
		}

		const results = items.filter((x) => x.name == selected.name);

		if (results.length == 0) {
			return;
		}

		selected = results[0];
	}

	$: updateSelected(items);

	// When an item is selected mark it as selected, unless it's the selected item
	// the deselect it.
	function select(item) {
		selected = selected == item ? null : item;
	}
</script>

<div class="items">
	{#each items as item}
		<Item selected={item == selected} on:message={() => select(item)}>
			<slot name="header" slot="header" {item} />
			<slot name="main" slot="main" {item} />
		</Item>

		{#if item == selected}
			<ItemDetail>
				<slot name="detail" {item} />
			</ItemDetail>
		{/if}
	{/each}
</div>

<style>
	/* In mobile view stack as rows */
	.items {
		display: flex;
		flex-direction: column;
		gap: var(--padding);
	}

	@media only screen and (min-width: 720px) {
		/* In desktop mode, create as many columns as possible for
		   a specific minimum size */
		.items {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
			grid-auto-flow: dense;
		}
	}
</style>
