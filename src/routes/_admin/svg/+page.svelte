<script lang="ts">
	import { onMount } from 'svelte';
	import type { SvgEntry, SvgManifest, SvgTaxonomy } from '$lib/tools/svg/types';

	type Pending = {
		id: string;
		filename: string;
		svg: string;
		name: string;
		description: string;
		theme: string;
		subtheme: string;
		tags: string[];
		saving: boolean;
		error: string | null;
	};

	let token = $state('');
	let authed = $state(false);
	let authError = $state<string | null>(null);
	let taxonomy = $state<SvgTaxonomy | null>(null);
	let manifest = $state<SvgManifest | null>(null);

	let pending = $state<Pending[]>([]);
	let dragOver = $state(false);

	let editingSlug = $state<string | null>(null);
	let editDraft = $state<{
		name: string;
		description: string;
		theme: string;
		subtheme: string;
		tags: string[];
	} | null>(null);

	function uuid() {
		return Math.random().toString(36).slice(2) + Date.now().toString(36);
	}

	function slugify(s: string) {
		return s
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	async function api(method: string, path: string, body?: unknown) {
		const res = await fetch(`/__svg-admin${path}`, {
			method,
			headers: {
				'X-Admin-Token': token,
				...(body ? { 'Content-Type': 'application/json' } : {})
			},
			body: body ? JSON.stringify(body) : undefined
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
		return data;
	}

	async function tryAuth() {
		authError = null;
		try {
			manifest = (await api('GET', '/manifest')) as SvgManifest;
			taxonomy = (await api('GET', '/taxonomy')) as SvgTaxonomy;
			authed = true;
			sessionStorage.setItem('svg-admin-token', token);
		} catch (e) {
			authError = e instanceof Error ? e.message : String(e);
			authed = false;
		}
	}

	function logout() {
		sessionStorage.removeItem('svg-admin-token');
		token = '';
		authed = false;
		manifest = null;
		taxonomy = null;
		pending = [];
	}

	onMount(() => {
		const saved = sessionStorage.getItem('svg-admin-token');
		if (saved) {
			token = saved;
			tryAuth();
		}
	});

	function subthemesFor(themeSlug: string) {
		return taxonomy?.themes.find((t) => t.slug === themeSlug)?.subthemes ?? [];
	}

	function defaultTheme() {
		const last = sessionStorage.getItem('svg-admin-last-theme');
		if (last && taxonomy?.themes.some((t) => t.slug === last)) return last;
		return taxonomy?.themes[0]?.slug ?? '';
	}

	function defaultSubtheme(theme: string) {
		const last = sessionStorage.getItem(`svg-admin-last-subtheme:${theme}`);
		const subs = subthemesFor(theme);
		if (last && subs.some((s) => s.slug === last)) return last;
		return subs[0]?.slug ?? '';
	}

	async function ingestFiles(files: FileList | File[]) {
		const arr = Array.from(files).filter((f) => /\.svg$/i.test(f.name));
		for (const f of arr) {
			const text = await f.text();
			const baseName = f.name.replace(/\.svg$/i, '');
			const niceName = baseName.replace(/[-_]+/g, ' ').trim();
			const theme = defaultTheme();
			pending = [
				...pending,
				{
					id: uuid(),
					filename: f.name,
					svg: text,
					name: niceName,
					description: '',
					theme,
					subtheme: defaultSubtheme(theme),
					tags: [],
					saving: false,
					error: null
				}
			];
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		if (e.dataTransfer?.files) ingestFiles(e.dataTransfer.files);
	}

	function onFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) ingestFiles(input.files);
		input.value = '';
	}

	function removePending(id: string) {
		pending = pending.filter((p) => p.id !== id);
	}

	function applyToAll(source: Pending) {
		pending = pending.map((p) =>
			p.id === source.id
				? p
				: { ...p, theme: source.theme, subtheme: source.subtheme, tags: [...source.tags] }
		);
	}

	function togglePendingTag(p: Pending, tag: string) {
		const has = p.tags.includes(tag);
		const next = has ? p.tags.filter((t) => t !== tag) : [...p.tags, tag];
		pending = pending.map((x) => (x.id === p.id ? { ...x, tags: next } : x));
	}

	function updatePending(id: string, patch: Partial<Pending>) {
		pending = pending.map((p) => (p.id === id ? { ...p, ...patch } : p));
	}

	async function savePending(p: Pending) {
		updatePending(p.id, { saving: true, error: null });
		try {
			const result = await api('POST', '/upload', {
				name: p.name,
				description: p.description,
				theme: p.theme,
				subtheme: p.subtheme,
				tags: p.tags,
				svg: p.svg
			});
			sessionStorage.setItem('svg-admin-last-theme', p.theme);
			sessionStorage.setItem(`svg-admin-last-subtheme:${p.theme}`, p.subtheme);
			const entry = result.entry as SvgEntry;
			if (manifest) manifest = { ...manifest, entries: [...manifest.entries, entry] };
			pending = pending.filter((x) => x.id !== p.id);
		} catch (e) {
			updatePending(p.id, {
				saving: false,
				error: e instanceof Error ? e.message : String(e)
			});
		}
	}

	async function saveAll() {
		for (const p of [...pending]) {
			if (!p.name || !p.theme || !p.subtheme) continue;
			await savePending(p);
		}
	}

	function startEdit(e: SvgEntry) {
		editingSlug = e.slug;
		editDraft = {
			name: e.name,
			description: e.description,
			theme: e.theme,
			subtheme: e.subtheme,
			tags: [...e.tags]
		};
	}

	function cancelEdit() {
		editingSlug = null;
		editDraft = null;
	}

	async function saveEdit() {
		if (!editingSlug || !editDraft) return;
		try {
			const result = await api('PATCH', `/entry/${encodeURIComponent(editingSlug)}`, editDraft);
			const entry = result.entry as SvgEntry;
			if (manifest) {
				manifest = {
					...manifest,
					entries: manifest.entries.map((e) => (e.slug === entry.slug ? entry : e))
				};
			}
			cancelEdit();
		} catch (e) {
			alert(`Erreur : ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	async function deleteEntry(slug: string) {
		if (!confirm(`Supprimer "${slug}" ?`)) return;
		try {
			await api('DELETE', `/entry/${encodeURIComponent(slug)}`);
			if (manifest) {
				manifest = { ...manifest, entries: manifest.entries.filter((e) => e.slug !== slug) };
			}
		} catch (e) {
			alert(`Erreur : ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	function toggleEditTag(tag: string) {
		if (!editDraft) return;
		const has = editDraft.tags.includes(tag);
		editDraft = {
			...editDraft,
			tags: has ? editDraft.tags.filter((t) => t !== tag) : [...editDraft.tags, tag]
		};
	}
</script>

<svelte:head>
	<title>Admin SVG · OpenGTB</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section class="mx-auto max-w-6xl px-5 pt-6 pb-16 md:px-7">
	<header class="border-border flex items-center justify-between border-b pb-4">
		<div>
			<h1 class="font-mono text-[13px] tracking-[0.1em] uppercase">
				<span class="text-text-dim">$</span>
				<span class="text-primary">opengtb</span>
				<span class="text-text-dim">·</span>
				<span class="font-semibold">admin svg</span>
			</h1>
			<p class="text-text-soft mt-1 text-[13px]">
				Interface locale d'ingestion — invisible en prod.
			</p>
		</div>
		{#if authed}
			<button
				type="button"
				onclick={logout}
				class="border-border text-text-soft hover:text-primary rounded-sm border px-3 py-1.5 font-mono text-[12px]"
			>
				déconnexion
			</button>
		{/if}
	</header>

	{#if !authed}
		<div class="mx-auto mt-12 max-w-md">
			<label class="text-text-soft block font-mono text-[12px] tracking-[0.1em] uppercase">
				Admin token
			</label>
			<form
				class="mt-2 flex gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					tryAuth();
				}}
			>
				<input
					type="password"
					bind:value={token}
					autocomplete="off"
					class="border-border bg-card flex-1 rounded-sm border px-3 py-2 font-mono text-[13px]"
					placeholder="ADMIN_TOKEN du .env"
				/>
				<button
					type="submit"
					class="bg-primary text-primary-foreground rounded-sm px-4 py-2 font-mono text-[12px] font-semibold"
				>
					Entrer
				</button>
			</form>
			{#if authError}
				<p class="mt-3 font-mono text-[12px] text-red-500">{authError}</p>
			{/if}
		</div>
	{:else}
		<!-- Drop zone -->
		<section class="mt-8">
			<h2 class="font-mono text-[11.5px] tracking-[0.1em] uppercase">
				<span class="text-primary">§ ingestion</span>
			</h2>
			<label
				class="
					relative mt-3 flex min-h-[120px] cursor-pointer flex-col items-center justify-center
					rounded-md border-2 border-dashed px-6 py-8 transition-colors
					{dragOver ? 'border-primary bg-primary/5' : 'border-border bg-card'}
				"
				ondragover={(e) => {
					e.preventDefault();
					dragOver = true;
				}}
				ondragleave={() => (dragOver = false)}
				ondrop={onDrop}
			>
				<input type="file" accept=".svg" multiple class="hidden" onchange={onFileInput} />
				<p class="text-text-soft text-center text-[14px]">
					Glisse-dépose des fichiers <code class="font-mono">.svg</code> ici
				</p>
				<p class="text-text-dim mt-1 text-center text-[12px]">ou clique pour choisir</p>
			</label>
		</section>

		{#if pending.length > 0}
			<section class="mt-8">
				<div class="flex items-baseline justify-between">
					<h2 class="font-mono text-[11.5px] tracking-[0.1em] uppercase">
						<span class="text-primary">§ en attente</span>
						<span class="text-text-dim">({pending.length})</span>
					</h2>
					<button
						type="button"
						onclick={saveAll}
						class="bg-primary text-primary-foreground rounded-sm px-4 py-2 font-mono text-[12px] font-semibold"
					>
						Sauvegarder tout
					</button>
				</div>

				<div class="mt-4 space-y-3">
					{#each pending as p (p.id)}
						<article class="border-border bg-card rounded-md border p-4">
							<div class="grid grid-cols-[120px_1fr] gap-4">
								<div
									class="border-line-soft bg-background flex aspect-square items-center justify-center overflow-hidden rounded-sm border p-2"
								>
									<!-- eslint-disable svelte/no-at-html-tags -->
									<div class="size-full [&_svg]:size-full">{@html p.svg}</div>
								</div>

								<div class="min-w-0 space-y-2.5">
									<div class="flex items-baseline justify-between gap-2">
										<span class="text-text-dim truncate font-mono text-[11px]">
											{p.filename}
										</span>
										<button
											type="button"
											onclick={() => removePending(p.id)}
											class="text-text-dim hover:text-red-500 font-mono text-[11px]"
										>
											retirer
										</button>
									</div>

									<div class="grid grid-cols-2 gap-2">
										<label class="block">
											<span class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
												Nom
											</span>
											<input
												type="text"
												value={p.name}
												oninput={(e) =>
													updatePending(p.id, { name: (e.target as HTMLInputElement).value })}
												class="border-border bg-background mt-1 w-full rounded-sm border px-2 py-1.5 text-[13px]"
											/>
											<span class="text-text-dim mt-0.5 block font-mono text-[10.5px]">
												slug → {slugify(p.name) || '—'}
											</span>
										</label>

										<label class="block">
											<span class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
												Description
											</span>
											<input
												type="text"
												value={p.description}
												oninput={(e) =>
													updatePending(p.id, {
														description: (e.target as HTMLInputElement).value
													})}
												class="border-border bg-background mt-1 w-full rounded-sm border px-2 py-1.5 text-[13px]"
											/>
										</label>

										<label class="block">
											<span class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
												Thème
											</span>
											<select
												value={p.theme}
												onchange={(e) => {
													const theme = (e.target as HTMLSelectElement).value;
													updatePending(p.id, {
														theme,
														subtheme: defaultSubtheme(theme)
													});
												}}
												class="border-border bg-background mt-1 w-full rounded-sm border px-2 py-1.5 text-[13px]"
											>
												{#each taxonomy?.themes ?? [] as t (t.slug)}
													<option value={t.slug}>{t.number} · {t.name}</option>
												{/each}
											</select>
										</label>

										<label class="block">
											<span class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
												Sous-thème
											</span>
											<select
												value={p.subtheme}
												onchange={(e) =>
													updatePending(p.id, {
														subtheme: (e.target as HTMLSelectElement).value
													})}
												class="border-border bg-background mt-1 w-full rounded-sm border px-2 py-1.5 text-[13px]"
											>
												{#each subthemesFor(p.theme) as s (s.slug)}
													<option value={s.slug}>{s.name}</option>
												{/each}
											</select>
										</label>
									</div>

									<div>
										<span class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
											Tags
										</span>
										<div class="mt-1 flex flex-wrap gap-x-3 gap-y-1.5">
											{#each taxonomy?.tagFamilies ?? [] as fam (fam.slug)}
												<div class="flex items-center gap-1">
													<span class="text-text-dim font-mono text-[10.5px]">{fam.name}:</span>
													{#each fam.tags as t (t.slug)}
														<button
															type="button"
															onclick={() => togglePendingTag(p, t.slug)}
															class="rounded-sm border px-1.5 py-0.5 font-mono text-[10.5px] transition-colors
																{p.tags.includes(t.slug)
																? 'border-primary bg-primary/10 text-primary'
																: 'border-border text-text-soft hover:border-primary/40'}"
														>
															{t.name}
														</button>
													{/each}
												</div>
											{/each}
										</div>
									</div>

									<div class="flex items-center justify-between pt-1">
										<button
											type="button"
											onclick={() => applyToAll(p)}
											disabled={pending.length < 2}
											class="text-text-soft hover:text-primary font-mono text-[11px] disabled:opacity-40"
										>
											appliquer thème/tags à tous
										</button>
										<button
											type="button"
											onclick={() => savePending(p)}
											disabled={p.saving || !p.name}
											class="border-primary text-primary hover:bg-primary/10 rounded-sm border px-3 py-1 font-mono text-[11px] disabled:opacity-40"
										>
											{p.saving ? 'sauvegarde…' : 'sauvegarder'}
										</button>
									</div>

									{#if p.error}
										<p class="font-mono text-[11px] text-red-500">{p.error}</p>
									{/if}
								</div>
							</div>
						</article>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Existing entries -->
		<section class="mt-12">
			<h2 class="font-mono text-[11.5px] tracking-[0.1em] uppercase">
				<span class="text-primary">§ bibliothèque</span>
				<span class="text-text-dim">({manifest?.entries.length ?? 0})</span>
			</h2>

			{#if !manifest || manifest.entries.length === 0}
				<p class="text-text-soft mt-3 text-[13px]">Aucun SVG pour l'instant.</p>
			{:else}
				<div class="mt-4 space-y-2">
					{#each manifest.entries as e (e.slug)}
						<article class="border-border bg-card rounded-md border p-3">
							{#if editingSlug === e.slug && editDraft}
								<div class="grid grid-cols-[80px_1fr] gap-3">
									<div
										class="border-line-soft bg-background flex aspect-square items-center justify-center overflow-hidden rounded-sm border p-1.5"
									>
										<img src="/svg-library/{e.file}" alt="" class="size-full object-contain" />
									</div>
									<div class="space-y-2">
										<div class="grid grid-cols-2 gap-2">
											<input
												type="text"
												bind:value={editDraft.name}
												class="border-border bg-background rounded-sm border px-2 py-1 text-[13px]"
											/>
											<input
												type="text"
												bind:value={editDraft.description}
												placeholder="description"
												class="border-border bg-background rounded-sm border px-2 py-1 text-[13px]"
											/>
											<select
												bind:value={editDraft.theme}
												onchange={() => {
													if (editDraft) editDraft.subtheme = defaultSubtheme(editDraft.theme);
												}}
												class="border-border bg-background rounded-sm border px-2 py-1 text-[13px]"
											>
												{#each taxonomy?.themes ?? [] as t (t.slug)}
													<option value={t.slug}>{t.number} · {t.name}</option>
												{/each}
											</select>
											<select
												bind:value={editDraft.subtheme}
												class="border-border bg-background rounded-sm border px-2 py-1 text-[13px]"
											>
												{#each subthemesFor(editDraft.theme) as s (s.slug)}
													<option value={s.slug}>{s.name}</option>
												{/each}
											</select>
										</div>
										<div class="flex flex-wrap gap-x-3 gap-y-1.5">
											{#each taxonomy?.tagFamilies ?? [] as fam (fam.slug)}
												{#each fam.tags as t (t.slug)}
													<button
														type="button"
														onclick={() => toggleEditTag(t.slug)}
														class="rounded-sm border px-1.5 py-0.5 font-mono text-[10.5px]
															{editDraft.tags.includes(t.slug)
															? 'border-primary bg-primary/10 text-primary'
															: 'border-border text-text-soft'}"
													>
														{t.name}
													</button>
												{/each}
											{/each}
										</div>
										<div class="flex justify-end gap-2">
											<button
												type="button"
												onclick={cancelEdit}
												class="text-text-soft font-mono text-[11px]"
											>
												annuler
											</button>
											<button
												type="button"
												onclick={saveEdit}
												class="border-primary text-primary rounded-sm border px-3 py-1 font-mono text-[11px]"
											>
												enregistrer
											</button>
										</div>
									</div>
								</div>
							{:else}
								<div class="grid grid-cols-[60px_1fr_auto] items-center gap-3">
									<div
										class="border-line-soft bg-background flex aspect-square items-center justify-center overflow-hidden rounded-sm border p-1"
									>
										<img src="/svg-library/{e.file}" alt="" class="size-full object-contain" />
									</div>
									<div class="min-w-0">
										<div class="flex items-baseline gap-2">
											<span class="font-mono text-[13px] font-medium">{e.slug}</span>
											<span class="text-text-dim truncate text-[12px]">— {e.name}</span>
										</div>
										<div class="text-text-dim mt-0.5 font-mono text-[11px]">
											{e.theme}/{e.subtheme}
											{#if e.tags.length > 0}· {e.tags.join(' · ')}{/if}
										</div>
									</div>
									<div class="flex gap-1.5">
										<button
											type="button"
											onclick={() => startEdit(e)}
											class="border-border text-text-soft hover:text-primary rounded-sm border px-2 py-1 font-mono text-[11px]"
										>
											éditer
										</button>
										<button
											type="button"
											onclick={() => deleteEntry(e.slug)}
											class="border-border text-text-soft rounded-sm border px-2 py-1 font-mono text-[11px] hover:border-red-500 hover:text-red-500"
										>
											suppr
										</button>
									</div>
								</div>
							{/if}
						</article>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</section>
