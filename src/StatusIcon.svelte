<script>
	export let status = 'unknown';
</script>

{#if status == 'ok'}
	<iconify-icon class="ok" icon="mdi:tick-circle-outline" />
{:else if status == 'warning'}
	<iconify-icon class="warning" icon="mdi:warning-circle-outline" />
{:else if status == 'error'}
	<iconify-icon class="error" icon="mdi:error-outline" />
{:else if status == 'progressing'}
	<iconify-icon class="progressing" icon="mdi:circle-arrows" />
{:else}
	<iconify-icon class="unknown" icon="mdi:question-mark" />
{/if}

<style>
	.ok {
		color: green;
	}
	.warning {
		color: yellow;
	}
	.error {
		color: red;
	}
	.unknown {
		color: var(--mid-grey);
	}
	.progressing {
		color: var(--mid-grey);
		animation-name: spin;
		animation-duration: 5000ms;
		animation-iteration-count: infinite;
		animation-timing-function: linear;
	}
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
