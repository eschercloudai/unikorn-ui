<div class="modal-backdrop">
	<div class="modal">
		<slot />
	</div>
</div>

<style>
	.modal-backdrop {
		z-index: 100;
	}

	.modal {
		height: 100vh;
		width: 100vw;
		display: flex;
		flex-direction: column;
		align-items: center;
		background-color: var(--light-grey);
	}

	/* Desktop overrides */
	@media only screen and (min-width: 720px) {
		.modal-backdrop {
			position: fixed;
			width: 100vw;
			height: 100vh;
			backdrop-filter: blur(5px);
			display: flex;
			align-items: center;
			justify-content: center;
			transition: opacity 0.3s ease-in-out, visibility 0s ease-in 0.3s;
		}

		.modal {
			width: auto;
			height: auto;
			border: 1px outset var(--brand);
			border-radius: var(--radius);
			box-shadow: 0.25em 0.25em var(--shadow-radius) var(--mid-grey);
		}
	}
</style>
