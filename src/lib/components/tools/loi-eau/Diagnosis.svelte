<script lang="ts">
	import type { Diagnostic } from '$lib/tools/loi-eau/types';
	import Check from '@lucide/svelte/icons/check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Info from '@lucide/svelte/icons/info';
	import XCircle from '@lucide/svelte/icons/x-circle';

	let { diagnostics }: { diagnostics: Diagnostic[] } = $props();

	const icons = {
		ok: Check,
		info: Info,
		warn: TriangleAlert,
		error: XCircle
	};

	const colors = {
		ok: 'text-green-500 border-green-500/30 bg-green-500/5',
		info: 'text-cyan border-cyan/30 bg-cyan/5',
		warn: 'text-amber-500 border-amber-500/30 bg-amber-500/5',
		error: 'text-red-500 border-red-500/30 bg-red-500/5'
	};
</script>

<section class="border-border bg-card rounded-md border">
	<header class="border-border border-b px-4 py-2.5">
		<h3 class="font-mono text-[11.5px] tracking-[0.1em] uppercase">
			<span class="text-primary">§</span> diagnostic
		</h3>
	</header>
	<ul class="space-y-2 px-4 py-3">
		{#each diagnostics as d (d.message)}
			{@const Icon = icons[d.level]}
			<li class="rounded-sm border px-3 py-2 text-[13px] {colors[d.level]}">
				<div class="flex items-start gap-2">
					<Icon class="mt-0.5 size-4 shrink-0" />
					<div class="min-w-0 flex-1">
						<div class="font-medium">{d.message}</div>
						{#if d.hint}
							<p class="text-text-soft mt-1 text-[12px] leading-[1.45]">{d.hint}</p>
						{/if}
					</div>
				</div>
			</li>
		{/each}
	</ul>
</section>
