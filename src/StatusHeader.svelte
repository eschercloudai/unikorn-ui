<script>
	import StatusIcon from './StatusIcon.svelte';

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
		font-weight: bold;
		font-size: 1.5rem;
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
		margin-left: var(--padding);
	}
</style>
