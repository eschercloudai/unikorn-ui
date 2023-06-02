import { sessionStorage } from '$lib/sessionStorage.js';
import { localStorage } from '$lib/localStorage.js';
import { listProjects, createToken } from '$lib/client.js';

// project is the platform's project we are scoped to.
export const project = localStorage('project');

// token is the authorization bearer token for making API requests.
export const token = sessionStorage('token');

// email is the user's email address.
export const email = sessionStorage('email');

// This is called when the initial access token is acquired from the oauth
// exchange.  It uses the token to rescope to a project, that's either selected
// from persistent storage, and as a fallback, just selects the first one the
// user has access too as a default.
export async function setCredentials(accessToken, emailAddress) {
	// List all projects first.
	const projects = await listProjects({
		token: accessToken
	});

	if (projects == null || projects.length == 0) {
		console.log('failed to list projects, or no active projects');
		return;
	}

	// Get the current project ID from persistent storage.  This is guaranteed
	// to be unique, unlike names that are unique with a domain and needs more
	// stuff storing.
	let currentProjectID;

	function updateProject(value) {
		currentProjectID = value;
	}

	const unsubscribe = project.subscribe(updateProject);
	unsubscribe();

	// If the project isn't set, or doesn't exist, then we need to select one.
	if (!currentProjectID || projects.filter((x) => x.id == currentProjectID).length == 0) {
		currentProjectID = projects[0].id;
	}

	// Now we rescope to the project.
	const body = {
		project: {
			id: currentProjectID
		}
	};

	const scopedToken = await createToken({
		token: accessToken,
		body: body
	});

	if (scopedToken == null) {
		console.log('failed to rescope token');
		return;
	}

	// Set everything else up first, then update the token.
	// Everything should hang off the presence of a token, so we expect the
	// other details to be ready to be consumed by that point.
	project.set(currentProjectID);
	email.set(emailAddress);
	token.set(scopedToken.access_token);
}

// updateCredentials rescopes the access token to the new project.
export async function updateCredentials(accessToken, projectID) {
	const body = {
		project: {
			id: projectID
		}
	};

	const result = await createToken({
		token: accessToken,
		body: body,
		onUnauthorized: () => {
			removeCredentials();
		}
	});

	if (result == null) {
		return;
	}

	project.set(projectID);
	token.set(result.access_token);
}

// Remove credentials i.e. on token expiry.
export function removeCredentials() {
	token.set(null);
	email.set(null);
	project.set(null);
}
