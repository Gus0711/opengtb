<script lang="ts">
	import { page } from '$app/state';
	import type { ResolvedMeta } from './meta';
	import { SITE_NAME, SITE_URL } from './meta';

	let { meta }: { meta: ResolvedMeta } = $props();

	const url = $derived(meta.url ?? `${SITE_URL}${page.url.pathname}`);
	const absoluteImage = $derived(
		meta.image.startsWith('http') ? meta.image : `${SITE_URL}${meta.image}`
	);
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<link rel="canonical" href={url} />

	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={meta.title} />
	<meta property="og:description" content={meta.description} />
	<meta property="og:type" content={meta.type} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={absoluteImage} />
	<meta property="og:locale" content="fr_FR" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={meta.title} />
	<meta name="twitter:description" content={meta.description} />
	<meta name="twitter:image" content={absoluteImage} />
</svelte:head>
