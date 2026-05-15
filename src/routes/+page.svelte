<script lang="ts">
	import Hero from '$lib/components/home/Hero.svelte';
	import FeaturedTools from '$lib/components/home/FeaturedTools.svelte';
	import ToolsBySector from '$lib/components/home/ToolsBySector.svelte';
	import PricingNotice from '$lib/components/home/PricingNotice.svelte';
	import RecentArticles from '$lib/components/home/RecentArticles.svelte';
</script>

<svelte:head>
	<title>opengtb — la boîte à outils des intégrateurs GTB</title>
	<meta
		name="description"
		content="12 outils gratuits pour les intégrateurs GTB &amp; IoT : décodeur de payloads, tables Modbus, convertisseur CVC, DJU, loi d'eau, validateur Trends. En local dans le navigateur, sans installer, sans s'inscrire."
	/>
</svelte:head>

<Hero />
<FeaturedTools />
<ToolsBySector />
<PricingNotice />
<RecentArticles />
