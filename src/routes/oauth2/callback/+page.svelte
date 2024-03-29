<script>
	// The key to security here is to not import anything that could
	// potentially compromise the code or tokens with a supply chain attack,
	// so keep imports deliberately sparese please!
	import { browser } from '$app/environment';
	import { createRemoteJWKSet, jwtVerify } from 'jose';
	import { setCredentials } from '$lib/credentials.js';
	import { compareAccessTokenHash } from '$lib/oidc.js';

	let error;
	let description;

	async function handleCallback() {
		if (browser) {
			const location = new URL(window.location.href);

			if (location.searchParams.has('error')) {
				error = location.searchParams.get('error');
				description = location.searchParams.get('description');
			} else if (location.searchParams.has('code')) {
				const code = location.searchParams.get('code');

				const code_verifier = window.sessionStorage.getItem('oauth2_code_challenge_verifier');
				const form = new URLSearchParams({
					grant_type: 'authorization_code',
					client_id: '9a719e1e-aa85-4a21-a221-324e787efd78',
					redirect_uri: `https://${window.location.host}/oauth2/callback`,
					code: code,
					code_verifier: code_verifier
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
				} catch (err) {
					error = 'client_error';
					description = err;
					return;
				}

				await setCredentials(result.access_token, jwt.payload.email);

				window.location = '/';
			}
		}
	}

	handleCallback();
</script>

{#if error}
	<h1>An Error Occurred</h1>
	<dl>
		<dt>Error</dt>
		<dd>{error}</dd>

		<dt>Description</dt>
		<dd>{description}</dd>
	</dl>
{:else}
	<h1>Exchanging Credentials: Just a Moment...</h1>
{/if}
