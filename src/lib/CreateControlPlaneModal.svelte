<script>
	import { onDestroy } from 'svelte';
	import { token, removeCredentials } from '$lib/credentials.js';
	import { errors } from '$lib/errors.js';
	import { createEventDispatcher } from 'svelte';

	import { createControlPlane, listApplicationBundlesControlPlane } from '$lib/client.js';

	import { applicationBundleFormatter } from '$lib/formatters.js';

	import Modal from '$lib/Modal.svelte';
	import TextField from '$lib/TextField.svelte';
	import SelectField from '$lib/SelectField.svelte';
	import CheckBoxField from '$lib/CheckBoxField.svelte';
	import TimeWindowField from '$lib/TimeWindowField.svelte';

	// list of control planes so we can validate the name is unique.
	export let controlPlanes;

	// active reports whether this modal is visible or not.
	export let active;

	let accessToken;

	// We will raise clusterCreated on successful cluster creation.
	const dispatch = createEventDispatcher();

	let submitting = false;

	// Control plane name.
	let name = null;
	let nameValid = false;
	let nameValidMessage;

	// Control plane versioning support.
	let applicationBundles = [];
	let applicationBundle = null;

	let autoUpgrade = false;
	let autoUpgradeDaysOfWeek = false;

	let daysOfTheWeekWindows = {
		sunday: {},
		monday: {},
		tuesday: {},
		wednesday: {},
		thursday: {},
		friday: {},
		saturday: {}
	};

	function reset() {
		applicationBundles = [];
		applicationBundle = null;
	}

	// Close the modal.
	function close() {
		active = false;
	}

	const tokenUnsubscribe = token.subscribe(updateApplicationBundles);

	onDestroy(tokenUnsubscribe);

	async function updateApplicationBundles(t) {
		if (t == null) {
			reset();
			return;
		}

		accessToken = t;

		const result = await listApplicationBundlesControlPlane({
			token: accessToken,
			onUnauthorized: () => {
				removeCredentials();
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
		submitting = true;

		const body = {
			name: name,
			applicationBundle: applicationBundle
		};

		if (autoUpgrade) {
			// Empty object means platform managed.
			const aa = {};

			if (autoUpgradeDaysOfWeek) {
				let dow = {};

				for (const [day, o] of Object.entries(daysOfTheWeekWindows)) {
					if (!o.enabled) {
						continue;
					}

					Object.defineProperty(dow, day, {
						enumerable: true,
						value: {
							start: o.start,
							end: o.end
						}
					});
				}

				aa.daysOfWeek = dow;
			}

			body.applicationBundleAutoUpgrade = aa;
		}

		await createControlPlane({
			token: accessToken,
			body: body,
			onBadRequest: (message) => {
				if (message) {
					errors.add(message);
				}
			},
			onInternalServerError: (message) => {
				if (message) {
					errors.add(message);
				}
			},
			onUnauthorized: () => {
				removeCredentials();
			},
			onConflict: (message) => {
				if (message) {
					errors.add(message);
				}
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
					The platform can automatically upgrade control planes to provide confidence in security,
					and periodically enable new features. This section describes those defaults and, where
					applicable, allows you to fine tune those settings.
				</p>

				<SelectField
					id="appbundle"
					help="Selects the control plane version. Versions marked as <em>Preview</em> are early release
                                        candidates, and may have undergone less rigorous testing. Versions marked
                                        <em>End-of-Life</em> indicate the date when they will be automatically upgraded by the platform."
					formatter={applicationBundleFormatter}
					options={applicationBundles}
					bind:value={applicationBundle}
				/>

				<CheckBoxField
					id="autoUpgrade"
					label="Enable auto-upgrade?"
					help="Enables auto-upgrade of the control plane application bundle.  When checked the default setting will be to perform upgrades randomly from Monday-Friday 00:00-07:00 UTC.  This allows support to be be readily available in the rare event of disruption."
					bind:checked={autoUpgrade}
				/>

				{#if autoUpgrade}
					<section class="autoupgrade">
						<CheckBoxField
							id="autoUpgradeDaysOfWeek"
							label="Enable auto-upgrade scheduling?"
							help="The default auto-upgrade time-windows are recommended.  If this isn't suitable for your use case, this allows the days and time-windows to be manually specified."
							bind:checked={autoUpgradeDaysOfWeek}
						/>

						{#if autoUpgradeDaysOfWeek}
							{#each Object.keys(daysOfTheWeekWindows) as day}
								<TimeWindowField
									id="autoupgrade-{day}"
									label="Enable {day}?"
									bind:object={daysOfTheWeekWindows[day]}
								/>
							{/each}
						{/if}
					</section>
				{/if}
			</section>
		</details>

		<div class="buttons">
			{#if submitting}
				<button disabled="true">
					<iconify-icon icon="svg-spinners:ring-resize" />
					<div>Creating...</div>
				</button>
			{:else}
				<button
					type="submit"
					disabled={!allValid}
					on:click={submitCreateControlPlane}
					on:keydown={submitCreateControlPlane}
				>
					<iconify-icon icon="mdi:tick" />
					<div>Create</div>
				</button>
			{/if}
			<button on:click={close}>
				<iconify-icon icon="mdi:close" />
				<div>Cancel</div>
			</button>
		</div>
	</form>
</Modal>

<style>
	.autoupgrade {
		padding: var(--padding);
		border: 1px solid var(--brand);
		align-items: stretch;
		display: flex;
		flex-direction: column;
		gap: var(--padding);
	}
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
