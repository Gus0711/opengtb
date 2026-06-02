<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		subtitle,
		children
	}: {
		open?: boolean;
		title: string;
		subtitle?: string;
		children: Snippet;
	} = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) dialogEl.showModal();
		if (!open && dialogEl.open) dialogEl.close();
	});

	function onClose() {
		open = false;
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === dialogEl) open = false;
	}
</script>

<dialog
	bind:this={dialogEl}
	onclose={onClose}
	onclick={onBackdropClick}
	class="border-line-strong bg-card text-foreground m-auto h-[92vh] w-[min(96vw,1400px)] rounded-md border p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
>
	<div class="flex h-full flex-col">
		<header class="border-line-soft flex items-baseline justify-between gap-4 border-b px-5 py-3">
			<div class="min-w-0">
				<h3 class="font-mono text-[13px] font-semibold tracking-wide uppercase">
					<span class="text-text-dim">›</span>
					<span class="text-primary">{title}</span>
				</h3>
				{#if subtitle}
					<p class="text-text-dim mt-0.5 truncate font-mono text-[11px]">{subtitle}</p>
				{/if}
			</div>
			<button
				type="button"
				onclick={() => (open = false)}
				class="border-line-strong hover:border-primary hover:text-primary text-text-soft inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-colors"
				aria-label="Fermer"
			>
				<X class="size-3.5" /> fermer (Esc)
			</button>
		</header>
		<div class="min-h-0 flex-1 overflow-auto p-5">
			{@render children()}
		</div>
	</div>
</dialog>
