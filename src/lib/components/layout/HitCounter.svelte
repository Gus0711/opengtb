<script lang="ts">
	// Compteur de visites façon années 2000 — cf. counter/server.mjs.
	// Une visite = une session navigateur (sessionStorage), l'API dédoublonne aussi par IP.
	import { onMount } from 'svelte';

	const DIGITS = 6;
	const SESSION_KEY = 'opengtb:hit';

	let count = $state<number | null>(null);

	const digits = $derived(
		count === null ? '-'.repeat(DIGITS) : String(count).padStart(DIGITS, '0')
	);

	onMount(async () => {
		let counted = false;
		try {
			counted = sessionStorage.getItem(SESSION_KEY) === '1';
		} catch {
			// stockage bloqué : on compte quand même, l'API dédoublonne par IP
		}
		try {
			const res = await fetch('/api/hits', { method: counted ? 'GET' : 'POST' });
			if (!res.ok) return;
			count = (await res.json()).count;
			try {
				sessionStorage.setItem(SESSION_KEY, '1');
			} catch {}
		} catch {
			// API absente (ex. `npm run dev`) : on laisse les tirets
		}
	});
</script>

<span class="inline-flex items-center gap-2" title="Nombre de visiteurs depuis la mise en ligne">
	<span>visiteurs</span>
	<span class="inline-flex gap-px" aria-label={count === null ? undefined : `${count} visiteurs`}>
		{#each digits as d, i (i)}
			<span
				class="border-border bg-card text-amber inline-block w-[1.35em] rounded-[2px] border py-px text-center tabular-nums"
				aria-hidden="true">{d}</span
			>
		{/each}
	</span>
</span>
