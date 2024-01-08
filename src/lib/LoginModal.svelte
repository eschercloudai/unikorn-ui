<script>
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { createRemoteJWKSet, jwtVerify } from 'jose';
	import { token, setCredentials } from '$lib/credentials.js';
	import { compareAccessTokenHash } from '$lib/oidc.js';

	import Base64url from 'crypto-js/enc-base64url';
	import SHA256 from 'crypto-js/sha256';

	import Modal from '$lib/Modal.svelte';
	import TextField from '$lib/TextField.svelte';
	import PasswordField from '$lib/PasswordField.svelte';
	import SelectField from '$lib/SelectField.svelte';

	// showlogin depends on the value of the token, get the initial value
	// from the store and update accordingly.
	let showlogin;

	const tokenUnsubscribe = token.subscribe(changeToken);

	onDestroy(tokenUnsubscribe);

	function changeToken(value) {
		showlogin = value == null;
	}

	let idps = ['OpenStack Keystone', 'OneLogin'];
	let idp = 'OpenStack Keystone';

	let username = '';
	let password = '';

	let errorMsg = null;

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

					// TODO: set a nonce
					const query = new URLSearchParams({
						response_type: 'code',
						client_id: '9a719e1e-aa85-4a21-a221-324e787efd78',
						redirect_uri: `https://${window.location.host}/oauth2/callback`,
						code_challenge_method: 'S256',
						code_challenge: codeChallenge,
						scope: 'openid email profile'
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
						client_id: '9a719e1e-aa85-4a21-a221-324e787efd78',
						username: username,
						password: password,
						scope: 'openid email profile'
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

					const jwks = createRemoteJWKSet(
						new URL(`https://${window.location.host}/api/v1/auth/jwks`)
					);

					const jwt = await jwtVerify(result.id_token, jwks, {
						issuer: `https://${window.location.host}`,
						audience: '9a719e1e-aa85-4a21-a221-324e787efd78'
					});

					try {
						compareAccessTokenHash(jwt, result.access_token);
					} catch (error) {
						errorMsg = error;
						return;
					}

					// Get this from the id_token.
					await setCredentials(result.access_token, jwt.payload.email);

					errorMsg = null;
				}

				break;
		}
	}
</script>

<Modal active={showlogin} fixed="true" width="480px">
	<div class="login-modal-header">
		<img
			id="logo"
			src="img/ecai.svg"
			alt="EscherCloud AI Logo"
			onload="SVGInject(this)"
			style="padding-top: 2em; padding-bottom: 2em; width: 15em; max-width: 20em; height: auto;"
		/>
	</div>

	{#if errorMsg}
		<div class="login-modal-error">
			<iconify-icon icon="mdi:error-outline" />
			<div class="errortext">
				{errorMsg}
			</div>
		</div>
	{/if}

	<div class="form-container">
		<form on:submit={login}>
			<h2>Login</h2>

			<SelectField id="idp" bind:value={idp} options={idps} help="Identity provider to use." />

			{#if idp == 'OpenStack Keystone'}
				<TextField
					id="username"
					help="Your username (email address)"
					autocomplete="username"
					required
					bind:value={username}
				/>
				<PasswordField
					type="password"
					id="password"
					help="Your user's password"
					autocomplete="current-password"
					required
					bind:value={password}
				/>
			{/if}

			<button type="submit">Login</button>
		</form>
	</div>
</Modal>

<style>
	/* Login modal styling */
	.login-modal-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		background-color: var(--overlay);
	}

	.login-modal-header > img {
		padding-top: 2em;
		padding-bottom: 2em;
		width: 15em;
		max-width: 20em;
	}

	.login-modal-error {
		color: white;
		background-color: var(--error);
		padding: var(--padding);
		display: flex;
		align-items: center;
		gap: var(--padding);
	}

	.errortext {
		font-weight: bold;
	}

	iconify-icon {
		font-size: 1.5rem;
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

	button {
		width: 100%;
	}
</style>
