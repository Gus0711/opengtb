import { describe, expect, test } from 'vitest';
import { extractDownlinkSchema } from './schema-extractor.ts';

describe('extractDownlinkSchema — Milesight if-in-payload pattern', () => {
	const sample = `
		function milesightDeviceEncode(payload) {
			var encoded = [];
			if ("report_interval" in payload) {
				encoded = encoded.concat(setReportInterval(payload.report_interval));
			}
			if ("rejoin" in payload) {
				encoded = encoded.concat(rejoin(payload.rejoin));
			}
			if ("gpio_output_control" in payload) {
				encoded = encoded.concat(controlOutput(payload.gpio_output_control));
			}
			return encoded;
		}
		function setReportInterval(report_interval) {
			if (typeof report_interval !== "number") throw new Error("report_interval must be a number");
			if (report_interval < 0) throw new Error("report_interval must be greater than 0");
			return [0xff, 0x03, report_interval];
		}
		function rejoin(rejoin) {
			var yes_no_map = { 0: "no", 1: "yes" };
			if (rejoin !== "no" && rejoin !== "yes") throw new Error("rejoin must be one of no, yes");
			return [0xff, 0x04];
		}
		function controlOutput(ctrl) {
			var duration = ctrl.duration;
			var status = ctrl.status;
			var on_off_map = { 0: "off", 1: "on" };
			return [0xff, 0x92, duration, status];
		}
	`;

	const schema = extractDownlinkSchema(sample);

	test('detects all three top-level fields', () => {
		expect(schema?.source).toBe('milesight-if-in-payload');
		expect(schema?.fields.map((f) => f.name).sort()).toEqual([
			'gpio_output_control',
			'rejoin',
			'report_interval'
		]);
	});

	test('infers number type + range from setter body', () => {
		const f = schema!.fields.find((x) => x.name === 'report_interval')!;
		expect(f.type).toBe('number');
		expect(f.min).toBe(0);
	});

	test('infers enum from yes_no_map', () => {
		const f = schema!.fields.find((x) => x.name === 'rejoin')!;
		expect(f.type).toBe('string');
		expect(f.enum).toEqual(['no', 'yes']);
	});

	test('detects object type + nested fields via destructure', () => {
		const f = schema!.fields.find((x) => x.name === 'gpio_output_control')!;
		expect(f.type).toBe('object');
		expect(f.fields?.map((x) => x.name).sort()).toEqual(['duration', 'status']);
		// duration heuristique → number
		const dur = f.fields!.find((x) => x.name === 'duration')!;
		expect(dur.type).toBe('number');
		// status heuristique avec on_off_map détecté → string enum off/on
		const status = f.fields!.find((x) => x.name === 'status')!;
		expect(status.type).toBe('string');
		expect(status.enum).toEqual(['off', 'on']);
	});
});

describe('extractDownlinkSchema — switch-on-cmd pattern', () => {
	const sample = `
		function encodeDownlink(input) {
			cmd = input.data.cmd;
			switch (String(cmd)) {
				case "reset":
					return { fPort: 1, bytes: [0x01, 0x01] };
				case "set valve on":
					return { fPort: 1, bytes: [0x07, 0xff] };
				case "set valve off":
					return { fPort: 1, bytes: [0x07, 0x00] };
				case "get sensor":
					return { fPort: 1, bytes: [0x06, input.data.sensor] };
			}
		}
	`;

	const schema = extractDownlinkSchema(sample);

	test('detects switch-on-cmd pattern', () => {
		expect(schema?.source).toBe('switch-on-cmd');
	});

	test('exposes cmd as enum of all cases', () => {
		const cmdField = schema!.fields.find((f) => f.name === 'cmd')!;
		expect(cmdField.type).toBe('string');
		expect(cmdField.enum?.sort()).toEqual(
			['get sensor', 'reset', 'set valve off', 'set valve on'].sort()
		);
	});

	test('also exposes other accessed data fields', () => {
		const sensorField = schema!.fields.find((f) => f.name === 'sensor');
		expect(sensorField).toBeDefined();
		expect(sensorField?.type).toBe('number');
	});
});

describe('extractDownlinkSchema — fallbacks', () => {
	test('returns null when no recognized pattern', () => {
		const src = `
			function encodeDownlink(input) {
				return { bytes: [0x01, 0x02, 0x03] };
			}
		`;
		expect(extractDownlinkSchema(src)).toBeNull();
	});

	test('returns null on completely opaque source', () => {
		expect(extractDownlinkSchema('var x = 1 + 1;')).toBeNull();
	});
});
