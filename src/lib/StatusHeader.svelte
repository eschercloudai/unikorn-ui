<script>
	import StatusIcon from '$lib/StatusIcon.svelte';

	export let name;
	export let status;
</script>

<div class="header">
	<div class="title">
		<StatusIcon {status} />
		<div class="name">{name}</div>
	</div>
	<div class="widgets">
		<slot />
	</div>
</div>

<style>
	.header {
		color: var(--brand);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.title,
	.widgets {
		display: flex;
		align-items: center;
	}
	.name {
		font-weight: bold;
		margin-left: var(--padding);
	}
</style>
