<script>
	import { onDestroy } from 'svelte';
	import { token, removeCredentials } from '$lib/credentials.js';
	import { errors } from '$lib/errors.js';
	import { createEventDispatcher } from 'svelte';

	import { updateControlPlane, listApplicationBundlesControlPlane } from '$lib/client.js';

	import { applicationBundleFormatter } from '$lib/formatters.js';

	import Modal from '$lib/Modal.svelte';
	import SelectField from '$lib/SelectField.svelte';
	import CheckBoxField from '$lib/CheckBoxField.svelte';
	import TimeWindowField from '$lib/TimeWindowField.svelte';
	import Details from '$lib/Details.svelte';
	import Button from '$lib/Button.svelte';
	import Ribbon from '$lib/Ribbon.svelte';

	// control planes to edit.
	export let controlPlane;

	// active reports whether this modal is visible or not.
	export let active;

	// We will raise controlPlaneUpdated on successful cluster update.
	const dispatch = createEventDispatcher();

	let submitting = false;

	let accessToken;

	// Control plane versioning support.
	let applicationBundles = [];
	let applicationBundle = null;

	let autoUpgrade = controlPlane.applicationBundleAutoUpgrade != null;
	let autoUpgradeDaysOfWeek =
		controlPlane.applicationBundleAutoUpgrade != null &&
		controlPlane.applicationBundleAutoUpgrade.daysOfWeek != null;

	let daysOfTheWeekWindows = {
		sunday: {},
		monday: {},
		tuesday: {},
		wednesday: {},
		thursday: {},
		friday: {},
		saturday: {}
	};

	function getExistingDayOfWeek(day) {
		if (!controlPlane.applicationBundleAutoUpgrade) {
			return null;
		}

		if (!controlPlane.applicationBundleAutoUpgrade.daysOfWeek) {
			return null;
		}

		const desc = Object.getOwnPropertyDescriptor(
			controlPlane.applicationBundleAutoUpgrade.daysOfWeek,
			day
		);
		if (!desc) {
			return null;
		}

		return desc.value;
	}

	function reset() {
		applicationBundles = [];
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
		submitting = true;

		// Deep copy the object, bad tends to happen when you mutate
		// something non-local.
		let body = JSON.parse(JSON.stringify(controlPlane));

		body.applicationBundle = applicationBundle;

		delete body.applicationBundleAutoUpgrade;

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

		await updateControlPlane(controlPlane.name, {
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
			}
		});

		dispatch('updated', {});

		active = false;
	}
</script>

<Modal {active} fixed="true">
	<h2 class="modal-header"><iconify-icon icon="bx:edit" />Update Control Plane</h2>
	<form>
		<dl>
			<dt>Name</dt>
			<dd>{controlPlane.name}</dd>
		</dl>

		<Details summary="Lifecycle (Advanced)" icon="material-symbols:cycle-rounded">
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
								existing={getExistingDayOfWeek(day)}
								bind:object={daysOfTheWeekWindows[day]}
							/>
						{/each}
					{/if}
				</section>
			{/if}
		</Details>

		<Ribbon grow="true">
			{#if submitting}
				<Button text="Updating..." icon="svg-spinners:ring-resize" disabled="true" />
			{:else}
				<Button text="Update" icon="mdi:tick" on:message={submit} />
			{/if}
			<Button text="Cancel" icon="mdi:close" on:message={close} />
		</Ribbon>
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
	form {
		display: flex;
		flex-direction: column;
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
