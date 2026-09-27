<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { theme } from '$lib/stores/theme.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import PollBanner from '$lib/components/layout/PollBanner.svelte';

	let { children } = $props();

	$effect(() => {
		const cl = document.documentElement.classList;
		if (theme.current === 'dark') cl.add('dark');
		else cl.remove('dark');
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute('content', theme.current === 'dark' ? '#07090a' : '#f7f7f5');
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />
	<PollBanner />
	<main class="flex-1">
		{@render children()}
	</main>
	<Footer />
</div>
