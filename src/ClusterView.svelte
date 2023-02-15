<script>
	import { onMount } from 'svelte';
	import { token } from './credentials.js';

	import Breadcrumbs from './Breadcrumbs.svelte';
	import StatusHeader from './StatusHeader.svelte';

	let trail = ['Kubernetes', 'Clusters'];

	let controlPlanes = [];
	let controlPlane = null;
	let clusters = [];

	token.subscribe(async (value, kind) => {
		if (kind == 'remove') {
			controlPlanes = [];
			controlPlane = null;
			clusters = [];
			return;
		}

		try {
			let headers = new Headers();
			headers.set('Authorization', 'Bearer ' + value);

			const response = await fetch('/api/v1/controlplanes', {
				headers: headers
			});

			const result = await response.json();

			controlPlanes = result;

			if (controlPlanes.length != 0) {
				controlPlane = controlPlanes[0];
				changeControlPlane();
			}
		} catch (e) {
			// A 404 here indicates the project hasn't been provisioned.
			controlPlanes = [];
			controlPlane = null;
			clusters = [];
		}
	});

	async function changeControlPlane() {
		try {
			let headers = new Headers();
			headers.set('Authorization', 'Bearer ' + token.get());

			const response = await fetch(
				'/api/v1/controlplanes/' + controlPlane.status.name + '/clusters',
				{
					headers: headers
				}
			);

			const result = await response.json();

			clusters = result;
		} catch (e) {
			// A 404 here indicates the project hasn't been provisioned.
			clusters = [];
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

<div class="selection">
	<label for="control-plane-select">Control Plane:</label>
	<select id="control-plane-select" bind:value={controlPlane} on:change={changeControlPlane}>
		{#each controlPlanes as choice}
			<option value={choice}>{choice.status.name}</option>
		{/each}
	</select>
</div>

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
	.selection {
		display: flex;
		align-items: center;
		padding: var(--padding);
		border-bottom: 1px solid var(--brand);
	}
	.selection select {
		margin-left: 0.5em;
	}
</style>
