<script>
	import { timeOfDayFormatter } from '$lib/formatters.js';
	import CheckBoxField from '$lib/CheckBoxField.svelte';
	import SliderField from '$lib/SliderField.svelte';

	export let id;
	export let label;

	export let existing = null;

	export let enabled = false;
	export let start = 0;
	export let end = 7;

	export let object;

	if (existing) {
		enabled = true;
		start = existing.start;
		end = existing.end;
	}

	$: {
		object = {
			enabled: enabled,
			start: start,
			end: end
		};
	}
</script>

<CheckBoxField {id} {label} help="Enables the selected time window" bind:checked={enabled} />

{#if enabled}
	<SliderField
		id={`${id}-start`}
		help="Time window start"
		min="0"
		max="23"
		formatter={timeOfDayFormatter}
		bind:value={start}
	/>

	<SliderField
		id={`${id}-end`}
		help="Time window end.  If smaller than the start time, the window will wrap into the next day.  If equal to the start time it will encompass the entire 24 hour period."
		min="0"
		max="23"
		formatter={timeOfDayFormatter}
		bind:value={end}
	/>
{/if}
