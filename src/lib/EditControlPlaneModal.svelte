<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from '$lib/credentials.js';
	import { createEventDispatcher } from 'svelte';

	import { updateControlPlane, listApplicationBundlesControlPlane } from '$lib/client.js';

	import { applicationBundleFormatter } from '$lib/formatters.js';

	import Modal from '$lib/Modal.svelte';
	import SelectField from '$lib/SelectField.svelte';

	// control planes to edit.
	export let controlPlane;

	// active reports whether this modal is visible or not.
	export let active;

	// We will raise controlPlaneUpdated on successful cluster update.
	const dispatch = createEventDispatcher();

	// Control plane versioning support.
	let applicationBundles = [];
	let applicationBundle = null;

	function reset() {
		applicationBundles = [];
	}

	// Close the modal.
	function close() {
		active = false;
	}

	// id is a unique identifier for the component instance.
	let id = Symbol();

	onMount(() => {
		token.subscribe(id, updateApplicationBundles);
	});

	onDestroy(() => {
		token.unsubscribe(id);
	});

	async function updateApplicationBundles() {
		let t = token.get();

		if (t == null || t.scope == token.unscoped) {
			reset();
			return;
		}

		const result = await listApplicationBundlesControlPlane({
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			}
		});

		if (result == null) {
			return;
		}

		// These are returned in ascending order, we want latest first.
		// Don't display end-of-life bundles, unless the existing one is
		// marked EOL.
		applicationBundles = result
			.reverse()
			.filter((x) => !x.endOfLife || x.name == controlPlane.applicationBundle.name);
	}

	$: if (!applicationBundle && controlPlane && applicationBundles.length > 0) {
		applicationBundle = applicationBundles.find(
			(x) => x.name == controlPlane.applicationBundle.name
		);
	}

	async function submit() {
		// Deep copy the object, bad tends to happen when you mutate
		// something non-local.
		let body = JSON.parse(JSON.stringify(controlPlane));

		body.applicationBundle = applicationBundle;

		await updateControlPlane(controlPlane.name, {
			token: token.get().token,
			body: body,
			onBadRequest: () => {
				console.log('you have made a mistake');
			},
			onUnauthorized: () => {
				token.remove();
			}
		});

		dispatch('updated', {});

		active = false;
	}
</script>

<Modal {active} fixed="true">
	<h2 class="modal-header"><iconify-icon icon="bx:edit" />Edit Control Plane</h2>
	<form>
		<dl>
			<dt>Name</dt>
			<dd>{controlPlane.name}</dd>
		</dl>

		<details>
			<summary>Lifecycle (Advanced)</summary>

			<section>
				<p>
					The platform will automatically upgrade control planes to provide confidence in security,
					and periodically enable new features. This section describes those defaults and, where
					applicable, allows you to fine tune those settings.
				</p>

				<SelectField
					id="appbundle"
					help="Selects the control plane version. Versions marked as <em>Preview</em> are early release
                                        candidates, and may have undergone less rigorous testing. Versions marked
                                        <em>End-of-Life</em> indicate the date when they will be automatically upgraded by the platform."
					formatter={applicationBundleFormatter}
					bind:options={applicationBundles}
					bind:value={applicationBundle}
				/>
			</section>
		</details>

		<div class="buttons">
			<button type="submit" on:click={submit} on:keydown={submit}>
				<iconify-icon icon="mdi:tick" />
				<div>Submit</div>
			</button>
			<button on:click={close}>
				<iconify-icon icon="mdi:close" />
				<div>Cancel</div>
			</button>
		</div>
	</form>
</Modal>

<style>
	div.buttons {
		display: flex;
		justify-content: center;
		gap: var(--padding);
	}
	form {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		padding: var(--padding);
		gap: var(--padding);
	}
	dl {
		grid-row: 2;
		grid-column: 1 / -1;
		margin: 0;
		display: grid;
		grid-template-columns: auto 1fr;
		grid-auto-flow: column;
		grid-gap: calc(var(--padding) / 2) var(--padding);
	}
	dt {
		font-weight: bold;
		grid-column-start: 1;
	}
	dd {
		margin: 0;
	}
</style>
