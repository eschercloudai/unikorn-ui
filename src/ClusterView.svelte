<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from './credentials.js';

	import Breadcrumbs from './Breadcrumbs.svelte';
	import StatusHeader from './StatusHeader.svelte';

	let trail = ['Kubernetes', 'Clusters'];

	let controlPlanes = [];
	let controlPlane = null;
	let clusters = [];

	function reset() {
		controlPlanes = [];
		controlPlane = null;
		clusters = [];
	}

	// id is a unique identifier for the component instance.
	let id = Symbol();

	// ticker does periodic updates.
	let ticker = null;

	onMount(() => {
		token.subscribe(id, changeToken);
		ticker = setInterval(changeControlPlane, 10000);
	});

	onDestroy(() => {
		clearInterval(ticker);
		token.unsubscribe(id);
	});

	async function changeToken(value, scope) {
		if (value == null || scope == token.unscoped) {
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

			if (controlPlanes.length != 0) {
				controlPlane = controlPlanes[0];
				changeControlPlane();
			}
		} catch (e) {
			console.log(e);
		}
	}

	async function changeControlPlane() {
		if (controlPlane == null) {
			return;
		}

		try {
			let headers = new Headers();
			headers.set('Authorization', 'Bearer ' + token.get());

			const response = await fetch(`/api/v1/controlplanes/${controlPlane.status.name}/clusters`, {
				headers: headers
			});

			// Check the response code, an unauthorized means we need to re-log.
			// Remove the token and let this propagate to subscribers.
			if (!response.ok) {
				if (response.status == 401) {
					token.remove();
					return;
				}

				console.log(response);
				return;
			}

			const result = await response.json();

			clusters = result;
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
	@media only screen and (min-width: 720px) {
		dl {
			display: grid;
			grid-auto-flow: column;
			grid-template-rows: auto auto;
		}
		dd:not(:last-child) {
			margin-bottom: 0;
		}
	}
</style>
