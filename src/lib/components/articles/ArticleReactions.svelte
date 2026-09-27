<script lang="ts">
	// Réactions emoji sous un article — pas de compte, pas de cookie.
	// Le serveur dédoublonne par IP hashée ; ici on mémorise ses propres votes
	// dans le navigateur pour afficher l'état « actif ».
	import { onMount } from 'svelte';

	let { slug }: { slug: string } = $props();

	// Même liste, même ordre que EMOJIS dans api/server.mjs.
	const REACTIONS = [
		{ emoji: '👍', label: 'utile' },
		{ emoji: '🔥', label: 'top' },
		{ emoji: '💡', label: "j'ai appris un truc" },
		{ emoji: '🤯', label: 'bluffant' },
		{ emoji: '😅', label: 'déjà vécu' }
	];

	const storageKey = $derived(`opengtb:reactions:${slug}`);

	let counts = $state<Record<string, number>>({});
	let mine = $state<string[]>([]);
	let status = $state<'loading' | 'ready' | 'offline'>('loading');
	let error = $state<string | null>(null);

	function saveMine() {
		try {
			localStorage.setItem(storageKey, JSON.stringify(mine));
		} catch {}
	}

	async function toggle(emoji: string) {
		if (status !== 'ready') return;
		const on = !mine.includes(emoji);
		const prevCounts = counts;
		const prevMine = mine;
		// Optimiste : on met à jour tout de suite, le serveur tranche ensuite.
		counts = { ...counts, [emoji]: Math.max(0, (counts[emoji] ?? 0) + (on ? 1 : -1)) };
		mine = on ? [...mine, emoji] : mine.filter((e) => e !== emoji);
		error = null;
		try {
			const res = await fetch('/api/reactions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ article: slug, emoji, on })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
			counts = data.counts;
			saveMine();
		} catch (e) {
			counts = prevCounts;
			mine = prevMine;
			error = e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'Serveur injoignable.';
		}
	}

	onMount(async () => {
		try {
			mine = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
		} catch {}
		try {
			const res = await fetch(`/api/reactions?article=${encodeURIComponent(slug)}`);
			if (!res.ok) throw new Error(String(res.status));
			counts = (await res.json()).counts;
			status = 'ready';
		} catch {
			status = 'offline';
		}
	});
</script>

{#if status !== 'offline'}
	<section class="border-border mt-12 border-t pt-8" aria-labelledby="reactions-title">
		<p class="text-text-dim font-mono text-xs"><span class="text-primary">$</span> gtb react</p>
		<h2 id="reactions-title" class="text-foreground mt-1 text-lg font-semibold">
			Cet article t'a parlé ?
		</h2>
		<div class="mt-4 flex flex-wrap gap-2">
			{#each REACTIONS as r (r.emoji)}
				{@const active = mine.includes(r.emoji)}
				<button
					type="button"
					onclick={() => toggle(r.emoji)}
					disabled={status !== 'ready'}
					aria-pressed={active}
					title={r.label}
					class="group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-sm transition-colors disabled:opacity-50 {active
						? 'border-primary bg-accent-glow text-primary'
						: 'border-line-strong text-text-soft hover:border-primary hover:text-foreground'}"
				>
					<span class="text-base leading-none transition-transform group-active:scale-125"
						>{r.emoji}</span
					>
					<span class="tabular-nums">{counts[r.emoji] ?? 0}</span>
					<span class="sr-only">{r.label}</span>
				</button>
			{/each}
		</div>
		{#if error}
			<p class="text-red-signal mt-2 font-mono text-xs" role="alert">{error}</p>
		{/if}
	</section>
{/if}
