export type Theme = 'dark' | 'light';

class ThemeStore {
	current = $state<Theme>('dark');

	toggle() {
		this.current = this.current === 'dark' ? 'light' : 'dark';
	}

	set(value: Theme) {
		this.current = value;
	}
}

export const theme = new ThemeStore();
