<script>
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { token } from '$lib/credentials.js';

	import Base64url from 'crypto-js/enc-base64url';
	import SHA256 from 'crypto-js/sha256';

	import Modal from '$lib/Modal.svelte';
	import TextField from '$lib/TextField.svelte';
	import PasswordField from '$lib/PasswordField.svelte';
	import SelectField from '$lib/SelectField.svelte';

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

	let idps = ['OneLogin', 'OpenStack Keystone'];
	let idp = 'OneLogin';

	let username = '';
	let password = '';

	// login does different things based on the selected IdP:
	// * OneLogin sets up an oauth2 handshake and redirects to the Unikorn Server
	//   oauth2 authorization endpoint.
	// * OpenStack Keystone does a basic synchronous username/password exhchange.
	async function login() {
		switch (idp) {
			case 'OneLogin':
				if (browser) {
					let codeChallengeVerifierBytes = new Uint8Array(32);

					crypto.getRandomValues(codeChallengeVerifierBytes);

					const codeChallengeVerifier = btoa(codeChallengeVerifierBytes);
					const codeChallenge = SHA256(codeChallengeVerifier).toString(Base64url);

					window.sessionStorage.setItem('oauth2_code_challenge_verifier', codeChallengeVerifier);
					const query = new URLSearchParams({
						response_type: 'code',
						client_id: '9a719e1e-aa85-4a21-a221-324e787efd78',
						redirect_uri: `https://${window.location.host}/oauth2/callback`,
						code_challenge_method: 'S256',
						code_challenge: codeChallenge
					});

					const url = new URL(`https://${window.location.host}/api/v1/auth/oauth2/authorization`);
					url.search = query.toString();

					document.location = url.toString();
				}

				break;

			case 'OpenStack Keystone':
				{
					const form = new URLSearchParams({
						grant_type: 'password',
						username: username,
						password: password
					});

					const options = {
						method: 'POST',
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded'
						},
						body: form.toString()
					};

					const response = await fetch(
						`https://${window.location.host}/api/v1/auth/oauth2/tokens`,
						options
					);

					// TODO: error handling.
					const result = await response.json();

					token.set(result.access_token, token.unscoped, result.email);
				}

				break;
		}
	}
</script>

<Modal active={showlogin} fixed="true" width="480px">
	<div class="login-modal-header">
		<img id="logo" src="img/Horizontal_AI.png" alt="EscherCloud AI Logo" />
	</div>

	<div class="form-container">
		<form on:submit={login}>
			<h2>Login</h2>

			<SelectField id="idp" bind:value={idp} options={idps} help="Identity provider to use." />

			{#if idp == 'OpenStack Keystone'}
				<TextField
					id="username"
					placeholder="Username"
					autocomplete="username"
					required
					bind:value={username}
				/>
				<PasswordField
					type="password"
					id="password"
					placeholder="Password"
					autocomplete="current-password"
					required
					bind:value={password}
				/>
			{/if}

			<button type="submit">Submit</button>
		</form>
	</div>
</Modal>

<style>
	/* Login modal styling */
	.login-modal-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 1em;
		border-bottom: 5px solid var(--brand);
	}

	.login-modal-header > img {
		padding-top: 2em;
		padding-bottom: 2em;
		width: 15em;
		max-width: 20em;
	}

	form {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--padding);
		padding: var(--padding);
	}

	.form-container {
		padding: var(--padding);
	}
</style>
