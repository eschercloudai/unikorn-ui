import { writable } from 'svelte/store';

export const errors = init();

function init() {
	const list = [];

	const errors = writable(list);

	function add(message) {
		list.push(message);
		errors.set(list);
	}

	function remove(index) {
		list.splice(index, 1);
		errors.set(list);
	}

	return {
		subscribe: errors.subscribe,
		add: add,
		remove: remove
	};
}
