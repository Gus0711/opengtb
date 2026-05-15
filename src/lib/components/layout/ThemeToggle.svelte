<script lang="ts">
	import { theme } from '$lib/stores/theme.svelte';
</script>

<button
	type="button"
	onclick={() => theme.toggle()}
	aria-label="Basculer entre thème clair et sombre"
	aria-pressed={theme.current === 'dark'}
	class="border-border text-text-soft hover:text-foreground hover:border-line-strong inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[11px] transition-colors"
>
	<span aria-hidden="true">[ ◐</span>
	<span>{theme.current}</span>
	<span aria-hidden="true">]</span>
</button>
