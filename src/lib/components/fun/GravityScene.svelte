<script lang="ts">
	// Scène HORS n°2 : plus rien ne tient. Les éléments visibles de la page se
	// décrochent et tombent en tas (moteur physique matter-js, chargé à la demande).
	// On clone chaque élément en position fixe et on masque l'original ; tout est
	// restauré à la remise en service.
	import { onMount } from 'svelte';

	const SELECTOR = [
		'header a',
		'header button',
		'aside h2',
		'aside button',
		'main h1',
		'main h2',
		'main h3',
		'main p',
		'main a',
		'main button',
		'main img',
		'main li',
		'main figure',
		'main pre',
		'main table',
		'main svg',
		'footer a',
		'footer span',
		'footer button'
	].join(',');
	const MAX_BODIES = 70;

	// Propriétés héritées à figer sur le clone (il perd ses ancêtres).
	const INHERITED = [
		'color',
		'font-family',
		'font-size',
		'font-weight',
		'font-style',
		'line-height',
		'letter-spacing',
		'text-transform',
		'text-align',
		'white-space'
	];

	let layer = $state<HTMLDivElement>();
	let count = $state(0);

	onMount(() => {
		let disposed = false;
		let cleanup = () => {};

		(async () => {
			const Matter = (await import('matter-js')).default;
			if (disposed) return;
			const { Engine, Bodies, Body, Composite, Mouse, MouseConstraint } = Matter;

			const W = window.innerWidth;
			const H = window.innerHeight;
			const visible = (r: DOMRect) =>
				r.width >= 12 && r.height >= 8 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;

			// Éléments visibles, en gardant le plus externe quand ils s'imbriquent.
			const candidates = [...document.querySelectorAll<HTMLElement>(SELECTOR)].filter((el) => {
				const r = el.getBoundingClientRect();
				return visible(r) && r.width < W * 0.95 && r.height < H * 0.8;
			});
			const picked = candidates
				.filter((el) => !candidates.some((o) => o !== el && o.contains(el)))
				.slice(0, MAX_BODIES);

			const engine = Engine.create({ gravity: { x: 0, y: 1.1 } });
			const wall = { isStatic: true, restitution: 0.2, friction: 0.8 };
			Composite.add(engine.world, [
				Bodies.rectangle(W / 2, H + 50, W * 3, 100, wall),
				Bodies.rectangle(-50, H / 2, 100, H * 4, wall),
				Bodies.rectangle(W + 50, H / 2, 100, H * 4, wall)
			]);

			const items = picked.map((el) => {
				const r = el.getBoundingClientRect();
				const cs = getComputedStyle(el);
				const clone = el.cloneNode(true) as HTMLElement;
				clone.removeAttribute('id');
				for (const p of INHERITED) clone.style.setProperty(p, cs.getPropertyValue(p));
				Object.assign(clone.style, {
					position: 'absolute',
					left: '0',
					top: '0',
					margin: '0',
					width: `${r.width}px`,
					height: `${r.height}px`,
					boxSizing: 'border-box',
					transformOrigin: 'center center',
					willChange: 'transform',
					userSelect: 'none',
					cursor: 'grab'
				});
				if (cs.display === 'inline') clone.style.display = 'inline-block';
				layer!.appendChild(clone);
				el.style.visibility = 'hidden';

				const body = Bodies.rectangle(r.left + r.width / 2, r.top + r.height / 2, r.width, r.height, {
					restitution: 0.35,
					friction: 0.6,
					frictionAir: 0.012,
					chamfer: { radius: Math.min(6, r.height / 3) }
				});
				// Figé après création : créé directement avec `isStatic`, matter-js
				// perd la masse d'origine et le corps part en NaN une fois libéré.
				Body.setStatic(body, true);
				Composite.add(engine.world, body);
				return { el, clone, body, w: r.width, h: r.height };
			});
			count = items.length;

			// Tout se décroche en cascade, du haut vers le bas.
			const timers = items.map(({ body }) =>
				setTimeout(
					() => {
						Body.setStatic(body, false);
						Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08);
					},
					Math.random() * 900 + (body.position.y / H) * 500
				)
			);

			const mouse = Mouse.create(layer!);
			const drag = MouseConstraint.create(engine, {
				mouse,
				constraint: { stiffness: 0.2, render: { visible: false } }
			});
			Composite.add(engine.world, drag);

			// Les clones ne doivent pas naviguer ni soumettre quoi que ce soit.
			const block = (e: Event) => e.preventDefault();
			layer!.addEventListener('click', block, true);

			const prevOverflow = document.documentElement.style.overflow;
			document.documentElement.style.overflow = 'hidden';

			let raf = 0;
			let last = performance.now();
			const frame = (t: number) => {
				Engine.update(engine, Math.min(1000 / 30, t - last));
				last = t;
				for (const { clone, body, w, h } of items) {
					const { x, y } = body.position;
					clone.style.transform = `translate(${x - w / 2}px, ${y - h / 2}px) rotate(${body.angle}rad)`;
				}
				raf = requestAnimationFrame(frame);
			};
			raf = requestAnimationFrame(frame);

			cleanup = () => {
				cancelAnimationFrame(raf);
				timers.forEach(clearTimeout);
				layer?.removeEventListener('click', block, true);
				Composite.clear(engine.world, false);
				Engine.clear(engine);
				for (const { el, clone } of items) {
					el.style.visibility = '';
					clone.remove();
				}
				document.documentElement.style.overflow = prevOverflow;
			};
		})();

		return () => {
			disposed = true;
			cleanup();
		};
	});
</script>

<div bind:this={layer} class="fixed inset-0 z-[75] touch-none overflow-hidden" aria-hidden="true"></div>

{#if count}
	<p
		class="bg-card/90 text-text-soft pointer-events-none fixed top-20 left-1/2 z-[76] -translate-x-1/2 rounded px-3 py-1 font-mono text-[11px]"
	>
		{count} éléments ont lâché · attrape-les et lance-les
	</p>
{/if}
