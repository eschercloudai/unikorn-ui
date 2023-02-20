import { browser } from '$app/environment';

export function writable(key, defaultValue) {
	// Read the initial value;
	let value = null;

	if (browser) {
		value = window.sessionStorage.getItem(key);

		if (value == null) {
			window.sessionStorage.setItem(key, defaultValue);
			value = defaultValue;
		}
	}

	// Keep a set of subscribers.
	const subscribers = new Set();

	// set sets the value and notifies all subscribers.
	function set(new_value) {
		value = new_value;

		if (browser) {
			window.sessionStorage.setItem(key, value);
		}

		for (const subscriber of subscribers) {
			subscriber(value);
		}
	}

	// subscribe registers the new callback and notifies
	// it of the current value.
	function subscribe(run) {
		subscribers.add(run);
		run(value);
	}

	return { set, subscribe };
}

export const selected = writable('navigation', 'dashboard');
