import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// localStorage wraps a Svelte store and persists the value in persistent storage.
// The initial value comes from persistent storage.
export function localStorage(key, defaultValue) {
	let value = defaultValue;

	if (browser) {
		const storageValue = window.localStorage.getItem(key);
		if (storageValue != null) {
			value = storageValue;
		}
	}

	const store = writable(value);

	function mySet(new_value) {
		if (browser) {
			window.localStorage.setItem(key, new_value);
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
