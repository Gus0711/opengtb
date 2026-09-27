// Thème piloté comme un commutateur d'armoire : AUTO / MANU / HORS.
//   AUTO : suit le thème du système (prefers-color-scheme)
//   MANU : thème forcé, basculé à la main (clair/sombre)
//   HORS : écran « automate à l'arrêt » (easter egg, jamais mémorisé)
// Par défaut : MANU sombre, comme avant. Le choix est gardé dans le navigateur ;
// app.html l'applique avant l'hydratation pour éviter un flash.

export type Theme = 'dark' | 'light';
export type ThemeMode = 'auto' | 'manu' | 'hors';

const STORAGE_KEY = 'opengtb:theme';

class ThemeStore {
	mode = $state<ThemeMode>('manu');
	manual = $state<Theme>('dark');
	system = $state<Theme>('dark');
	// Mode avant la mise HORS, pour revenir au même endroit.
	private resume: 'auto' | 'manu' = 'manu';

	current = $derived<Theme>(this.effectiveMode() === 'auto' ? this.system : this.manual);

	private effectiveMode(): 'auto' | 'manu' {
		return this.mode === 'hors' ? this.resume : this.mode;
	}

	init() {
		try {
			const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
			if (saved?.mode === 'auto' || saved?.mode === 'manu') this.mode = saved.mode;
			if (saved?.manual === 'dark' || saved?.manual === 'light') this.manual = saved.manual;
		} catch {}
		const mq = window.matchMedia('(prefers-color-scheme: light)');
		this.system = mq.matches ? 'light' : 'dark';
		mq.addEventListener('change', (e) => (this.system = e.matches ? 'light' : 'dark'));
	}

	private save() {
		if (this.mode === 'hors') return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: this.mode, manual: this.manual }));
		} catch {}
	}

	setMode(mode: ThemeMode) {
		if (mode === 'hors') {
			if (this.mode !== 'hors') this.resume = this.mode;
		}
		this.mode = mode;
		this.save();
	}

	/** Remet en marche après HORS. */
	restart() {
		this.mode = this.resume;
	}

	toggle() {
		this.set(this.current === 'dark' ? 'light' : 'dark');
	}

	set(value: Theme) {
		this.manual = value;
		this.mode = 'manu';
		this.save();
	}
}

export const theme = new ThemeStore();
