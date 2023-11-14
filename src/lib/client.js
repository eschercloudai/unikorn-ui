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

		const contentType = response.headers.get('Content-Type');

		if (!response.ok) {
			let message = null;

			if (contentType == 'application/json') {
				let error = await response.json();

				message = `Error: ${error.error}, Description: ${error.error_description}`;
			}

			if (response.status == 400 && opts.onBadRequest) {
				opts.onBadRequest(message);
			} else if (response.status == 401 && opts.onUnauthorized) {
				opts.onUnauthorized(message);
			} else if (response.status == 403 && opts.onForbidden) {
				opts.onForbidden(message);
			} else if (response.status == 404 && opts.onNotFound) {
				opts.onNotFound(message);
			} else if (response.status == 409 && opts.onConflict) {
				opts.onConflict(message);
			} else if (response.status == 500 && opts.onInternalServerError) {
				opts.onInternalServerError(message);
			} else {
				console.log(
					'unhandled status',
					response.status,
					'method',
					method,
					'path',
					path,
					'message',
					message
				);
			}

			return null;
		}

		if (contentType == null) {
			return null;
		}

		if (contentType == 'application/json') {
			return await response.json();
		} else if (contentType == 'application/octet-stream') {
			return await response.blob();
		}

		console.log('unhandled content type', contentType);

		return null;
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

export function listFlavors(opts) {
	return request('GET', '/api/v1/providers/openstack/flavors', opts);
}

export function listImages(opts) {
	return request('GET', '/api/v1/providers/openstack/images', opts);
}

export function listKeyPairs(opts) {
	return request('GET', '/api/v1/providers/openstack/key-pairs', opts);
}

export function listComputeAvailabilityZones(opts) {
	return request('GET', '/api/v1/providers/openstack/availability-zones/compute', opts);
}

export function listBlockStorageAvailabilityZones(opts) {
	return request('GET', '/api/v1/providers/openstack/availability-zones/block-storage', opts);
}

export function listExternalNetworks(opts) {
	return request('GET', '/api/v1/providers/openstack/external-networks', opts);
}

export function createProject(opts) {
	return request('POST', `/api/v1/project`, opts);
}

export function listControlPlanes(opts) {
	return request('GET', '/api/v1/controlplanes', opts);
}

export function createControlPlane(opts) {
	return request('POST', `/api/v1/controlplanes`, opts);
}

export function deleteControlPlane(controlPlane, opts) {
	return request('DELETE', `/api/v1/controlplanes/${controlPlane}`, opts);
}

export function updateControlPlane(controlPlane, opts) {
	return request('PUT', `/api/v1/controlplanes/${controlPlane}`, opts);
}

export function listClusters(controlPlane, opts) {
	return request('GET', `/api/v1/controlplanes/${controlPlane}/clusters`, opts);
}

export function createCluster(controlPlane, opts) {
	return request('POST', `/api/v1/controlplanes/${controlPlane}/clusters`, opts);
}

export function getClusterKubeconfig(controlPlane, cluster, opts) {
	return request(
		'GET',
		`/api/v1/controlplanes/${controlPlane}/clusters/${cluster}/kubeconfig`,
		opts
	);
}

export function deleteCluster(controlPlane, cluster, opts) {
	return request('DELETE', `/api/v1/controlplanes/${controlPlane}/clusters/${cluster}`, opts);
}

export function updateCluster(controlPlane, cluster, opts) {
	return request('PUT', `/api/v1/controlplanes/${controlPlane}/clusters/${cluster}`, opts);
}

export function listApplicationBundlesControlPlane(opts) {
	return request('GET', '/api/v1/applicationbundles/controlPlane', opts);
}

export function listApplicationBundlesCluster(opts) {
	return request('GET', '/api/v1/applicationbundles/cluster', opts);
}

export function listApplications(opts) {
	return request('GET', '/api/v1/applications', opts);
}
