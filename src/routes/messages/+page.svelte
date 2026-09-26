<script lang="ts">
	// Fil de messages public — demandes d'outils, bugs, idées. Publication directe.
	// Backend : api/server.mjs (/api/messages). Anti-spam en couches côté serveur ;
	// ici on ajoute le pot de miel, le chrono de saisie et le widget Turnstile.
	import { onMount } from 'svelte';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { buildMeta } from '$lib/seo/meta';
	import BackLink from '$lib/components/layout/BackLink.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { internalTools } from '$lib/tools/registry';
	import { theme } from '$lib/stores/theme.svelte';

	interface Message {
		id: number;
		author: string;
		topic: string;
		body: string;
		created_at: string;
	}

	interface Turnstile {
		render: (el: HTMLElement, opts: Record<string, unknown>) => string;
		reset: (id?: string) => void;
	}

	const meta = buildMeta({
		title: 'Messages',
		description:
			"Demandes d'outils, bugs, idées : le fil de messages ouvert des utilisateurs d'OpenGTB."
	});

	const TOPICS = [
		{ value: 'general', label: 'général' },
		{ value: 'nouvel-outil', label: "idée d'outil" },
		{ value: 'bug', label: 'bug' },
		...internalTools().map((t) => ({ value: t.slug, label: t.name }))
	];
	const topicLabel = (v: string) => TOPICS.find((t) => t.value === v)?.label ?? v;

	const BODY_MAX = 1000;
	const AUTHOR_KEY = 'opengtb:msg-author';
	const ADMIN_KEY = 'opengtb:msg-admin';

	const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

	let messages = $state<Message[]>([]);
	let hasMore = $state(false);
	let status = $state<'loading' | 'ready' | 'offline'>('loading');
	let loadingMore = $state(false);

	let author = $state('');
	let topic = $state('general');
	let body = $state('');
	let website = $state(''); // pot de miel
	let sending = $state(false);
	let error = $state<string | null>(null);
	let justPosted = $state<number | null>(null);

	let siteKey = $state<string | null>(null);
	let turnstileToken = $state('');
	let widgetEl = $state<HTMLDivElement>();
	let widgetId: string | undefined;
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

	function getTurnstile(): Turnstile | undefined {
		return (window as unknown as { turnstile?: Turnstile }).turnstile;
	}

	function renderTurnstile() {
		const ts = getTurnstile();
		if (!ts || !widgetEl || !siteKey) return;
		widgetId = ts.render(widgetEl, {
			sitekey: siteKey,
			language: 'fr',
			theme: theme.current,
			callback: (t: string) => (turnstileToken = t),
			'expired-callback': () => (turnstileToken = ''),
			'error-callback': () => (turnstileToken = '')
		});
	}

	function mountTurnstile() {
		if (!siteKey) return;
		if (getTurnstile()) return renderTurnstile();
		const s = document.createElement('script');
		s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
		s.async = true;
		s.onload = renderTurnstile;
		document.head.appendChild(s);
	}

	function resetTurnstile() {
		turnstileToken = '';
		if (widgetId !== undefined) getTurnstile()?.reset(widgetId);
	}

	async function load(before?: number) {
		const res = await fetch(`/api/messages${before ? `?before=${before}` : ''}`);
		if (!res.ok) throw new Error(String(res.status));
		const data: { messages: Message[]; hasMore: boolean; turnstileSiteKey: string | null } =
			await res.json();
		messages = before ? [...messages, ...data.messages] : data.messages;
		hasMore = data.hasMore;
		return data;
	}

	async function loadMore() {
		loadingMore = true;
		try {
			await load(messages[messages.length - 1]?.id);
		} catch {
			error = 'Impossible de charger la suite.';
		} finally {
			loadingMore = false;
		}
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSubmit) return;
		sending = true;
		error = null;
		try {
			const res = await fetch('/api/messages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					author,
					topic,
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
			if (data.message) {
				messages = [data.message, ...messages];
				justPosted = data.message.id;
			}
			body = '';
			try {
				localStorage.setItem(AUTHOR_KEY, author.trim());
			} catch {}
		} catch {
			error = 'Serveur injoignable — réessaie dans un instant.';
		} finally {
			sending = false;
			resetTurnstile();
		}
	}

	async function remove(id: number) {
		if (armedDelete !== id) {
			armedDelete = id;
			return;
		}
		armedDelete = null;
		const res = await fetch(`/api/messages/${id}`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${adminToken}` }
		});
		if (res.status === 204) messages = messages.filter((m) => m.id !== id);
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
			const data = await load();
			siteKey = data.turnstileSiteKey;
			status = 'ready';
			mountTurnstile();
		} catch {
			status = 'offline';
		}
	});

	const inputClass =
		'border-line-strong bg-background focus:border-primary focus:ring-primary/30 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none';
</script>

<SeoHead {meta} />

<section class="mx-auto max-w-3xl px-5 pt-6 pb-12 md:px-7">
	<BackLink href="/" label="retour à l'accueil" />

	<h1 class="mt-6 text-3xl font-semibold">Messages</h1>
	<p class="text-text-soft mt-2">
		Un outil qui manque, un device Modbus absent, un bug, une idée ? Laisse un message, il est
		publié directement.
	</p>
	<p class="text-text-dim mt-1 font-mono text-xs">$ gtb messages --tail</p>

	{#if admin}
		<div class="border-amber mt-6 flex items-center gap-3 border-l-2 px-4 py-2 font-mono text-xs">
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

	<form
		onsubmit={submit}
		class="bg-card border-border mt-8 flex flex-col gap-4 border px-5 py-5"
		novalidate
	>
		<div class="grid gap-4 sm:grid-cols-2">
			<label class="flex flex-col gap-1.5">
				<span class="text-text-soft font-mono text-xs">pseudo</span>
				<input
					bind:value={author}
					maxlength="30"
					autocomplete="nickname"
					placeholder="ex. Gus · intégrateur"
					class={inputClass}
				/>
			</label>
			<label class="flex flex-col gap-1.5">
				<span class="text-text-soft font-mono text-xs">sujet</span>
				<select bind:value={topic} class="{inputClass} font-mono">
					{#each TOPICS as t (t.value)}
						<option value={t.value}>{t.label}</option>
					{/each}
				</select>
			</label>
		</div>

		<label class="flex flex-col gap-1.5">
			<span class="text-text-soft flex justify-between font-mono text-xs">
				<span>message</span>
				<span class={body.length > BODY_MAX ? 'text-red-signal' : 'text-text-dim'}
					>{body.length}/{BODY_MAX}</span
				>
			</span>
			<textarea
				bind:value={body}
				rows="5"
				placeholder="Décris ta demande : outil concerné, device, contexte…"
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
				Texte brut, un lien maximum. Pas d'email ni de donnée perso : c'est public.
			</p>
			<button
				type="submit"
				disabled={!canSubmit || status !== 'ready'}
				class="text-foreground border-line-strong hover:text-primary hover:border-primary inline-flex items-center rounded-sm border px-3.5 py-2 font-mono text-[12.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
			>
				{sending ? '$ gtb post …' : '$ gtb post →'}
			</button>
		</div>
	</form>

	<div class="border-border mt-10 border-t">
		{#if status === 'loading'}
			<p class="text-text-dim py-10 text-center font-mono text-sm">// chargement…</p>
		{:else if status === 'offline'}
			<p
				class="border-border text-text-dim border-b border-dashed py-12 text-center font-mono text-sm"
			>
				// fil indisponible pour le moment
			</p>
		{:else if messages.length === 0}
			<p
				class="border-border text-text-dim border-b border-dashed py-12 text-center font-mono text-sm"
			>
				// aucun message — lance la discussion !
			</p>
		{:else}
			<ol class="m-0 list-none p-0">
				{#each messages as m (m.id)}
					<li
						class="border-border border-b py-5 {m.id === justPosted
							? 'bg-primary/5 -mx-3 px-3'
							: ''}"
					>
						<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-xs">
							<span class="text-primary font-semibold">{m.author}</span>
							<Tag>{topicLabel(m.topic)}</Tag>
							<time class="text-text-dim" datetime={m.created_at}
								>{DATE_FMT.format(new Date(m.created_at))}</time
							>
							<span class="text-text-dim ml-auto">#{m.id}</span>
							{#if admin}
								<button
									type="button"
									onclick={() => remove(m.id)}
									class="text-red-signal hover:underline"
									>{armedDelete === m.id ? 'confirmer ?' : 'supprimer'}</button
								>
							{/if}
						</div>
						<p
							class="text-foreground m-0 mt-2 text-[14.5px] leading-[1.6] break-words whitespace-pre-wrap"
						>{m.body}</p>
					</li>
				{/each}
			</ol>
			{#if hasMore}
				<div class="pt-6 text-center">
					<button
						type="button"
						onclick={loadMore}
						disabled={loadingMore}
						class="text-text-soft hover:text-primary font-mono text-xs transition-colors"
						>{loadingMore ? '// chargement…' : '$ gtb messages --more'}</button
					>
				</div>
			{/if}
		{/if}
	</div>
</section>
