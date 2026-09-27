// État des easter eggs : mode rétro (écran de supervision cathodique),
// notifications éphémères et ouverture du terminal.

export interface Toast {
	id: number;
	text: string;
}

class FunStore {
	retro = $state(false);
	terminalOpen = $state(false);
	toasts = $state<Toast[]>([]);
	private nextId = 1;

	toast(text: string, ms = 4000) {
		const id = this.nextId++;
		this.toasts = [...this.toasts, { id, text }];
		setTimeout(() => (this.toasts = this.toasts.filter((t) => t.id !== id)), ms);
	}

	toggleRetro() {
		this.retro = !this.retro;
		this.toast(
			this.retro
				? 'Mode Windows NT 4 + supervision 1998 activé. Bonne chance.'
				: 'Retour au XXIᵉ siècle. Ouf.'
		);
	}
}

export const fun = new FunStore();
