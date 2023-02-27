<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from '$lib/credentials.js';
	import { createToken } from '$lib/client.js';
	import Modal from '$lib/Modal.svelte';

	// showlogin depends on the value of the token, get the initial value
	// from the store and update accordingly.
	//let showlogin = sessionStorage.get('token') == null;
	let showlogin = token.get() == null;

	// id is a unique identifier for the component instance.
	let id = Symbol();

	onMount(() => {
		token.subscribe(id, changeToken);
	});

	onDestroy(() => {
		token.unsubscribe(id);
	});

	function changeToken(value) {
		showlogin = value == null;
	}

	let username = '';
	let password = '';

	// login does just that, extracts the form data using binding and sends the
	// request, updating the token on success.
	async function login() {
		let result = await createToken({
			username: username,
			password: password,
			onUnauthorized: () => {
				/* TODO: User feedback */
			}
		});

		if (token == null) {
			return;
		}

		token.set(result.token, token.unscoped, result.email);
	}
</script>

<Modal active={showlogin}>
	<div class="login-modal-header">
		<img id="logo" src="img/Horizontal_AI.png" alt="EscherCloud AI Logo" />
	</div>
	<h2>Login</h2>
	<form on:submit={login}>
		<input
			type="text"
			id="username"
			required
			placeholder="Username"
			autocomplete="username"
			bind:value={username}
		/>
		<input
			type="password"
			id="password"
			required
			placeholder="Password"
			autocomplete="current-password"
			bind:value={password}
		/>
		<button type="submit">Submit</button>
	</form>
</Modal>

<style>
	/* Login modal styling */
	.login-modal-header {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 1em;
		border-bottom: 5px solid var(--brand);
	}

	.login-modal-header > img {
		padding: 2em 5em;
		width: 15em;
		max-width: 20em;
	}

	form {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--padding);
	}
</style>
