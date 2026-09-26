export const BYTE_ORDERS = ['ABCD', 'BADC', 'CDAB', 'DCBA'] as const;

export type ByteOrder = (typeof BYTE_ORDERS)[number];
export type NumericType = 'uint16' | 'int16' | 'uint32' | 'int32' | 'float32';

export interface Scale {
	factor: number;
	offset: number;
}

export interface Decoded32 {
	order: ByteOrder;
	uint32: number;
	int32: number;
	float32: number;
}

export interface EncodedRegisters {
	registers: [number, number?];
	hex: [string, string?];
}
