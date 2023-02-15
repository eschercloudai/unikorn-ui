import { browser } from '$app/environment';

export function writable(key) {
	// Read the initial value;
	let value = null;

	if (browser) {
		value = window.sessionStorage.getItem(key);
	}

	// Keep a set of subscribers.
	const subscribers = new Set();

	// get gets the initial value.
	function get() {
		return value;
	}

	// set sets the value and notifies all subscribers.
	function set(new_value) {
		let kind = value == null ? 'create' : 'update';

		value = new_value;

		if (browser) {
			window.sessionStorage.setItem(key, value);
		}

		for (const subscriber of subscribers) {
			subscriber(value, kind);
		}
	}

	// remove unsets the session storage and notifies subscribers.
	function remove() {
		window.sessionStorage.removeItem(key);

		for (const subscriber of subscribers) {
			subscriber(null, 'remove');
		}
	}

	// subscribe registers the new callback and notifies
	// it of the current value.
	function subscribe(run) {
		subscribers.add(run);
		run(value, 'initial');
	}

	return { get, set, remove, subscribe };
}

// token is the main token storage.
export let token = writable('token');
