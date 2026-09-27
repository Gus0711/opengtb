<script lang="ts">
	// Commentaires d'un article — pseudo seul, publication directe, modération a
	// posteriori via #admin (même token que /messages). Backend : /api/comments.
	import { onMount } from 'svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { mountTurnstile, type TurnstileHandle } from '$lib/community/turnstile';

	let { slug }: { slug: string } = $props();

	interface Comment {
		id: number;
		author: string;
		body: string;
		created_at: string;
	}

	const BODY_MAX = 1000;
	const AUTHOR_KEY = 'opengtb:msg-author';
	const ADMIN_KEY = 'opengtb:msg-admin';

	const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

	let comments = $state<Comment[]>([]);
	let status = $state<'loading' | 'ready' | 'offline'>('loading');

	let author = $state('');
	let body = $state('');
	let website = $state(''); // pot de miel
	let sending = $state(false);
	let error = $state<string | null>(null);
	let justPosted = $state<number | null>(null);

	let siteKey = $state<string | null>(null);
	let turnstileToken = $state('');
	let widgetEl = $state<HTMLDivElement>();
	let turnstile: TurnstileHandle | undefined;
	const openedAt = Date.now();

	let admin = $state(false);
	let adminToken = $state('');
	let armedDelete = $state<number | null>(null);

	const canSubmit = $derived(
		!sending &&
			author.trim().length >= 2 &&
			body.trim().length >= 3 &&
			body.length <= BODY_MAX &&
			(!siteKey || turnstileToken !== '')
	);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSubmit) return;
		sending = true;
		error = null;
		try {
			const res = await fetch('/api/comments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					article: slug,
					author,
					body,
					website,
					elapsed: Date.now() - openedAt,
					turnstileToken
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				error = data.error ?? `Erreur ${res.status}`;
				return;
			}
			if (data.comment) {
				comments = [...comments, data.comment];
				justPosted = data.comment.id;
			}
			body = '';
			try {
				localStorage.setItem(AUTHOR_KEY, author.trim());
			} catch {}
		} catch {
			error = 'Serveur injoignable — réessaie dans un instant.';
		} finally {
			sending = false;
			turnstile?.reset();
		}
	}

	async function remove(id: number) {
		if (armedDelete !== id) {
			armedDelete = id;
			return;
		}
		armedDelete = null;
		const res = await fetch(`/api/comments/${id}`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${adminToken}` }
		});
		if (res.status === 204) comments = comments.filter((c) => c.id !== id);
		else error = res.status === 401 ? 'Token admin invalide.' : `Erreur ${res.status}`;
	}

	function saveAdminToken() {
		try {
			sessionStorage.setItem(ADMIN_KEY, adminToken);
		} catch {}
	}

	onMount(async () => {
		try {
			author = localStorage.getItem(AUTHOR_KEY) ?? '';
		} catch {}
		admin = location.hash === '#admin';
		if (admin) {
			try {
				adminToken = sessionStorage.getItem(ADMIN_KEY) ?? '';
			} catch {}
		}
		try {
			const res = await fetch(`/api/comments?article=${encodeURIComponent(slug)}`);
			if (!res.ok) throw new Error(String(res.status));
			const data: { comments: Comment[]; turnstileSiteKey: string | null } = await res.json();
			comments = data.comments;
			siteKey = data.turnstileSiteKey;
			status = 'ready';
		} catch {
			status = 'offline';
		}
	});

	// Le conteneur du widget n'existe qu'une fois la clé connue.
	$effect(() => {
		if (widgetEl && siteKey && !turnstile) {
			turnstile = mountTurnstile(widgetEl, siteKey, theme.current, (t) => (turnstileToken = t));
		}
	});

	const inputClass =
		'border-line-strong bg-background focus:border-primary focus:ring-primary/30 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none';
</script>

<section id="commentaires" class="border-border mt-10 border-t pt-8" aria-labelledby="comments-title">
	<p class="text-text-dim font-mono text-xs">
		<span class="text-primary">$</span> gtb comments --tail
	</p>
	<h2 id="comments-title" class="text-foreground mt-1 text-lg font-semibold">
		Commentaires{#if status === 'ready'}<span class="text-text-dim ml-2 font-mono text-sm font-normal"
				>({comments.length})</span
			>{/if}
	</h2>

	{#if admin}
		<div class="border-amber mt-4 flex items-center gap-3 border-l-2 px-4 py-2 font-mono text-xs">
			<span class="text-amber">admin</span>
			<input
				type="password"
				bind:value={adminToken}
				onchange={saveAdminToken}
				placeholder="token de modération"
				class="{inputClass} max-w-xs py-1 text-xs"
			/>
		</div>
	{/if}

	{#if status === 'loading'}
		<p class="text-text-dim py-8 text-center font-mono text-sm">// chargement…</p>
	{:else if status === 'offline'}
		<p class="border-border text-text-dim mt-4 border border-dashed py-8 text-center font-mono text-sm">
			// commentaires indisponibles pour le moment
		</p>
	{:else}
		{#if comments.length === 0}
			<p class="text-text-dim mt-4 font-mono text-sm">// aucun commentaire — lance la discussion !</p>
		{:else}
			<ol class="m-0 mt-2 list-none p-0">
				{#each comments as c (c.id)}
					<li class="border-border border-b py-4 {c.id === justPosted ? 'bg-primary/5 -mx-3 px-3' : ''}">
						<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-xs">
							<span class="text-primary font-semibold">{c.author}</span>
							<time class="text-text-dim" datetime={c.created_at}
								>{DATE_FMT.format(new Date(c.created_at))}</time
							>
							{#if admin}
								<button
									type="button"
									onclick={() => remove(c.id)}
									class="text-red-signal ml-auto hover:underline"
									>{armedDelete === c.id ? 'confirmer ?' : 'supprimer'}</button
								>
							{/if}
						</div>
						<p
							class="text-foreground m-0 mt-2 text-[14.5px] leading-[1.6] break-words whitespace-pre-wrap"
						>{c.body}</p>
					</li>
				{/each}
			</ol>
		{/if}

		<form
			onsubmit={submit}
			class="bg-card border-border relative mt-6 flex flex-col gap-4 border px-5 py-5"
			novalidate
		>
			<label class="flex flex-col gap-1.5 sm:max-w-xs">
				<span class="text-text-soft font-mono text-xs">pseudo</span>
				<input
					bind:value={author}
					maxlength="30"
					autocomplete="nickname"
					placeholder="ton pseudo"
					class={inputClass}
				/>
			</label>

			<label class="flex flex-col gap-1.5">
				<span class="text-text-soft flex justify-between font-mono text-xs">
					<span>commentaire</span>
					<span class={body.length > BODY_MAX ? 'text-red-signal' : 'text-text-dim'}
						>{body.length}/{BODY_MAX}</span
					>
				</span>
				<textarea
					bind:value={body}
					rows="4"
					placeholder="Ton retour d'expérience, une question, une astuce…"
					class="{inputClass} resize-y leading-relaxed"
				></textarea>
			</label>

			<!-- Pot de miel : invisible pour un humain, rempli par les robots. -->
			<div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
				<label>Site web <input bind:value={website} name="website" tabindex="-1" autocomplete="off" /></label>
			</div>

			{#if siteKey}
				<div bind:this={widgetEl}></div>
			{/if}

			{#if error}
				<p class="text-red-signal m-0 font-mono text-xs" role="alert">{error}</p>
			{/if}

			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-text-dim m-0 text-xs">
					Pas d'inscription, juste un pseudo. Texte brut, un lien max. C'est public.
				</p>
				<button
					type="submit"
					disabled={!canSubmit}
					class="text-foreground border-line-strong hover:text-primary hover:border-primary inline-flex items-center rounded-sm border px-3.5 py-2 font-mono text-[12.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
				>
					{sending ? '$ gtb comment …' : '$ gtb comment →'}
				</button>
			</div>
		</form>
	{/if}
</section>
