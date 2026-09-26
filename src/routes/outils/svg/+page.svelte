<script lang="ts">
	import { onMount } from 'svelte';
	import { getTool } from '$lib/tools/registry';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { buildMeta } from '$lib/seo/meta';
	import BackLink from '$lib/components/layout/BackLink.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import Download from '@lucide/svelte/icons/download';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import Workflow from '@lucide/svelte/icons/workflow';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import type { SvgEntry, SvgManifest, SvgTaxonomy } from '$lib/tools/svg/types';
	import taxonomyData from '../../../content/data/svg-taxonomy.json';

	const taxonomy = taxonomyData as SvgTaxonomy;
	const tool = getTool('svg')!;
	const meta = buildMeta({
		title: tool.title,
		description:
			'Bibliothèque SVG libres pour synoptiques GTB : CTA, vannes, pompes, capteurs, voyants. Téléchargement gratuit, sans inscription.'
	});

	let manifest = $state<SvgManifest>({
		version: 1,
		updatedAt: new Date().toISOString(),
		entries: []
	});
	let query = $state('');
	let activeTheme = $state<string | null>(null);
	let selected = $state<SvgEntry | null>(null);
	let previewDark = $state(true);
	let svgCode = $state<string>('');
	let copied = $state(false);

	const themesWithCount = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const e of manifest.entries) counts.set(e.theme, (counts.get(e.theme) ?? 0) + 1);
		return taxonomy.themes
			.map((t) => ({ ...t, count: counts.get(t.slug) ?? 0 }))
			.filter((t) => t.count > 0);
	});

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return manifest.entries.filter((e) => {
			if (activeTheme && e.theme !== activeTheme) return false;
			if (!q) return true;
			return (
				e.name.toLowerCase().includes(q) ||
				e.slug.toLowerCase().includes(q) ||
				e.description.toLowerCase().includes(q) ||
				e.tags.some((t) => t.includes(q))
			);
		});
	});

	function themeName(slug: string) {
		return taxonomy.themes.find((t) => t.slug === slug)?.name ?? slug;
	}
	function subthemeName(theme: string, slug: string) {
		return (
			taxonomy.themes
				.find((t) => t.slug === theme)
				?.subthemes.find((s) => s.slug === slug)?.name ?? slug
		);
	}

	async function openDetail(e: SvgEntry) {
		selected = e;
		previewDark = true;
		svgCode = '';
		copied = false;
		try {
			const res = await fetch(`/svg-library/${e.file}`);
			svgCode = await res.text();
		} catch {
			svgCode = '';
		}
	}

	function closeDetail() {
		selected = null;
		svgCode = '';
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && selected) closeDetail();
	}

	async function copySvg() {
		if (!svgCode) return;
		await navigator.clipboard.writeText(svgCode);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	function downloadSvg() {
		if (!selected || !svgCode) return;
		const blob = new Blob([svgCode], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${selected.slug}.svg`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	async function loadManifest() {
		try {
			const res = await fetch('/svg-library/manifest.json', { cache: 'no-store' });
			if (res.ok) manifest = (await res.json()) as SvgManifest;
		} catch {
			// keep empty manifest
		}
	}

	onMount(() => {
		loadManifest();
		const handler = (e: KeyboardEvent) => onKey(e);
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	});
</script>

<SeoHead {meta} />

<section class="mx-auto max-w-6xl px-5 pt-6 pb-16 md:px-7">
	<BackLink href="/outils" label="tous les outils" />

	<header class="mt-6">
		<h1 class="text-3xl font-semibold tracking-[-0.015em]">Bibliothèque SVG</h1>
		<p class="text-text-soft mt-2 max-w-2xl text-[14px]">
			Symboles SVG libres pour synoptiques GTB. Téléchargement direct, sans inscription.
		</p>
	</header>

	<a
		href="/outils/mapper"
		class="border-primary/30 bg-primary/5 hover:border-primary/60 group mt-6 flex items-center gap-3 rounded border px-4 py-3 transition-colors"
	>
		<span class="border-primary/30 text-primary inline-flex size-9 shrink-0 items-center justify-center rounded border">
			<Workflow class="size-4.5" aria-hidden="true" />
		</span>
		<span class="min-w-0 flex-1">
			<strong class="block font-mono text-[13px] font-medium">Cartographier une architecture GTB</strong>
			<span class="text-text-soft block text-[12.5px]">Relier équipements, automates, gateways et listes de points.</span>
		</span>
		<ArrowRight class="text-text-dim group-hover:text-primary size-4 shrink-0 transition-colors" aria-hidden="true" />
	</a>

	<!-- Search + theme chips -->
	<div class="mt-7 space-y-3">
		<label class="relative block">
			<Search class="text-text-dim absolute top-1/2 left-3 size-4 -translate-y-1/2" />
			<input
				type="search"
				bind:value={query}
				placeholder="Rechercher un symbole (vanne, pompe, sonde…)"
				class="border-border bg-card focus:border-primary w-full rounded-md border py-2.5 pr-3 pl-10 text-[14px] outline-none transition-colors"
			/>
		</label>

		{#if themesWithCount.length > 0}
			<div class="flex flex-wrap gap-1.5">
				<button
					type="button"
					onclick={() => (activeTheme = null)}
					class="rounded-sm border px-2.5 py-1 font-mono text-[11.5px] transition-colors
						{activeTheme === null
						? 'border-primary bg-primary/10 text-primary'
						: 'border-border text-text-soft hover:border-primary/40'}"
				>
					tous · {manifest.entries.length}
				</button>
				{#each themesWithCount as t (t.slug)}
					<button
						type="button"
						onclick={() => (activeTheme = t.slug === activeTheme ? null : t.slug)}
						class="rounded-sm border px-2.5 py-1 font-mono text-[11.5px] transition-colors
							{activeTheme === t.slug
							? 'border-primary bg-primary/10 text-primary'
							: 'border-border text-text-soft hover:border-primary/40'}"
					>
						{t.number} · {t.name} · {t.count}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Grid -->
	<div class="mt-8">
		{#if manifest.entries.length === 0}
			<div class="border-border bg-card rounded-md border px-6 py-12 text-center">
				<p class="text-text-soft text-[14px]">La bibliothèque est encore vide.</p>
				<p class="text-text-dim mt-1 font-mono text-[12px]">Les symboles arrivent bientôt.</p>
			</div>
		{:else if filtered.length === 0}
			<div class="border-border bg-card rounded-md border px-6 py-12 text-center">
				<p class="text-text-soft text-[14px]">Aucun symbole ne correspond.</p>
				<button
					type="button"
					onclick={() => {
						query = '';
						activeTheme = null;
					}}
					class="text-primary mt-2 font-mono text-[12px] hover:underline"
				>
					réinitialiser
				</button>
			</div>
		{:else}
			<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
				{#each filtered as e (e.slug)}
					<li>
						<button
							type="button"
							onclick={() => openDetail(e)}
							class="
								group border-border bg-card hover:border-primary/60 focus-visible:border-primary
								block w-full overflow-hidden rounded-md border text-left transition-colors
								focus-visible:outline-none
							"
						>
							<div
								class="bg-background flex aspect-square items-center justify-center p-4 transition-colors"
							>
								<img
									src="/svg-library/{e.file}"
									alt={e.name}
									loading="lazy"
									class="size-full object-contain text-current"
								/>
							</div>
							<div class="border-line-soft border-t px-3 py-2">
								<div
									class="group-hover:text-primary font-mono text-[12.5px] font-medium transition-colors"
								>
									{e.slug}
								</div>
								<div class="text-text-dim mt-0.5 truncate text-[11px]">{e.name}</div>
							</div>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>

<!-- Modal détail -->
{#if selected}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			aria-label="Fermer"
			onclick={closeDetail}
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Détail du symbole"
			class="bg-card border-border relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg border shadow-xl"
		>
			<header class="border-border flex items-start justify-between border-b px-5 py-4">
				<div>
					<div class="text-text-dim font-mono text-[11px] tracking-[0.1em] uppercase">
						{themeName(selected.theme)} · {subthemeName(selected.theme, selected.subtheme)}
					</div>
					<h2 class="mt-1 font-mono text-[15px] font-semibold">{selected.slug}</h2>
					<p class="text-text-soft mt-0.5 text-[13px]">{selected.name}</p>
				</div>
				<button
					type="button"
					onclick={closeDetail}
					aria-label="Fermer"
					class="text-text-dim hover:text-primary rounded-sm p-1"
				>
					<X class="size-5" />
				</button>
			</header>

			<div class="grid grid-cols-1 gap-5 p-5 md:grid-cols-[1fr_240px]">
				<div>
					<div class="flex items-center justify-between">
						<span class="text-text-dim font-mono text-[11px] tracking-[0.1em] uppercase">
							Aperçu
						</span>
						<button
							type="button"
							onclick={() => (previewDark = !previewDark)}
							class="border-border text-text-soft hover:text-primary rounded-sm border px-2 py-0.5 font-mono text-[11px]"
						>
							fond {previewDark ? 'clair' : 'sombre'}
						</button>
					</div>
					<div
						class="mt-2 flex aspect-square items-center justify-center rounded-md border-2 border-dashed p-8 transition-colors
							{previewDark
							? 'border-zinc-700 bg-zinc-900 text-zinc-100'
							: 'border-zinc-200 bg-zinc-50 text-zinc-900'}"
					>
						<img
							src="/svg-library/{selected.file}"
							alt={selected.name}
							class="size-full object-contain"
						/>
					</div>

					{#if svgCode}
						<details class="mt-3">
							<summary
								class="text-text-soft hover:text-primary cursor-pointer font-mono text-[11.5px]"
							>
								code SVG
							</summary>
							<pre
								class="border-border bg-background mt-2 max-h-64 overflow-auto rounded-sm border p-3 font-mono text-[11.5px] whitespace-pre-wrap break-all">{svgCode}</pre>
						</details>
					{/if}
				</div>

				<div class="space-y-3">
					{#if selected.description}
						<p class="text-text-soft text-[13px] leading-[1.55]">{selected.description}</p>
					{/if}

					{#if selected.tags.length > 0}
						<div>
							<span class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
								Tags
							</span>
							<div class="mt-1.5 flex flex-wrap gap-1">
								{#each selected.tags as t (t)}
									<Tag>{t}</Tag>
								{/each}
							</div>
						</div>
					{/if}

					<div class="space-y-2 pt-2">
						<button
							type="button"
							onclick={downloadSvg}
							disabled={!svgCode}
							class="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-sm px-3 py-2 font-mono text-[12px] font-semibold disabled:opacity-50"
						>
							<Download class="size-4" />
							télécharger .svg
						</button>
						<button
							type="button"
							onclick={copySvg}
							disabled={!svgCode}
							class="border-border text-text-soft hover:text-primary flex w-full items-center justify-center gap-2 rounded-sm border px-3 py-2 font-mono text-[12px] disabled:opacity-50"
						>
							{#if copied}
								<Check class="size-4 text-green-500" />
								copié
							{:else}
								<Copy class="size-4" />
								copier le code
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
