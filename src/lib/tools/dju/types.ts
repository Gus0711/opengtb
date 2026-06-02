// Types partagés avec scripts/dju/* (le script écrit, l'app lit).

export interface Station {
	id: string;
	name: string;
	dept: string;
	deptName: string;
	lat: number;
	lon: number;
	alt: number;
	typePoste: number | null;
}

export interface StationsFile {
	metadata: {
		fetchedAt: string;
		source: string;
		count: number;
	};
	stations: Station[];
}

export interface MonthlyDju {
	date: string; // YYYY-MM
	tMean: number | null;
	nbDays: number;
	djuH: number | null;
	djuC: number | null;
}

export interface YearlyDju {
	year: number;
	tMean: number | null;
	djuH: number | null;
	djuC: number | null;
	monthsCovered: number;
	complete: boolean;
}

export interface MonthlyAverage {
	month: number; // 1..12
	djuH: number | null;
	djuC: number | null;
	tMean: number | null;
}

export interface StationData extends Station {
	period: { start: string; end: string };
	baseHeating: number;
	baseCooling: number;
	updatedAt: string;
	monthly: MonthlyDju[];
	yearly: YearlyDju[];
	averages: {
		yearly: {
			djuH: number | null;
			djuC: number | null;
			tMean: number | null;
			yearsCount: number;
		};
		monthly: MonthlyAverage[];
	};
}

export interface IndexEntry {
	id: string;
	dept: string;
	updatedAt: string;
	periodEnd: string;
	yearsCount: number;
}

export interface IndexFile {
	metadata: {
		generatedAt: string;
		source: string;
		baseHeating: number;
		baseCooling: number;
		stationCount: number;
	};
	stations: IndexEntry[];
}

/** Une observation pour la régression IPMVP : un mois → (DJU, conso). */
export interface BaselinePoint {
	yearMonth: string; // YYYY-MM
	dju: number;
	conso: number;
}

export interface RegressionResult {
	a: number; // pente : kWh par DJU
	b: number; // ordonnée : conso fixe (kWh/mois)
	r2: number; // qualité d'ajustement [0..1]
	n: number; // nombre de points
}

export interface ParseConsoResult {
	points: Array<{ yearMonth: string; conso: number }>;
	errors: string[];
}
