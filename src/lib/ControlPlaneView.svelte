<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from '$lib/credentials.js';
	import { age } from '$lib/time.js';
	import { listControlPlanes, deleteControlPlane } from '$lib/client.js';

	import Breadcrumbs from '$lib/Breadcrumbs.svelte';
	import StatusHeader from '$lib/StatusHeader.svelte';
	import DropDownIcon from '$lib/DropDownIcon.svelte';

	let trail = ['Kubernetes', 'Control Planes'];

	let controlPlanes = [];

	function reset() {
		controlPlanes = [];
	}

	// id is a unique identifier for the component instance.
	let id = Symbol();

	let ticker = null;

	onMount(() => {
		token.subscribe(id, updateControlPlanes);
		ticker = setInterval(updateControlPlanes, 10000);
	});

	onDestroy(() => {
		clearInterval(ticker);
		token.unsubscribe(id);
	});

	async function updateControlPlanes() {
		let t = token.get();

		if (t == null || t.scope == token.unscoped) {
			reset();
			return;
		}

		const result = await listControlPlanes({
			token: token.get().token,
			onUnauthorized: () => {
				token.remove();
			},
			onNotFound: () => {
				reset();
			}
		});

		if (result == null) {
			return;
		}

		controlPlanes = result;
	}

	function statusFromResource(status) {
		if (status.status == 'Provisioned') {
			return 'ok';
		} else if (['Provisioning', 'Deprovisioning'].includes(status.status)) {
			return 'progressing';
		} else if (['Unknown', 'Cancelled'].includes(status.status)) {
			return 'warning';
		} else {
			return 'error';
		}
	}

	// Define the per-control plane drop down menu.
	let dropdownItems = [
		{ id: 'detail', value: 'Show Details' },
		{ id: 'delete', value: 'Delete' }
	];

	async function selected(event) {
		if (event.detail.item.id == 'delete') {
			await deleteControlPlane(event.detail.id, {
				token: token.get().token,
				onUnauthorized: () => {
					token.remove();
				}
			});

			updateControlPlanes();
		}
	}
</script>

<Breadcrumbs {trail} />

<section>
	<p>Kubernetes control planes manage the lifecycle of Kubernetes clusters.</p>
	<details>
		<summary>Details</summary>
		<p>
			Kubernetes control planes manage Kubernetes cluster creation, updates, upgrades, and deletion.
			A Kubernetes cluster is managed by a single control plane, providing groupings of Kubernetes
			clusters.
		</p>
		<p>
			You may group clusters based on stability e.g. prodiction, staging, development. This allows
			upgrades to be tested in a staging control plane before applying those changes to a production
			one.
		</p>
	</details>
</section>

{#each controlPlanes as cp}
	<article>
		<StatusHeader name={cp.status.name} status={statusFromResource(cp.status)}>
			<iconify-icon icon="mdi:favorite-border" />
			<DropDownIcon
				icon="mdi:dots-vertical"
				id={cp.status.name}
				items={dropdownItems}
				on:select={selected}
			/>
		</StatusHeader>
		<dl>
			<dt>Creation Time</dt>
			<dd>{age(cp.status.creationTime)}</dd>
			<dt>Status</dt>
			<dd>{cp.status.status}</dd>
		</dl>
	</article>
{/each}

<style>
	article {
		border: 1px outset var(--brand);
		border-radius: var(--radius);
		box-shadow: 0.25em 0.25em var(--shadow-radius) var(--mid-grey);
	}
	dt {
		font-weight: bold;
	}
	dd {
		margin: 0;
	}
	dd:not(:last-child) {
		margin-bottom: var(--padding);
	}
</style>
