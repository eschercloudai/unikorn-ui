<script>
	import { browser } from '$app/environment';
	import { token } from '$lib/credentials.js';

	async function handleCallback() {
		if (browser) {
			const location = new URL(window.location.href);

			if (location.searchParams.has('error')) {
				console.log('TODO: handle code exchange errors');
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

				token.set(result.access_token, token.unscoped, result.email);

				window.location = '/';
			}
		}
	}

	handleCallback();
</script>

<h1>Exchanging Credentials: Just a Moment...</h1>
