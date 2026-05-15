import Radio from '@lucide/svelte/icons/radio';
import Table2 from '@lucide/svelte/icons/table-2';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
import FileSearch from '@lucide/svelte/icons/file-search';
import ShieldCheck from '@lucide/svelte/icons/shield-check';
import Thermometer from '@lucide/svelte/icons/thermometer';
import Shapes from '@lucide/svelte/icons/shapes';
import ChartLine from '@lucide/svelte/icons/chart-line';
import Gauge from '@lucide/svelte/icons/gauge';
import WavesHorizontal from '@lucide/svelte/icons/waves-horizontal';
import Wind from '@lucide/svelte/icons/wind';
import Funnel from '@lucide/svelte/icons/funnel';
import Activity from '@lucide/svelte/icons/activity';

import type { Sector, SectorSlug, Tool } from './types';

export const SECTORS: Sector[] = [
	{ slug: 'briques-techniques', number: '01', name: 'Briques techniques' },
	{ slug: 'reglementaire', number: '02', name: 'Réglementaire' },
	{ slug: 'dimensionnement', number: '03', name: 'Dimensionnement' },
	{ slug: 'referentiels', number: '04', name: 'Référentiels' },
	{ slug: 'commissioning', number: '05', name: 'Commissioning' }
];

export const TOOLS: Tool[] = [
	{
		slug: 'decode',
		name: 'decode',
		title: 'Décodeur de payloads IoT',
		description: 'Décodeur payloads IoT / LoRaWAN — BACnet, Modbus, Cayenne LPP.',
		sector: 'briques-techniques',
		icon: Radio,
		tags: ['hex', 'base64', 'lorawan']
	},
	{
		slug: 'modbus',
		name: 'modbus',
		title: 'Tables Modbus',
		description: 'Tables Modbus — registres, types, échelles, CRC-16.',
		sector: 'briques-techniques',
		icon: Table2,
		tags: ['rtu', 'tcp', 'csv']
	},
	{
		slug: 'conv',
		name: 'conv',
		title: "Convertisseur d'unités CVC",
		description: "Convertisseur d'unités CVC — énergie, pression, débit, T°, puissance.",
		sector: 'briques-techniques',
		icon: ArrowRightLeft,
		tags: ['énergie', 'pression', 'débit', 't°', 'puissance']
	},
	{
		slug: 'pcap',
		name: 'pcap',
		title: 'Analyseur PCAP BACnet / Modbus',
		description: 'Analyseur PCAP BACnet / Modbus — upload, services, stats trafic.',
		sector: 'briques-techniques',
		icon: FileSearch,
		tags: ['bacnet/ip', 'modbus tcp']
	},
	{
		slug: 'bacs',
		name: 'bacs',
		title: 'ConformBACS',
		description: 'Auto-évaluation BACS — décret tertiaire, classes EN 15232.',
		sector: 'reglementaire',
		icon: ShieldCheck,
		tags: ['décret 2020-887', 'iso 52120'],
		external: 'https://www.conformbacs.fr'
	},
	{
		slug: 'dju',
		name: 'dju',
		title: 'Degrés-jours unifiés',
		description: 'DJU par département — base 18 °C, Météo-France, normales 1991–2020.',
		sector: 'reglementaire',
		icon: Thermometer,
		tags: ['météo france', 'base 18°c']
	},
	{
		slug: 'v3v',
		name: 'v3v',
		title: 'Dimensionnement vanne 3 voies',
		description: 'Dimensionnement V3V — Cv, autorité, ΔP réseau.',
		sector: 'dimensionnement',
		icon: Gauge,
		tags: ['kvs', 'autorité', 'δp']
	},
	{
		slug: 'loi-eau',
		name: 'loi-eau',
		title: "Loi d'eau",
		description: "Loi d'eau / courbe de chauffe — pente, parallèle, pivot.",
		sector: 'dimensionnement',
		icon: WavesHorizontal,
		tags: ['radiateur', 'pcbt', 'vcv']
	},
	{
		slug: 'air-hyg',
		name: 'air-hyg',
		title: "Débit d'air hygiénique",
		description: "Calcul débit d'air hygiénique — code du travail & ERP.",
		sector: 'dimensionnement',
		icon: Wind,
		tags: ['rt2012', 're2020', 'erp']
	},
	{
		slug: 'pdc',
		name: 'pdc',
		title: 'Pertes de charge',
		description: 'Pertes de charge réseau hydraulique — Darcy, singularités.',
		sector: 'dimensionnement',
		icon: Funnel,
		tags: ['darcy', 'singularités']
	},
	{
		slug: 'compteur-th',
		name: 'compteur-th',
		title: 'Dimensionnement compteurs énergie',
		description: "Compteurs d'énergie thermique — EN 1434, qp/qi/qs.",
		sector: 'dimensionnement',
		icon: Activity,
		tags: ['en 1434', 'qp/qi/qs']
	},
	{
		slug: 'svg',
		name: 'svg',
		title: 'Bibliothèque SVG',
		description: 'Bibliothèque SVG ouverte pour synoptiques — CTA, vannes, pompes, capteurs.',
		sector: 'referentiels',
		icon: Shapes,
		tags: ['supervision', 'animé', 'open']
	},
	{
		slug: 'trends',
		name: 'trends',
		title: "Validateur d'export Trends",
		description: "Validateur d'export Trends — Niagara, complétude, horodatage.",
		sector: 'commissioning',
		icon: ChartLine,
		tags: ['csv', 'niagara', 'horodaté']
	}
];

export const toolsBySector = (sector: SectorSlug): Tool[] =>
	TOOLS.filter((t) => t.sector === sector);

export const getTool = (slug: string): Tool | undefined => TOOLS.find((t) => t.slug === slug);

export const internalTools = (): Tool[] => TOOLS.filter((t) => !t.external);
