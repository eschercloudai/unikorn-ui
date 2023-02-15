<script>
	import { onMount, onDestroy } from 'svelte';
	import { token } from './credentials.js';
	import Modal from './Modal.svelte';

	// showlogin depends on the value of the token, get the initial value
	// from the store and update accordingly.
	//let showlogin = sessionStorage.get('token') == null;
	let showlogin = token.get() == null;

	onMount(() => {
		token.subscribe('login-modal', changeToken);
	});

	onDestroy(() => {
		token.unsubscribe('login-modal', changeToken);
	});

	function changeToken(value) {
		showlogin = value == null;
	}

	let username = '';
	let password = '';

	// login does just that, extracts the form data using binding and sends the
	// request, updating the token on success.
	async function login() {
		try {
			let headers = new Headers();
			headers.set('Authorization', 'Basic ' + btoa(username + ':' + password));

			const response = await fetch('/api/v1/auth/tokens/password', {
				method: 'POST',
				headers: headers
			});

			const result = await response.json();

			token.set(result.token);
		} catch (e) {
			console.log(e);
		}
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
			placeholder="Username"
			autocomplete="username"
			bind:value={username}
		/>
		<input
			type="password"
			id="password"
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
		background-color: white;
		border-bottom: 5px solid var(--brand);
		border-radius: var(--radius) var(--radius) 0 0;
		box-shadow: 0 0 var(--shadow-radius) var(--mid-grey);
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
	}
</style>
