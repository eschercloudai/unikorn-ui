<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from './credentials.js';

	import Breadcrumbs from './Breadcrumbs.svelte';
	import StatusHeader from './StatusHeader.svelte';

	let trail = ['Kubernetes', 'Control Planes'];

	let controlPlanes = [];

	function reset() {
		controlPlanes = [];
	}

	onMount(() => {
		token.subscribe('control-plane-view', changeToken);
	});

	onDestroy(() => {
		token.unsubscribe('control-plane-view', changeToken);
	});

	// TODO: this is copied in the cluster view, we should cache and share.
	async function changeToken(value, kind) {
		if (kind == 'remove') {
			reset();
			return;
		}

		try {
			let headers = new Headers();
			headers.set('Authorization', 'Bearer ' + value);

			const response = await fetch('/api/v1/controlplanes', {
				headers: headers
			});

			// Check the response code, an unauthorized means we need to re-log.
			// Remove the token and let this propagate to subscribers, not found
			// is raised when the project hasn't been created.
			if (!response.ok) {
				if (response.status == 401) {
					token.remove();
					return;
				} else if (response.status == 404) {
					reset();
					return;
				}

				console.log(response);
				return;
			}

			const result = await response.json();

			controlPlanes = result;
		} catch (e) {
			console.log(e);
		}
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
</script>

<Breadcrumbs {trail} />

{#each controlPlanes as cp}
	<article>
		<StatusHeader name={cp.status.name} status={statusFromResource(cp.status)}>
			<iconify-icon icon="mdi:favorite-border" />
			<iconify-icon icon="mdi:dots-vertical" />
		</StatusHeader>
		<dl>
			<dt>Creation Time</dt>
			<dd>{cp.status.creationTime}</dd>
		</dl>
	</article>
{/each}

<style>
	article {
		margin: var(--padding);
		padding: var(--padding);
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
