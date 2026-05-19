// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Milesight IoT Co., Ltd
// Device       : Milesight UC300 Series IoT Controller
// fPort(s)     : 85
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/milesight-iot/uc300.js
// Adapté par   : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. ChirpStack → Device Profiles → <votre profil>
//   2. Onglet « Codec » → « JavaScript functions »
//   3. Coller ce fichier intégralement dans « Codec functions »
//
// Note : le codec TTN d'origine est conservé intact dans un IIFE ;
// la fonction decodeUplink exposée à ChirpStack le réinvoque et normalise
// la sortie au format { data, warnings, errors } attendu par v4 (TR013).
// ─────────────────────────────────────────────────────────────────────

var __opengtb_ttn_decode;
(function () {
	// ─── Source TTN v3 (intact) ─────────────────────────────────────────
function decodeUplink(input) {
    var res = Decoder(input.bytes, input.fPort);
    if (res.error) {
        return {
            errors: [res.error],
        };
    }
    return {
        data: res,
    };
}
/**
 * Payload Decoder for The Things Network
 *
 * Copyright 2022 Milesight IoT
 *
 * @product UC300 series
 */

function Decoder(bytes, fport) {
    var decoded = {};

    for (i = 0; i < bytes.length;) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];

        // Digital Input
        if (channel_id === 0x03 && channel_type === 0x00) {
            decoded.digital_input_1 = bytes[i] === 0 ? "off" : "on";
            i += 1;
        }
        else if (channel_id === 0x04 && channel_type === 0x00) {
            decoded.digital_input_2 = bytes[i] === 0 ? "off" : "on";
            i += 1;
        }
        else if (channel_id === 0x05 && channel_type === 0x00) {
            decoded.digital_input_3 = bytes[i] === 0 ? "off" : "on";
            i += 1;
        }
        else if (channel_id === 0x06 && channel_type === 0x00) {
            decoded.digital_input_4 = bytes[i] === 0 ? "off" : "on";
            i += 1;
        }
        // Digital Output
        else if (channel_id === 0x07 && channel_type === 0x01) {
            decoded.digital_output_1 = bytes[i] === 0 ? "off" : "on";
            i += 1;
        }
        else if (channel_id === 0x08 && channel_type === 0x01) {
            decoded.digital_output_2 = bytes[i] === 0 ? "off" : "on";
            i += 1;
        }
        // Digital Input as Counter
        else if (channel_id === 0x03 && channel_type === 0xc8) {
            decoded.pulse_count_1 = readUInt32LE(bytes.slice(i, i + 4));
            i += 4;
        }
        else if (channel_id === 0x04 && channel_type === 0xc8) {
            decoded.pulse_count_2 = readUInt32LE(bytes.slice(i, i + 4));
            i += 4;
        }
        else if (channel_id === 0x05 && channel_type === 0xc8) {
            decoded.pulse_count_3 = readUInt32LE(bytes.slice(i, i + 4));
            i += 4;
        }
        else if (channel_id === 0x06 && channel_type === 0xc8) {
            decoded.pulse_count_4 = readUInt32LE(bytes.slice(i, i + 4));
            i += 4;
        }
        // PT100
        else if (channel_id === 0x09 && channel_type === 0x67) {
            decoded.pt100_1 = readInt16LE(bytes.slice(i, i + 2)) / 10;
            i += 2;
        }
        else if (channel_id === 0x0a && channel_type === 0x67) {
            decoded.pt100_2 = readInt16LE(bytes.slice(i, i + 2)) / 10;
            i += 2;
        }
        // ADC CHANNEL
        else if (channel_id === 0x0b && channel_type === 0x02) {
            decoded.analog_input_adc_1 = readUInt32LE(bytes.slice(i, i + 2)) / 100;
            i += 4;
            continue;
        }
        else if (channel_id === 0x0c && channel_type === 0x02) {
            decoded.analog_input_adc_2 = readUInt32LE(bytes.slice(i, i + 2)) / 100;
            i += 4;
            continue;
        }
        // ADC CHANNEL for voltage
        else if (channel_id === 0x0d && channel_type === 0x02) {
            decoded.analog_input_adv_1 = readUInt32LE(bytes.slice(i, i + 2)) / 100;
            i += 4;
            continue;
        }
        else if (channel_id === 0x0e && channel_type === 0x02) {
            decoded.analog_input_adv_2 = readUInt32LE(bytes.slice(i, i + 2)) / 100;
            i += 4;
            continue;
        }
        // MODBUS
        else if (channel_id === 0xff && channel_type === 0x19) {
            var modbus_chn_id = bytes[i++] + 1;
            var package_type = bytes[i++];
            var data_type = package_type & 7;
            var data_length = package_type >> 3;
            decoded.modbus_channels = [];
            var perchannel = {};
            switch (data_type) {
                case 0:
                    perchannel['index'] = modbus_chn_id;
                    perchannel['reading'] = bytes[i] ? "on" : "off";
                    decoded.modbus_channels.push(perchannel);
                    i += 1;
                    break;
                case 1:
                    perchannel['index'] = modbus_chn_id;
                    perchannel['reading'] = bytes[i];
                    decoded.modbus_channels.push(perchannel);
                    i += 1;
                    break;
                case 2:
                case 3:
                    perchannel['index'] = modbus_chn_id;
                    perchannel['reading'] = readUInt16LE(bytes.slice(i, i + 2));
                    decoded.modbus_channels.push(perchannel);
                    i += 2;
                    break;
                case 4:
                case 6:
                case 8:
                case 9:
                case 10:
                case 11:
                    perchannel['index'] = modbus_chn_id;
                    perchannel['reading'] = readUInt32LE(bytes.slice(i, i + 4));
                    decoded.modbus_channels.push(perchannel);
                    i += 4;
                    break;
                case 5:
                case 7:
                    perchannel['index'] = modbus_chn_id;
                    perchannel['reading'] = readFloatLE(bytes.slice(i, i + 4));
                    decoded.modbus_channels.push(perchannel);
                    i += 4;
                    break;
            }
        }
    }

    return decoded;
}

/* ******************************************
 * bytes to number
 ********************************************/
function readUInt8LE(bytes) {
    return bytes & 0xff;
}

function readInt8LE(bytes) {
    var ref = readUInt8LE(bytes);
    return ref > 0x7f ? ref - 0x100 : ref;
}

function readUInt16LE(bytes) {
    var value = (bytes[1] << 8) + bytes[0];
    return value & 0xffff;
}

function readInt16LE(bytes) {
    var ref = readUInt16LE(bytes);
    return ref > 0x7fff ? ref - 0x10000 : ref;
}

function readUInt32LE(bytes) {
    var value = (bytes[3] << 24) + (bytes[2] << 16) + (bytes[1] << 8) + bytes[0];
    return value & 0xffffffff;
}

function readInt32LE(bytes) {
    var ref = readUInt32LE(bytes);
    return ref > 0x7fffffff ? ref - 0x100000000 : ref;
}

function readFloatLE(bytes) {
    // JavaScript bitwise operators yield a 32 bits integer, not a float.
    // Assume LSB (least significant byte first).
    var bits = (bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0];
    var sign = bits >>> 31 === 0 ? 1.0 : -1.0;
    var e = (bits >>> 23) & 0xff;
    var m = e === 0 ? (bits & 0x7fffff) << 1 : (bits & 0x7fffff) | 0x800000;
    var f = sign * m * Math.pow(2, e - 150);
    return f;
}
	// ─── /Source TTN v3 ─────────────────────────────────────────────────

	__opengtb_ttn_decode = (typeof decodeUplink === 'function')
		? decodeUplink
		: (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function')
			? codec.decodeUplink
			: null;
})();

function decodeUplink(input) {
	if (typeof __opengtb_ttn_decode !== 'function') {
		return { data: {}, warnings: [], errors: ['decodeUplink TTN introuvable dans le codec source'] };
	}
	var r;
	try {
		r = __opengtb_ttn_decode(input) || {};
	} catch (e) {
		return { data: {}, warnings: [], errors: [(e && e.message) ? e.message : String(e)] };
	}
	var data = (r && r.data !== undefined) ? r.data : r;
	return {
		data: data,
		warnings: Array.isArray(r.warnings) ? r.warnings : [],
		errors: Array.isArray(r.errors) ? r.errors : []
	};
}
