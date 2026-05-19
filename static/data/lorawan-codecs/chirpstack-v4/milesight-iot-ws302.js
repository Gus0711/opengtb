// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Milesight IoT Co., Ltd
// Device       : WS302 - Sound Level Sensor
// fPort(s)     : non spécifié dans le profil
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/milesight-iot/ws302.js
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
 * Copyright 2023 Milesight IoT
 *
 * @product WS302
 */
function Decoder(bytes, port) {
    return milesight(bytes);
}

function milesight(bytes) {
    var decoded = {};

    for (var i = 0; i < bytes.length; ) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];

        // BATTERY
        if (channel_id === 0x01 && channel_type === 0x75) {
            decoded.battery = bytes[i];
            i += 1;
        }
        // SOUND
        else if (channel_id === 0x05 && channel_type === 0x5b) {
            decoded.freq_weight = readFrequecyWeightType(bytes[i]);
            decoded.time_weight = readTimeWeightType(bytes[i]);
            decoded.la = readUInt16LE(bytes.slice(i + 1, i + 3)) / 10;
            decoded.laeq = readUInt16LE(bytes.slice(i + 3, i + 5)) / 10;
            decoded.lamax = readUInt16LE(bytes.slice(i + 5, i + 7)) / 10;
            i += 7;
        }
        // LoRaWAN Class Type
        else if (channel_id === 0xff && channel_type === 0x0f) {
            switch (bytes[i]) {
                case 0:
                    decoded.class_type = "class-a";
                    break;
                case 1:
                    decoded.class_type = "class-b";
                    break;
                case 2:
                    decoded.class_type = "class-c";
                    break;
            }
            i += 1;
        } else {
            break;
        }
    }

    return decoded;
}

function readFrequecyWeightType(bytes) {
    var type = "";

    var bits = bytes & 0x03;
    switch (bits) {
        case 0:
            type = "Z";
            break;
        case 1:
            type = "A";
            break;
        case 2:
            type = "C";
            break;
    }

    return type;
}

function readTimeWeightType(bytes) {
    var type = "";

    var bits = (bytes[0] >> 2) & 0x03;
    switch (bits) {
        case 0:
            type = "impulse";
            break;
        case 1:
            type = "fast";
            break;
        case 2:
            type = "slow";
            break;
    }

    return type;
}

function readUInt16LE(bytes) {
    var value = (bytes[1] << 8) + bytes[0];
    return value & 0xffff;
}

function readInt16LE(bytes) {
    var ref = readUInt16LE(bytes);
    return ref > 0x7fff ? ref - 0x10000 : ref;
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
