<script lang="ts">
	import { MONTH_LABELS } from '$lib/tools/dju/data';
	import type { StationData } from '$lib/tools/dju/types';

	let {
		station,
		kind = 'heating',
		years
	}: {
		station: StationData;
		kind?: 'heating' | 'cooling';
		years: number[];
	} = $props();

	const yearsSorted = $derived([...years].sort((a, b) => b - a));

	function valFor(year: number, month: number): number | null {
		const e = station.monthly.find((m) => m.date === `${year}-${String(month).padStart(2, '0')}`);
		if (!e) return null;
		return kind === 'heating' ? e.djuH : e.djuC;
	}

	function yearTotal(year: number): number | null {
		const y = station.yearly.find((yy) => yy.year === year);
		if (!y) return null;
		return kind === 'heating' ? y.djuH : y.djuC;
	}

	function yearInfo(year: number): { complete: boolean; monthsCovered: number } {
		const y = station.yearly.find((yy) => yy.year === year);
		return y ? { complete: y.complete, monthsCovered: y.monthsCovered } : { complete: false, monthsCovered: 0 };
	}

	function meanFor(month: number): number | null {
		const e = station.averages.monthly.find((m) => m.month === month);
		if (!e) return null;
		return kind === 'heating' ? e.djuH : e.djuC;
	}

	function fmt(v: number | null): string {
		return v == null ? '—' : Math.round(v).toString();
	}
</script>

<div class="border-line-soft overflow-x-auto rounded-md border">
	<table class="w-full border-collapse font-mono text-[12px]">
		<thead class="bg-background/40 text-text-dim">
			<tr>
				<th class="border-line-soft sticky left-0 z-10 border-b border-r bg-inherit px-2 py-1.5 text-left">
					Année
				</th>
				{#each MONTH_LABELS as l, i (i)}
					<th class="border-line-soft border-b px-2 py-1.5 text-right">{l}</th>
				{/each}
				<th class="border-line-soft text-primary border-b border-l px-2 py-1.5 text-right">
					Total
				</th>
			</tr>
		</thead>
		<tbody>
			<tr class="bg-background/30">
				<th class="border-line-soft text-primary sticky left-0 z-10 border-b border-r bg-background/30 px-2 py-1.5 text-left">
					moyenne
				</th>
				{#each Array(12) as _, i (i)}
					<td class="border-line-soft text-text-soft border-b px-2 py-1.5 text-right">
						{fmt(meanFor(i + 1))}
					</td>
				{/each}
				<td class="border-line-soft text-primary border-b border-l px-2 py-1.5 text-right font-semibold">
					{fmt(station.averages.yearly[kind === 'heating' ? 'djuH' : 'djuC'])}
				</td>
			</tr>
			{#each yearsSorted as year (year)}
				{@const info = yearInfo(year)}
				<tr class="hover:bg-background/30">
					<th
						class="border-line-soft sticky left-0 z-10 border-b border-r bg-inherit px-2 py-1.5 text-left"
						title={info.complete ? `${year} : année complète` : `${year} : ${info.monthsCovered}/12 mois`}
					>
						{year}{#if !info.complete}<span class="text-text-dim ml-1 font-normal">·{info.monthsCovered}/12</span>{/if}
					</th>
					{#each Array(12) as _, i (i)}
						<td class="border-line-soft border-b px-2 py-1.5 text-right">
							{fmt(valFor(year, i + 1))}
						</td>
					{/each}
					<td
						class="border-line-soft text-primary border-b border-l px-2 py-1.5 text-right font-semibold {info.complete
							? ''
							: 'opacity-60'}"
						title={info.complete ? '' : 'Total partiel — année incomplète'}
					>
						{fmt(yearTotal(year))}{#if !info.complete}<span class="text-text-dim ml-0.5">*</span>{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
