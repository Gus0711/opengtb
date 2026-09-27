<script lang="ts">
	// Scène HORS n°1 : plus de chauffage, le site gèle.
	// Givre qui gagne depuis les bords (grille de couverture), neige, stalactites
	// sous l'en-tête, thermomètre qui chute, textes qui grelottent. Passer la
	// souris « souffle » sur le givre et le fait fondre localement.
	import { onMount } from 'svelte';

	const CELL = 22;
	const START_TEMP = 19;
	const MIN_TEMP = -6;
	const COOL_RATE = 0.45; // °C / s

	let canvas = $state<HTMLCanvasElement>();
	let temp = $state(START_TEMP);

	onMount(() => {
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const ctx = canvas!.getContext('2d')!;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		let W = 0;
		let H = 0;
		let cols = 0;
		let rows = 0;
		let cover = new Float32Array(0);
		let speed = new Float32Array(0);
		const frost = document.createElement('canvas');
		// Masque basse résolution (1 px = 1 case) agrandi avec lissage : bords doux.
		const mask = document.createElement('canvas');
		const maskCtx = mask.getContext('2d')!;
		let maskData: ImageData;
		const comp = document.createElement('canvas');
		const compCtx = comp.getContext('2d')!;

		function resize() {
			W = window.innerWidth;
			H = window.innerHeight;
			canvas!.width = W * dpr;
			canvas!.height = H * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			cols = Math.ceil(W / CELL);
			rows = Math.ceil(H / CELL);
			cover = new Float32Array(cols * rows);
			speed = new Float32Array(cols * rows);
			mask.width = cols;
			mask.height = rows;
			maskData = maskCtx.createImageData(cols, rows);
			comp.width = W;
			comp.height = H;
			// Le givre avance plus vite près des bords, avec un peu de hasard.
			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					const edge = Math.min(c, cols - 1 - c, r, rows - 1 - r) / (Math.min(cols, rows) / 2);
					speed[r * cols + c] = Math.max(0, 0.09 * (1 - edge * 1.15) + (Math.random() - 0.5) * 0.03);
				}
			}
			paintFrost();
		}

		// Texture de cristaux dessinée une fois : branches aléatoires ramifiées.
		function paintFrost() {
			frost.width = W;
			frost.height = H;
			const f = frost.getContext('2d')!;
			f.clearRect(0, 0, W, H);
			f.fillStyle = 'rgba(210, 235, 255, 0.28)';
			f.fillRect(0, 0, W, H);
			f.lineCap = 'round';
			const branch = (x: number, y: number, a: number, len: number, depth: number) => {
				if (depth === 0 || len < 3) return;
				const x2 = x + Math.cos(a) * len;
				const y2 = y + Math.sin(a) * len;
				f.strokeStyle = `rgba(240, 250, 255, ${0.25 + depth * 0.1})`;
				f.lineWidth = depth * 0.45;
				f.beginPath();
				f.moveTo(x, y);
				f.lineTo(x2, y2);
				f.stroke();
				branch(x2, y2, a + 0.55 + Math.random() * 0.3, len * 0.62, depth - 1);
				branch(x2, y2, a - 0.55 - Math.random() * 0.3, len * 0.62, depth - 1);
				branch(x2, y2, a + (Math.random() - 0.5) * 0.3, len * 0.72, depth - 1);
			};
			const seeds = Math.round((W * H) / 9000);
			for (let i = 0; i < seeds; i++) {
				branch(Math.random() * W, Math.random() * H, Math.random() * Math.PI * 2, 14 + Math.random() * 26, 4);
			}
			for (let i = 0; i < seeds * 6; i++) {
				f.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`;
				f.fillRect(Math.random() * W, Math.random() * H, 1.2, 1.2);
			}
		}

		// Neige
		const flakes = Array.from({ length: reduced ? 0 : 140 }, () => ({
			x: Math.random() * window.innerWidth,
			y: Math.random() * window.innerHeight,
			r: 0.8 + Math.random() * 2.2,
			vy: 20 + Math.random() * 45,
			phase: Math.random() * Math.PI * 2
		}));

		// Stalactites accrochées sous l'en-tête
		const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 60;
		const icicles = Array.from({ length: Math.ceil(window.innerWidth / 26) }, (_, i) => ({
			x: i * 26 + Math.random() * 14,
			w: 5 + Math.random() * 7,
			max: 14 + Math.random() * 46
		}));

		let mouse: { x: number; y: number } | null = null;
		const onMove = (e: PointerEvent) => (mouse = { x: e.clientX, y: e.clientY });
		const onLeave = () => (mouse = null);

		resize();
		window.addEventListener('resize', resize);
		window.addEventListener('pointermove', onMove);
		document.addEventListener('pointerleave', onLeave);
		document.documentElement.classList.add('hors-gel');

		let last = performance.now();
		let elapsed = 0;
		let raf = 0;

		const frame = (t: number) => {
			const dt = Math.min(0.05, (t - last) / 1000);
			last = t;
			elapsed += dt;
			temp = Math.max(MIN_TEMP, START_TEMP - elapsed * COOL_RATE);
			const chill = Math.min(1, elapsed / 30);

			// Couverture du givre
			for (let i = 0; i < cover.length; i++) {
				cover[i] = Math.min(1, cover[i] + speed[i] * dt * (0.6 + chill));
			}
			if (mouse) {
				const R = 90;
				const c0 = Math.max(0, Math.floor((mouse.x - R) / CELL));
				const c1 = Math.min(cols - 1, Math.floor((mouse.x + R) / CELL));
				const r0 = Math.max(0, Math.floor((mouse.y - R) / CELL));
				const r1 = Math.min(rows - 1, Math.floor((mouse.y + R) / CELL));
				for (let r = r0; r <= r1; r++) {
					for (let c = c0; c <= c1; c++) {
						const d = Math.hypot(c * CELL + CELL / 2 - mouse.x, r * CELL + CELL / 2 - mouse.y);
						if (d < R) cover[r * cols + c] = Math.max(0, cover[r * cols + c] - (1 - d / R) * 3.5 * dt);
					}
				}
			}

			ctx.clearRect(0, 0, W, H);
			// Voile bleuté global qui s'intensifie
			ctx.fillStyle = `rgba(120, 180, 230, ${0.1 * chill})`;
			ctx.fillRect(0, 0, W, H);

			for (let i = 0; i < cover.length; i++) maskData.data[i * 4 + 3] = cover[i] * 242;
			maskCtx.putImageData(maskData, 0, 0);
			compCtx.globalCompositeOperation = 'copy';
			compCtx.drawImage(frost, 0, 0);
			compCtx.globalCompositeOperation = 'destination-in';
			compCtx.imageSmoothingEnabled = true;
			compCtx.drawImage(mask, 0, 0, cols * CELL, rows * CELL);
			ctx.drawImage(comp, 0, 0);

			// Stalactites
			ctx.fillStyle = 'rgba(225, 242, 255, 0.85)';
			for (const ic of icicles) {
				const len = ic.max * Math.min(1, elapsed / 25);
				ctx.beginPath();
				ctx.moveTo(ic.x, headerBottom);
				ctx.lineTo(ic.x + ic.w, headerBottom);
				ctx.lineTo(ic.x + ic.w / 2, headerBottom + len);
				ctx.closePath();
				ctx.fill();
			}

			// Neige
			ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
			for (const f of flakes) {
				f.y += f.vy * dt;
				f.x += Math.sin(t / 900 + f.phase) * 12 * dt;
				if (f.y > H + 5) {
					f.y = -5;
					f.x = Math.random() * W;
				}
				ctx.beginPath();
				ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
				ctx.fill();
			}

			raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
			window.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerleave', onLeave);
			document.documentElement.classList.remove('hors-gel');
		};
	});

	const fmt = (t: number) => `${t < 0 ? '−' : ''}${Math.abs(t).toFixed(1).replace('.', ',')}`;
	// Remplissage du thermomètre : 19 °C → plein, −6 °C → vide.
	const fill = $derived(Math.max(0.04, (temp - MIN_TEMP) / (START_TEMP - MIN_TEMP)));
</script>

<canvas bind:this={canvas} class="pointer-events-none fixed inset-0 z-[75] h-full w-full"></canvas>

<div
	class="fixed top-20 right-4 z-[76] flex items-center gap-3 rounded-md border border-sky-300/40 bg-slate-950/80 px-3 py-2 font-mono text-xs text-sky-100 shadow-lg backdrop-blur"
	role="status"
>
	<div class="relative h-12 w-3 rounded-full border border-sky-200/60 bg-slate-900" aria-hidden="true">
		<div
			class="absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-500"
			style="height: {fill * 100}%; background: {temp > 10 ? '#f47174' : temp > 3 ? '#f5b94a' : '#67cae0'}"
		></div>
	</div>
	<div>
		<p class="text-sky-300/80 text-[10px] tracking-widest uppercase">T° ambiance</p>
		<p class="text-lg font-semibold tabular-nums">{fmt(temp)} °C</p>
		<p class="text-[10px] text-sky-300/70">
			{temp > 12 ? 'ça fraîchit…' : temp > 5 ? 'les doigts gèlent' : temp > 0 ? 'mets un pull' : 'banquise ❄'}
		</p>
	</div>
</div>

<p
	class="pointer-events-none fixed bottom-20 left-1/2 z-[76] -translate-x-1/2 rounded bg-slate-950/70 px-3 py-1 font-mono text-[11px] text-sky-100"
>
	Souffle sur l'écran (bouge la souris) pour faire fondre le givre
</p>
