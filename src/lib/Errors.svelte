<script>
	import { onMount, onDestroy } from 'svelte';
	import { errors } from '$lib/errors.js';

	let list = [];
	let unsubscribe = null;

	function update(value) {
		list = value;
	}

	onMount(() => {
		unsubscribe = errors.subscribe(update);
	});

	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});

	function remove(index) {
		errors.remove(index);
	}
</script>

{#if list.length > 0}
	<div class="errorlist">
		{#each list as error, index}
			<div class="erroritem">
				<iconify-icon icon="mdi:error-outline" />
				<div class="errortext">
					{error}
				</div>
				<iconify-icon
					class="selectable"
					icon="mdi:close"
					on:click={() => remove(index)}
					on:keypress={() => remove(index)}
				/>
			</div>
		{/each}
	</div>
{/if}

<style>
	.errorlist {
		display: flex;
		flex-direction: column;
	}
	.erroritem {
		color: white;
		background-color: var(--error);
		display: flex;
		align-items: center;
		gap: var(--padding);
		padding: var(--padding);
	}
	.errortext {
		flex: 1;
		font-weight: bold;
	}
	iconify-icon {
		font-size: 1.5rem;
	}
</style>
