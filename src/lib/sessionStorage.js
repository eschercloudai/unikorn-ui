import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// sessionStorage wraps a Svelte store and persists the value in session storage.
// The initial value comes from session storage.
export function sessionStorage(key) {
	let value;

	if (browser) {
		value = window.sessionStorage.getItem(key);
	}

	const store = writable(value);

	function mySet(new_value) {
		if (browser) {
			window.sessionStorage.setItem(key, new_value);
		}

		store.set(new_value);
	}

	function myUpdate(fn) {
		mySet(fn(value));
	}

	return {
		subscribe: store.subscribe,
		set: mySet,
		update: myUpdate
	};
}
