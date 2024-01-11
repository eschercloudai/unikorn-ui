<script>
	import { portal } from 'svelte-portal';

	export let active = false;
	export let fixed = false;
	export let width = '720px';
</script>

<div class="modal-backdrop" class:active use:portal={'#modal'}>
	<div class="modal" class:fixed style="--width: {width}">
		<slot />
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 100;
		visibility: hidden;
		opacity: 0;
		transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
	}

	.modal-backdrop.active {
		visibility: visible;
		opacity: 100%;
	}

	.modal {
		height: 100vh;
		width: 100vw;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		overflow-y: auto;
		background-color: var(--overlay);
		backdrop-filter: blur(5px);
	}

	/* Desktop overrides */
	@media only screen and (min-width: 720px) {
		.modal-backdrop {
			backdrop-filter: blur(5px);
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.modal {
			width: auto;
			height: auto;
			max-height: 80vh;
			border: 1px outset var(--border);
			border-radius: var(--radius);
		}

		.modal.fixed {
			align-items: stretch;
			width: var(--width);
		}
	}
</style>
