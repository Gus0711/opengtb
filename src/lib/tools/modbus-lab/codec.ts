import type { ByteOrder, Decoded32, EncodedRegisters, NumericType, Scale } from './types';

const ORDER_INDEXES: Record<ByteOrder, [number, number, number, number]> = {
	ABCD: [0, 1, 2, 3],
	BADC: [1, 0, 3, 2],
	CDAB: [2, 3, 0, 1],
	DCBA: [3, 2, 1, 0]
};

export function parseRegister(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const parsed = /^0x[\da-f]+$/i.test(trimmed)
		? Number.parseInt(trimmed.slice(2), 16)
		: /^\d+$/.test(trimmed)
			? Number.parseInt(trimmed, 10)
			: Number.NaN;
	return Number.isInteger(parsed) && parsed >= 0 && parsed <= 0xffff ? parsed : null;
}

export function toHex16(value: number): string {
	return `0x${(value & 0xffff).toString(16).toUpperCase().padStart(4, '0')}`;
}

export function toBinary16(value: number): string {
	return (value & 0xffff).toString(2).padStart(16, '0');
}

export function activeBits(value: number): number[] {
	return Array.from({ length: 16 }, (_, bit) => bit).filter((bit) => (value & (1 << bit)) !== 0);
}

export function applyScale(value: number, scale: Scale): number {
	return value * scale.factor + scale.offset;
}

export function removeScale(value: number, scale: Scale): number {
	if (scale.factor === 0) throw new Error('Le facteur ne peut pas être nul.');
	return (value - scale.offset) / scale.factor;
}

function registerBytes(register1: number, register2: number): [number, number, number, number] {
	return [register1 >>> 8, register1 & 0xff, register2 >>> 8, register2 & 0xff];
}

function orderedBytes(register1: number, register2: number, order: ByteOrder): Uint8Array {
	const source = registerBytes(register1, register2);
	return Uint8Array.from(ORDER_INDEXES[order].map((index) => source[index]));
}

export function decode32(register1: number, register2: number, order: ByteOrder): Decoded32 {
	const bytes = orderedBytes(register1, register2, order);
	const view = new DataView(bytes.buffer);
	return {
		order,
		uint32: view.getUint32(0, false),
		int32: view.getInt32(0, false),
		float32: view.getFloat32(0, false)
	};
}

export function decode16(register: number): { uint16: number; int16: number } {
	const bytes = Uint8Array.from([register >>> 8, register & 0xff]);
	const view = new DataView(bytes.buffer);
	return { uint16: view.getUint16(0, false), int16: view.getInt16(0, false) };
}

function bytesToRegisters(bytes: Uint8Array, order: ByteOrder): [number, number] {
	const indexes = ORDER_INDEXES[order];
	const wire = new Uint8Array(4);
	indexes.forEach((sourceIndex, targetIndex) => {
		wire[sourceIndex] = bytes[targetIndex];
	});
	return [(wire[0] << 8) | wire[1], (wire[2] << 8) | wire[3]];
}

export function encodeValue(
	engineeringValue: number,
	type: NumericType,
	order: ByteOrder,
	scale: Scale
): EncodedRegisters {
	const raw = removeScale(engineeringValue, scale);

	if (type === 'uint16' || type === 'int16') {
		if (!Number.isInteger(raw)) throw new Error('La valeur brute doit être un entier.');
		const min = type === 'uint16' ? 0 : -0x8000;
		const max = type === 'uint16' ? 0xffff : 0x7fff;
		if (raw < min || raw > max) throw new Error(`Valeur hors plage ${type.toUpperCase()}.`);
		const bytes = new Uint8Array(2);
		const view = new DataView(bytes.buffer);
		if (type === 'uint16') view.setUint16(0, raw, false);
		else view.setInt16(0, raw, false);
		const register = view.getUint16(0, false);
		return { registers: [register], hex: [toHex16(register)] };
	}

	const bytes = new Uint8Array(4);
	const view = new DataView(bytes.buffer);
	if (type === 'float32') view.setFloat32(0, raw, false);
	else {
		if (!Number.isInteger(raw)) throw new Error('La valeur brute doit être un entier.');
		if (type === 'uint32') {
			if (raw < 0 || raw > 0xffffffff) throw new Error('Valeur hors plage UINT32.');
			view.setUint32(0, raw, false);
		} else {
			if (raw < -0x80000000 || raw > 0x7fffffff) throw new Error('Valeur hors plage INT32.');
			view.setInt32(0, raw, false);
		}
	}

	const registers = bytesToRegisters(bytes, order);
	return { registers, hex: [toHex16(registers[0]), toHex16(registers[1])] };
}
