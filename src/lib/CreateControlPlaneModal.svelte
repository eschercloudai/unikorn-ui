<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from '$lib/credentials.js';
	import { createEventDispatcher } from 'svelte';

	import {
		createProject,
		createControlPlane,
		listApplicationBundlesControlPlane
	} from '$lib/client.js';

	import { applicationBundleFormatter } from '$lib/formatters.js';

	import Modal from '$lib/Modal.svelte';
	import TextField from '$lib/TextField.svelte';
	import SelectField from '$lib/SelectField.svelte';

	// list of control planes so we can validate the name is unique.
	export let controlPlanes;

	// active reports whether this modal is visible or not.
	export let active;

	// We will raise clusterCreated on successful cluster creation.
	const dispatch = createEventDispatcher();

	// Control plane name.
	let name = null;
	let nameValid = false;
	let nameValidMessage;

	// Control plane versioning support.
	let applicationBundles = [];
	let applicationBundle = null;

	function reset() {
		applicationBundles = [];
		applicationBundle = null;
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
		// Also don't allow users to create new end-of-life resources.
		applicationBundles = result.reverse().filter((x) => !x.endOfLife);
	}

	// Update the selected application bundle when the bundles list updates.
	$: if (applicationBundles.length != 0 && applicationBundle == null) {
		for (const b of applicationBundles) {
			if (!b.preview && !b.endOfLife) {
				applicationBundle = b;
				break;
			}
		}
	}

	const nameInvalidUnset =
		'Name must contain only lower-case characters, numbers or hyphens (-), it must start and end with a character or number, and must be at most 63 characters.';
	const nameInvalidUsed = 'Name already used by another control plane';

	function validateName(name, controlPlanes) {
		if (name == null || controlPlanes == null) {
			nameValidMessage = nameInvalidUnset;
			return false;
		}

		// RFC-1123.  Must start and end with alphanumeric.
		// Upto 63 characters, lower case alpha, numeric and -.
		if (!name.match(/^(?!-)[a-z0-9-]{0,62}[a-z0-9]$/)) {
			nameValidMessage = nameInvalidUnset;
			return false;
		}

		if (controlPlanes.some((x) => x.name == name)) {
			nameValidMessage = nameInvalidUsed;
			return false;
		}

		return true;
	}

	// Roll up validity to enable creation.
	$: allValid = [nameValid].every((x) => x);

	async function submitCreateControlPlane() {
		await createProject({
			token: token.get().token,
			onConflict: () => {
				// this is fine.
			},
			onUnauthorized: () => {
				token.remove();
			}
		});

		const body = {
			name: name,
			applicationBundle: applicationBundle
		};

		await createControlPlane({
			token: token.get().token,
			body: body,
			onBadRequest: () => {
				console.log('you have made a mistake');
			},
			onUnauthorized: () => {
				token.remove();
			},
			onConflict: () => {
				console.log('visual feedback on name clash');
			}
		});

		dispatch('created', {});
		active = false;
	}
</script>

<Modal {active} fixed="true">
	<h2 class="modal-header"><iconify-icon icon="bx:edit" />Create Control Plane</h2>
	<form>
		<TextField
			id="name"
			placeholder="Control plane name"
			help="A valid Kubernetes name, unique within the control plane"
			validator={(x) => validateName(x, controlPlanes)}
			invalidtext={nameValidMessage}
			bind:value={name}
			bind:valid={nameValid}
		/>

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
			<button
				type="submit"
				disabled={!allValid}
				on:click={submitCreateControlPlane}
				on:keydown={submitCreateControlPlane}
			>
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
</style>
