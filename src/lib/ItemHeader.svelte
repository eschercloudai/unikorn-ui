<script>
	import StatusIcon from '$lib/StatusIcon.svelte';

	export let name;
	export let status = 'unknown';
	export let alert = false;
</script>

<section>
	<StatusIcon {status} />
	<span>{name}</span>
	{#if alert}
		<iconify-icon icon="mdi:bell-alert-outline" />
	{/if}
</section>

<style>
	section {
		display: flex;
		gap: var(--padding);
		align-items: center;
	}
	span {
		font-weight: bold;
		flex-grow: 1;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	iconify-icon {
		font-size: var(--icon-size);
		color: orange;
	}
</style>
