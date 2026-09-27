<script lang="ts">
	// Terminal caché : ` ou Ctrl+K pour ouvrir, Échap pour fermer.
	// L'interprétation des commandes vit dans $lib/fun/terminal.ts.
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { TOOLS } from '$lib/tools/registry';
	import { theme } from '$lib/stores/theme.svelte';
	import { fun } from '$lib/fun/fun.svelte';
	import { run, complete, type Context, type Line, type Result } from '$lib/fun/terminal';

	const HISTORY_KEY = 'opengtb:term-history';
	const STREAM_MS = 140;

	const tools = TOOLS.map(({ slug, name, title, external }) => ({ slug, name, title, external }));
	let articles: Context['articles'] = [];
	let articlesLoaded = false;

	let lines = $state<(Line & { prompt?: boolean })[]>([
		{ text: 'opengtb shell v1.0 — liaison établie.', tone: 'accent' },
		{ text: 'Tape « help » pour la liste des commandes.', tone: 'dim' }
	]);
	let input = $state('');
	let history: string[] = [];
	let cursor = -1;
	let busy = $state(false);

	let inputEl = $state<HTMLInputElement>();
	let outputEl = $state<HTMLDivElement>();

	const context = (): Context => ({
		tools,
		articles,
		history,
		now: new Date(),
		random: Math.random
	});

	async function scrollDown() {
		await tick();
		outputEl?.scrollTo({ top: outputEl.scrollHeight });
	}

	async function loadArticles() {
		if (articlesLoaded) return;
		try {
			const res = await fetch('/articles.json');
			if (res.ok) articles = await res.json();
			articlesLoaded = true;
		} catch {}
	}

	$effect(() => {
		if (!fun.terminalOpen) return;
		loadArticles();
		try {
			history = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
		} catch {}
		tick().then(() => inputEl?.focus());
		scrollDown();
	});

	async function print(result: Result) {
		if (!result.stream) {
			lines = [...lines, ...result.lines];
			return scrollDown();
		}
		busy = true;
		for (const line of result.lines) {
			lines = [...lines, line];
			scrollDown();
			await new Promise((r) => setTimeout(r, STREAM_MS));
		}
		busy = false;
		await tick();
		inputEl?.focus();
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (busy) return;
		const cmd = input;
		input = '';
		cursor = -1;
		lines = [...lines, { text: cmd, prompt: true }];
		if (cmd.trim()) {
			history = [...history.filter((h) => h !== cmd.trim()), cmd.trim()].slice(-50);
			try {
				localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
			} catch {}
		}

		const result = run(cmd, context());
		await print(result);

		const action = result.action;
		if (!action) return;
		switch (action.type) {
			case 'clear':
				lines = [];
				break;
			case 'exit':
				setTimeout(() => (fun.terminalOpen = false), 300);
				break;
			case 'goto':
				await goto(action.href);
				fun.terminalOpen = false;
				break;
			case 'external':
				window.open(action.href, '_blank', 'noopener,noreferrer');
				break;
			case 'theme':
				if (action.value === 'auto') theme.setMode('auto');
				else theme.set(action.value);
				break;
			case 'retro':
				fun.toggleRetro();
				break;
		}
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			fun.terminalOpen = false;
		} else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
			if (!history.length) return;
			e.preventDefault();
			if (e.key === 'ArrowUp') cursor = cursor === -1 ? history.length - 1 : Math.max(0, cursor - 1);
			else cursor = cursor === -1 ? -1 : cursor + 1;
			if (cursor >= history.length) cursor = -1;
			input = cursor === -1 ? '' : history[cursor];
		} else if (e.key === 'Tab') {
			e.preventDefault();
			const { value, candidates } = complete(input, context());
			input = value;
			if (candidates.length > 1) {
				lines = [...lines, { text: input, prompt: true }, { text: candidates.join('   '), tone: 'dim' }];
				scrollDown();
			}
		} else if (e.key === 'l' && e.ctrlKey) {
			e.preventDefault();
			lines = [];
		}
	}

	const toneClass: Record<string, string> = {
		out: 'text-foreground',
		dim: 'text-text-dim',
		ok: 'text-primary',
		err: 'text-red-signal',
		accent: 'text-amber'
	};
</script>

{#if fun.terminalOpen}
	<div
		class="term border-primary/50 bg-background/95 fixed inset-x-0 bottom-0 z-[60] flex h-[46vh] min-h-64 flex-col border-t font-mono text-[13px] shadow-2xl backdrop-blur"
		role="dialog"
		aria-label="Terminal opengtb"
	>
		<div class="border-border flex items-center gap-3 border-b px-4 py-2 text-xs">
			<span class="flex gap-1.5" aria-hidden="true">
				<span class="bg-red-signal h-2.5 w-2.5 rounded-full"></span>
				<span class="bg-amber h-2.5 w-2.5 rounded-full"></span>
				<span class="bg-primary h-2.5 w-2.5 rounded-full"></span>
			</span>
			<span class="text-text-dim">gtb@opengtb:~</span>
			<span class="text-text-dim ml-auto hidden sm:inline">Échap pour fermer</span>
			<button
				type="button"
				onclick={() => (fun.terminalOpen = false)}
				class="text-text-dim hover:text-foreground"
				aria-label="Fermer le terminal">✕</button
			>
		</div>

		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			bind:this={outputEl}
			class="flex-1 overflow-y-auto px-4 py-3 leading-relaxed"
			onclick={() => inputEl?.focus()}
		>
			{#each lines as line, i (i)}
				{#if line.prompt}
					<p class="m-0 whitespace-pre-wrap"><span class="text-primary">$</span> {line.text}</p>
				{:else}
					<p class="m-0 whitespace-pre-wrap {toneClass[line.tone ?? 'out']}">{line.text}</p>
				{/if}
			{/each}

			<form onsubmit={submit} class="flex items-center gap-2">
				<span class="text-primary">$</span>
				<input
					bind:this={inputEl}
					bind:value={input}
					onkeydown={onKey}
					disabled={busy}
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					aria-label="Commande"
					class="text-foreground caret-primary min-w-0 flex-1 bg-transparent outline-none"
				/>
			</form>
		</div>
	</div>
{/if}
