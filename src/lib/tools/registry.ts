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
import Binary from '@lucide/svelte/icons/binary';
import Workflow from '@lucide/svelte/icons/workflow';

// Icônes de secteur
import Cpu from '@lucide/svelte/icons/cpu';
import Scale from '@lucide/svelte/icons/scale';
import Ruler from '@lucide/svelte/icons/ruler';
import Library from '@lucide/svelte/icons/library';
import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';

import type { Sector, SectorSlug, Tool } from './types';

export const SECTORS: Sector[] = [
	{ slug: 'briques-techniques', number: '01', name: 'Briques techniques', icon: Cpu },
	{ slug: 'reglementaire', number: '02', name: 'Réglementaire', icon: Scale },
	{ slug: 'dimensionnement', number: '03', name: 'Dimensionnement', icon: Ruler },
	{ slug: 'referentiels', number: '04', name: 'Référentiels', icon: Library },
	{ slug: 'commissioning', number: '05', name: 'Commissioning', icon: ClipboardCheck }
];

export const TOOLS: Tool[] = [
	{
		slug: 'decode',
		name: 'decode',
		title: 'Décodeur & Encodeur Payload LoRaWAN',
		description:
			'Décoder et encoder un payload LoRaWAN — 900+ devices TTN, Cayenne LPP, hex/base64. Codec TTN v3 / ChirpStack v4 téléchargeable.',
		sector: 'briques-techniques',
		icon: Radio,
		tags: ['lorawan', 'ttn', 'chirpstack', 'encoder', 'downlink', 'hex', 'base64'],
		status: 'done'
	},
	{
		slug: 'modbus',
		name: 'modbus',
		title: 'Catalogue Modbus',
		description: 'Catalogue ouvert de devices Modbus — registres, types, échelles, RTU/TCP.',
		sector: 'briques-techniques',
		icon: Table2,
		tags: ['rtu', 'tcp', 'registres'],
		status: 'done'
	},
	{
		slug: 'modbus-lab',
		name: 'modbus-lab',
		title: 'Laboratoire de registres Modbus',
		description:
			'Décoder et encoder des registres Modbus — types numériques, ordre des octets, échelle et bits actifs.',
		sector: 'briques-techniques',
		icon: Binary,
		tags: ['float32', 'int16', 'endianness', 'bitfield'],
		status: 'done'
	},
	{
		slug: 'conv',
		name: 'conv',
		title: "Convertisseur d'unités CVC",
		description: "Convertisseur d'unités CVC — énergie, pression, débit, T°, puissance.",
		sector: 'briques-techniques',
		icon: ArrowRightLeft,
		tags: ['énergie', 'pression', 'débit', 't°', 'puissance'],
		status: 'done'
	},
	{
		slug: 'pcap',
		name: 'pcap',
		title: 'Analyseur PCAP BACnet / Modbus',
		description: 'Analyseur PCAP BACnet / Modbus — upload, services, stats trafic.',
		sector: 'briques-techniques',
		icon: FileSearch,
		tags: ['bacnet/ip', 'modbus tcp'],
		status: 'todo'
	},
	{
		slug: 'bacs',
		name: 'bacs',
		title: 'ConformBACS',
		description: 'Auto-évaluation BACS — décret tertiaire, classes EN 15232.',
		sector: 'reglementaire',
		icon: ShieldCheck,
		tags: ['décret 2020-887', 'iso 52120'],
		external: 'https://conformbacs.datagtb.com',
		status: 'done'
	},
	{
		slug: 'dju',
		name: 'dju ipmvp',
		title: 'DJU + signature énergétique IPMVP',
		description:
			"DJU par station Météo-France + calibrage de la signature énergétique d'un bâtiment (IPMVP Option C).",
		sector: 'reglementaire',
		icon: Thermometer,
		tags: ['météo france', 'ipmvp', 'm&v', 'csv'],
		status: 'done'
	},
	{
		slug: 'v3v',
		name: 'v3v',
		title: 'Dimensionnement vanne 3 voies',
		description: 'Dimensionnement V3V — Cv, autorité, ΔP réseau.',
		sector: 'dimensionnement',
		icon: Gauge,
		tags: ['kvs', 'autorité', 'δp'],
		status: 'done'
	},
	{
		slug: 'loi-eau',
		name: 'loi-eau',
		title: "Loi d'eau",
		description: "Loi d'eau / courbe de chauffe — pente, parallèle, pivot.",
		sector: 'dimensionnement',
		icon: WavesHorizontal,
		tags: ['radiateur', 'pcbt', 'vcv'],
		status: 'done'
	},
	{
		slug: 'air-hyg',
		name: 'air-hyg',
		title: "Débit d'air hygiénique",
		description: "Calcul débit d'air hygiénique — code du travail & ERP.",
		sector: 'dimensionnement',
		icon: Wind,
		tags: ['rt2012', 're2020', 'erp'],
		status: 'done'
	},
	{
		slug: 'pdc',
		name: 'pdc',
		title: 'Pertes de charge',
		description: 'Pertes de charge réseau hydraulique — Darcy, singularités.',
		sector: 'dimensionnement',
		icon: Funnel,
		tags: ['darcy', 'singularités'],
		status: 'done'
	},
	{
		slug: 'compteur-th',
		name: 'compteur-th',
		title: 'Dimensionnement compteurs énergie',
		description: "Compteurs d'énergie thermique — EN 1434, qp/qi/qs.",
		sector: 'dimensionnement',
		icon: Activity,
		tags: ['en 1434', 'qp/qi/qs'],
		status: 'todo'
	},
	{
		slug: 'svg',
		name: 'svg',
		title: 'Bibliothèque SVG',
		description: 'Bibliothèque SVG ouverte pour synoptiques — CTA, vannes, pompes, capteurs.',
		sector: 'referentiels',
		icon: Shapes,
		tags: ['supervision', 'animé', 'open'],
		status: 'done'
	},
	{
		slug: 'mapper',
		name: 'mapper',
		title: 'Architecture GTB & liste de points',
		description:
			'Relier équipements, automates et gateways — AI/DI, Modbus, BACnet, M-Bus et LoRaWAN.',
		sector: 'referentiels',
		icon: Workflow,
		tags: ['automate', 'modbus', 'bacnet', 'm-bus', 'lorawan', 'liste de points'],
		status: 'done'
	},
	{
		slug: 'trends',
		name: 'trends',
		title: "Validateur d'export Trends",
		description: "Validateur d'export Trends — Niagara, complétude, horodatage.",
		sector: 'commissioning',
		icon: ChartLine,
		tags: ['csv', 'niagara', 'horodaté'],
		status: 'todo'
	}
];

export const toolsBySector = (sector: SectorSlug): Tool[] =>
	TOOLS.filter((t) => t.sector === sector);

export const getTool = (slug: string): Tool | undefined => TOOLS.find((t) => t.slug === slug);

export const internalTools = (): Tool[] => TOOLS.filter((t) => !t.external);

export const builtTools = (): Tool[] =>
	TOOLS.filter((t) => !t.external && t.status === 'done');
