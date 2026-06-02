import { error } from '@sveltejs/kit';
import manifestJson from '$lib/tools/modbus/manifest.generated.json';
import type { ModbusDevice, ModbusManifest } from '$lib/tools/modbus/types';

export const prerender = true;

const manifest = manifestJson as ModbusManifest;

/** Énumère les couples (vendor, model) pour le prerender statique. */
export function entries() {
	return manifest.devices.map((d) => ({ vendor: d.vendorSlug, model: d.modelSlug }));
}

export async function load({ params, fetch }) {
	const { vendor, model } = params;
	const res = await fetch(`/data/modbus/${vendor}/${model}.json`);
	if (!res.ok) {
		throw error(404, `Device introuvable : ${vendor}/${model}`);
	}
	const device = (await res.json()) as ModbusDevice;
	return { device };
}
