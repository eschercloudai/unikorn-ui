import { browser } from '$app/environment';

export function writable(key) {
	// Read the initial value;
	let value = null;

	if (browser) {
		value = window.sessionStorage.getItem(key);
	}

	// Keep a set of subscribers.
	const subscribers = new Map();

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

		subscribers.forEach((run) => {
			run(value, kind);
		});
	}

	// remove unsets the session storage and notifies subscribers.
	function remove() {
		window.sessionStorage.removeItem(key);

		subscribers.forEach((run) => {
			run(value, 'remove');
		});
	}

	// subscribe registers the new callback and notifies
	// it of the current value.
	function subscribe(id, run) {
		if (subscribers.has(id)) {
			console.log(`subscriber ${id} already subscribed`);
			return;
		}

		subscribers.set(id, run);
		run(value, 'initial');
	}

	function unsubscribe(id) {
		if (!subscribers.has(id)) {
			console.log(`subscriber ${id} not subscribed`);
			return;
		}

		subscribers.delete(id);
	}

	return { get, set, remove, subscribe, unsubscribe };
}

// token is the main token storage.
export let token = writable('token');
