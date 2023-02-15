<script>
	import { onMount } from 'svelte';
	import { token } from './credentials.js';

	import Breadcrumbs from './Breadcrumbs.svelte';
	import StatusHeader from './StatusHeader.svelte';

	let trail = ['Kubernetes', 'Clusters'];

	let clusters = [];

	token.subscribe(async (value, kind) => {
		if (kind == 'remove') {
			clusters = [];
		}

		try {
			let headers = new Headers();
			headers.set('Authorization', 'Bearer ' + value);

			const response = await fetch('/api/v1/controlplanes/cluster-api0/clusters', {
				headers: headers
			});

			const result = await response.json();

			clusters = result;
		} catch (e) {
			// A 404 here indicates the project hasn't been provisioned.
			clusters = [];
		}
	});

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

{#each clusters as cl}
	<article>
		<StatusHeader name={cl.status.name} status={statusFromResource(cl.status)}>
			<iconify-icon icon="mdi:favorite-border" />
			<iconify-icon icon="mdi:dots-vertical" />
		</StatusHeader>
		<dl>
			<dt>Creation Time</dt>
			<dd>{cl.status.creationTime}</dd>
			<dt>Kubernetes Version</dt>
			<dd>{cl.controlPlane.version}</dd>
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
