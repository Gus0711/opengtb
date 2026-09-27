<script lang="ts">
	// Bandeau de sondage sous le header — replié par défaut sur une ligne.
	// Le sondage (question, choix) est défini côté serveur : api/server.mjs, POLL.
	// Rien n'est affiché avant le montage : pas de flash au rendu serveur.
	import { onMount } from 'svelte';

	interface Poll {
		id: string;
		question: string;
		options: { id: string; label: string }[];
	}
	interface Idea {
		id: number;
		body: string;
		created_at: string;
	}

	const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
	const ADMIN_KEY = 'opengtb:msg-admin';
	const OTHER_MAX = 300;

	let poll = $state<Poll | null>(null);
	let counts = $state<Record<string, number>>({});
	let voters = $state(0);

	let mode = $state<'hidden' | 'collapsed' | 'open' | 'results'>('hidden');
	let choices = $state<string[]>([]);
	let other = $state('');
	let sending = $state(false);
	let error = $state<string | null>(null);

	let admin = $state(false);
	let adminToken = $state('');
	let ideas = $state<Idea[] | null>(null);

	const storageKey = (id: string) => `opengtb:poll:${id}`;
	const canSubmit = $derived(
		!sending && (choices.length > 0 || other.trim().length >= 3) && other.length <= OTHER_MAX
	);
	const pct = (n: number) => (voters ? Math.round((n / voters) * 100) : 0);

	function remember(value: string) {
		if (!poll) return;
		try {
			localStorage.setItem(storageKey(poll.id), value);
		} catch {}
	}

	function snooze() {
		remember(`snoozed:${Date.now()}`);
		mode = 'hidden';
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!poll || !canSubmit) return;
		sending = true;
		error = null;
		try {
			const res = await fetch('/api/poll', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ poll: poll.id, choices, other })
			});
			const data = await res.json().catch(() => ({}));
			if (res.status === 409 && data.error?.includes('déjà')) {
				remember('voted');
				mode = 'results';
				return;
			}
			if (!res.ok) {
				error = data.error ?? `Erreur ${res.status}`;
				return;
			}
			counts = data.counts;
			voters = data.voters;
			remember('voted');
			mode = 'results';
		} catch {
			error = 'Serveur injoignable — réessaie dans un instant.';
		} finally {
			sending = false;
		}
	}

	async function loadIdeas() {
		error = null;
		try {
			sessionStorage.setItem(ADMIN_KEY, adminToken);
		} catch {}
		const res = await fetch('/api/poll/ideas', { headers: { Authorization: `Bearer ${adminToken}` } });
		if (res.ok) ideas = (await res.json()).ideas;
		else error = res.status === 401 ? 'Token admin invalide.' : `Erreur ${res.status}`;
	}

	onMount(async () => {
		admin = location.hash === '#admin';
		if (admin) {
			try {
				adminToken = sessionStorage.getItem(ADMIN_KEY) ?? '';
			} catch {}
		}
		try {
			const res = await fetch('/api/poll');
			if (!res.ok) return;
			const data: { poll: Poll; counts: Record<string, number>; voters: number } = await res.json();
			poll = data.poll;
			counts = data.counts;
			voters = data.voters;
		} catch {
			return;
		}

		let state = '';
		try {
			state = localStorage.getItem(storageKey(poll.id)) ?? '';
		} catch {}
		if (admin) mode = 'results';
		else if (state === 'voted') mode = 'hidden';
		else if (state.startsWith('snoozed:') && Date.now() - Number(state.slice(8)) < SNOOZE_MS) mode = 'hidden';
		else mode = 'collapsed';
	});
</script>

{#if poll && mode !== 'hidden'}
	<aside
		class="border-b {mode === 'collapsed'
			? 'border-primary/40 bg-accent-glow'
			: 'border-border bg-card'}"
		aria-label="Sondage"
	>
		<div class="mx-auto max-w-5xl px-5 md:px-7">
			{#if mode === 'collapsed'}
				<div class="flex flex-wrap items-center gap-x-4 gap-y-2.5 py-3.5 sm:flex-nowrap">
					<span
						class="border-primary text-primary inline-flex flex-none items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide uppercase"
					>
						<span class="relative flex h-2 w-2">
							<span class="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
							<span class="bg-primary relative inline-flex h-2 w-2 rounded-full"></span>
						</span>
						Sondage
					</span>
					<button
						type="button"
						onclick={() => (mode = 'open')}
						class="text-foreground hover:text-primary min-w-0 basis-full text-left text-[15px] font-semibold transition-colors sm:flex-1 sm:basis-auto"
					>
						{poll.question}
						<span class="text-text-soft block text-xs font-normal"
							>Ton avis décide de la suite du site · anonyme, 30 secondes</span
						>
					</button>
					<div class="flex w-full items-center gap-3 sm:w-auto sm:flex-none">
						<button
							type="button"
							onclick={() => (mode = 'open')}
							class="bg-primary text-primary-foreground inline-flex flex-1 items-center justify-center rounded-sm px-4 py-2 font-mono sm:flex-none text-[12.5px] font-semibold transition-opacity hover:opacity-90"
							>Je donne mon avis →</button
						>
						<button
							type="button"
							onclick={snooze}
							class="text-text-dim hover:text-foreground p-1 font-mono text-xs transition-colors"
							aria-label="Masquer le sondage">✕</button
						>
					</div>
				</div>
			{:else if mode === 'open'}
				<form onsubmit={submit} class="py-5" novalidate>
					<p class="text-text-dim font-mono text-xs">
						<span class="text-primary">$</span> gtb poll --multi
					</p>
					<h2 class="text-foreground mt-1 text-base font-semibold">{poll.question}</h2>
					<p class="text-text-dim mt-0.5 text-xs">Plusieurs choix possibles. Anonyme, sans compte.</p>

					<div class="mt-4 grid gap-2 sm:grid-cols-2">
						{#each poll.options as o (o.id)}
							{@const checked = choices.includes(o.id)}
							<label
								class="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors {checked
									? 'border-primary bg-accent-glow text-foreground'
									: 'border-line-strong text-text-soft hover:border-primary'}"
							>
								<input
									type="checkbox"
									value={o.id}
									bind:group={choices}
									class="accent-primary mt-0.5 h-4 w-4 flex-none"
								/>
								<span>{o.label}</span>
							</label>
						{/each}
					</div>

					<label class="mt-3 flex flex-col gap-1.5">
						<span class="text-text-soft flex justify-between font-mono text-xs">
							<span>une autre idée ?</span>
							<span class={other.length > OTHER_MAX ? 'text-red-signal' : 'text-text-dim'}
								>{other.length}/{OTHER_MAX}</span
							>
						</span>
						<input
							bind:value={other}
							placeholder="Un outil, un sujet d'article, une fonctionnalité…"
							class="border-line-strong bg-background focus:border-primary focus:ring-primary/30 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
						/>
					</label>

					{#if error}
						<p class="text-red-signal mt-3 font-mono text-xs" role="alert">{error}</p>
					{/if}

					<div class="mt-4 flex flex-wrap items-center justify-end gap-3">
						<button
							type="button"
							onclick={snooze}
							class="text-text-dim hover:text-foreground font-mono text-xs transition-colors"
							>plus tard</button
						>
						<button
							type="submit"
							disabled={!canSubmit}
							class="text-foreground border-line-strong hover:text-primary hover:border-primary inline-flex items-center rounded-sm border px-3.5 py-2 font-mono text-[12.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
						>
							{sending ? '$ gtb vote …' : '$ gtb vote →'}
						</button>
					</div>
				</form>
			{:else}
				<div class="py-5">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="text-text-dim font-mono text-xs">
								<span class="text-primary">$</span> gtb poll --results
							</p>
							<h2 class="text-foreground mt-1 text-base font-semibold">
								{admin ? poll.question : 'Merci ! Voilà ce qu’en pensent les autres :'}
							</h2>
						</div>
						<button
							type="button"
							onclick={() => (mode = 'hidden')}
							class="text-text-dim hover:text-foreground font-mono text-xs transition-colors"
							aria-label="Fermer">✕</button
						>
					</div>

					<ul class="m-0 mt-4 flex list-none flex-col gap-2.5 p-0">
						{#each poll.options as o (o.id)}
							<li>
								<div class="flex justify-between gap-3 text-sm">
									<span class="text-text-soft">{o.label}</span>
									<span class="text-foreground font-mono tabular-nums">{pct(counts[o.id] ?? 0)} %</span>
								</div>
								<div class="bg-muted mt-1 h-1.5 overflow-hidden rounded-full">
									<div
										class="bg-primary h-full rounded-full transition-[width] duration-700"
										style="width: {pct(counts[o.id] ?? 0)}%"
									></div>
								</div>
							</li>
						{/each}
					</ul>
					<p class="text-text-dim mt-3 font-mono text-xs">
						{voters} participant{voters > 1 ? 's' : ''} · plusieurs choix possibles
					</p>

					{#if admin}
						<div class="border-amber mt-4 border-l-2 pl-4">
							{#if ideas === null}
								<form
									class="flex flex-wrap items-center gap-3 font-mono text-xs"
									onsubmit={(e) => {
										e.preventDefault();
										loadIdeas();
									}}
								>
									<span class="text-amber">admin</span>
									<input
										type="password"
										bind:value={adminToken}
										placeholder="token de modération"
										class="border-line-strong bg-background focus:border-primary max-w-xs rounded-md border px-3 py-1 text-xs focus:outline-none"
									/>
									<button type="submit" class="text-amber hover:underline">voir les idées libres →</button>
								</form>
							{:else if ideas.length === 0}
								<p class="text-text-dim font-mono text-xs">// aucune idée libre pour l'instant</p>
							{:else}
								<ul class="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
									{#each ideas as idea (idea.id)}
										<li class="text-text-soft">
											<span class="text-text-dim font-mono text-xs"
												>{new Date(idea.created_at).toLocaleDateString('fr-FR')}</span
											>
											{idea.body}
										</li>
									{/each}
								</ul>
							{/if}
							{#if error}
								<p class="text-red-signal mt-2 font-mono text-xs" role="alert">{error}</p>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</aside>
{/if}
