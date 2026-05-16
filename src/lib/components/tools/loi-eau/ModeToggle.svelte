<script lang="ts">
	import type { Mode } from '$lib/tools/loi-eau/types';

	let { value = $bindable<Mode>('decouverte') }: { value: Mode } = $props();

	const options: { id: Mode; label: string; hint: string }[] = [
		{
			id: 'decouverte',
			label: 'Découverte',
			hint: 'Recommandation automatique selon le bâtiment et l\'émetteur.'
		},
		{
			id: 'pro',
			label: 'Pro',
			hint: 'Réglage fin pente / parallèle, comparaison avec la recommandation, diagnostic.'
		}
	];
</script>

<div class="border-border bg-card rounded-md border p-1.5">
	<div class="flex items-center gap-1.5" role="tablist" aria-label="Mode d'affichage">
		{#each options as opt (opt.id)}
			<button
				type="button"
				role="tab"
				aria-selected={value === opt.id}
				onclick={() => (value = opt.id)}
				class="
					flex-1 rounded-sm px-3 py-2 font-mono text-[12.5px] font-semibold transition-colors
					{value === opt.id
					? 'bg-primary text-primary-foreground'
					: 'text-text-soft hover:text-foreground hover:bg-line-soft/40'}
				"
				title={opt.hint}
			>
				{opt.label}
			</button>
		{/each}
	</div>
</div>
