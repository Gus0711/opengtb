// Widget Cloudflare Turnstile en rendu explicite, partagé par les formulaires
// publics (commentaires d'articles). Le script n'est chargé que si le serveur
// renvoie une clé de site : en dev, pas de clé, pas de widget.

interface Turnstile {
	render: (el: HTMLElement, opts: Record<string, unknown>) => string;
	reset: (id?: string) => void;
}

const getTurnstile = (): Turnstile | undefined =>
	(window as unknown as { turnstile?: Turnstile }).turnstile;

export interface TurnstileHandle {
	reset: () => void;
}

export function mountTurnstile(
	el: HTMLElement,
	siteKey: string,
	theme: string,
	onToken: (token: string) => void
): TurnstileHandle {
	let widgetId: string | undefined;

	const render = () => {
		widgetId = getTurnstile()?.render(el, {
			sitekey: siteKey,
			language: 'fr',
			theme,
			callback: (t: string) => onToken(t),
			'expired-callback': () => onToken(''),
			'error-callback': () => onToken('')
		});
	};

	if (getTurnstile()) render();
	else {
		const s = document.createElement('script');
		s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
		s.async = true;
		s.onload = render;
		document.head.appendChild(s);
	}

	return {
		reset() {
			onToken('');
			if (widgetId !== undefined) getTurnstile()?.reset(widgetId);
		}
	};
}
