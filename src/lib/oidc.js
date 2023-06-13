import Base64url from 'crypto-js/enc-base64url';
import SHA512 from 'crypto-js/sha512';
import CryptoJS from 'crypto-js/core';

// See OIDC Core 1.0 sections 3.1.3.6, 3.1.3.8.
export function compareAccessTokenHash(jwt, at) {
	let atHash;

	switch (jwt.protectedHeader.alg) {
		case 'ES512':
			{
				const sum = SHA512(at);

				atHash = Base64url.stringify(
					CryptoJS.lib.WordArray.create(
						sum.words.slice(0, sum.words.length >> 1),
						sum.sigBytes >> 1
					)
				);
			}

			break;
		default:
			throw `unhandled hash algorithm ${jwt.protectedHeader.alg}`;
	}

	if (atHash != jwt.payload.at_hash) {
		throw `access token hash mismatch`;
	}
}
