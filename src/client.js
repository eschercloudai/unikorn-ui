async function request(method, path, opts) {
	try {
		let options = {
			method: method,
			headers: new Headers()
		};

		if (opts.token) {
			options.headers.set('Authorization', 'Bearer ' + opts.token);
		} else if (opts.username) {
			options.headers.set('Authorization', 'Basic ' + btoa(opts.username + ':' + opts.password));
		}

		if (['PUT', 'POST'].includes(method) && opts.body) {
			options.headers.set('Content-Type', 'application/json');
			options.body = JSON.stringify(opts.body);
		}

		const response = await fetch(path, options);

		if (!response.ok) {
			if (response.status == 400 && opts.onBadRequest) {
				opts.onBadRequest();
			} else if (response.status == 401 && opts.onUnauthorized) {
				opts.onUnauthorized();
			} else if (response.status == 404 && opts.onNotFound) {
				opts.onNotFound();
			} else {
				console.log('unhandled status', response.status, 'method', method, 'path', path);
			}

			return null;
		}

		const result = await response.json();

		return result;
	} catch (e) {
		console.log('unhandled exception', e);

		return null;
	}
}

export function createToken(opts) {
	if (opts.token) {
		return request('POST', '/api/v1/auth/tokens/token', opts);
	} else {
		return request('POST', '/api/v1/auth/tokens/password', opts);
	}
}

export function listProjects(opts) {
	return request('GET', '/api/v1/providers/openstack/projects', opts);
}

export function listControlPlanes(opts) {
	return request('GET', '/api/v1/controlplanes', opts);
}

export function listClusters(controlPlane, opts) {
	return request('GET', `/api/v1/controlplanes/${controlPlane}/clusters`, opts);
}
