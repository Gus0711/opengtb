<script lang="ts">
	import Hero from '$lib/components/home/Hero.svelte';
	import FeaturedTools from '$lib/components/home/FeaturedTools.svelte';
	import ToolsBySector from '$lib/components/home/ToolsBySector.svelte';
	import PricingNotice from '$lib/components/home/PricingNotice.svelte';
	import RecentArticles from '$lib/components/home/RecentArticles.svelte';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { buildMeta } from '$lib/seo/meta';

	const meta = buildMeta({
		title: 'la boîte à outils des intégrateurs GTB',
		description:
			"12 outils gratuits pour les intégrateurs GTB & IoT : décodeur de payloads, tables Modbus, convertisseur CVC, DJU, loi d'eau, validateur Trends. En local dans le navigateur, sans installer, sans s'inscrire."
	});
</script>

<SeoHead {meta} />

<Hero />
<FeaturedTools />
<ToolsBySector />
<PricingNotice />
<RecentArticles />
