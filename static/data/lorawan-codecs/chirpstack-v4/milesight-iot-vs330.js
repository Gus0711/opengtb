// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Milesight IoT Co., Ltd
// Device       : LoRaWAN Bathroom Occupancy Sensor
// fPort(s)     : 85
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/milesight-iot/vs330.js
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/milesight-iot/vs330-encoder.js
// Adapté par   : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. ChirpStack → Device Profiles → <votre profil>
//   2. Onglet « Codec » → « JavaScript functions »
//   3. Coller ce fichier intégralement dans « Codec functions »
//
// Note : le codec TTN d'origine est conservé intact dans un IIFE ;
// decodeUplink et encodeDownlink sont ré-exposés au top-level et
// normalisés au format TR013 attendu par v4.
// ─────────────────────────────────────────────────────────────────────

var __opengtb_ttn_decode;
var __opengtb_ttn_encode;
(function () {
	// ─── Source TTN v3 (intact) ─────────────────────────────────────────
// Codec OpenGTB — combinaison decoder + encoder (fichiers TTN distincts).
// Chaque source TTN est encapsulé dans son propre IIFE pour éviter les
// collisions quand chaque fichier déclare sa propre `decodeUplink`.
var __ogtb_decode_uplink;
var __ogtb_encode_downlink;

// ─── Source decoder (TTN uplinkDecoder) ────────────────────────────
(function () {
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
 * @product VS330
 */
function Decoder(bytes, port) {
    return milesight(bytes);
}

function milesight(bytes) {
    var decoded = {};

    for (i = 0; i < bytes.length; ) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];

        // BATTERY
        if (channel_id === 0x01 && channel_type === 0x75) {
            decoded.battery = bytes[i];
            i += 1;
        }
        // DISTANCE
        else if (channel_id === 0x02 && channel_type === 0x82) {
            decoded.distance = readUInt16LE(bytes.slice(i, i + 2));
            i += 2;
        }
        // OCCUPANCY
        else if (channel_id === 0x03 && channel_type === 0x8e) {
            decoded.occupancy = bytes[i] === 0 ? "vacant" : "occupied";
            i += 1;
        }
        // CALIBRATION
        else if (channel_id === 0x04 && channel_type === 0x8e) {
            decoded.calibration = bytes[i] === 0 ? "failed" : "success";
            i += 1;
        } else {
            break;
        }
    }

    return decoded;
}

// bytes to number
function readUInt16LE(bytes) {
    var value = (bytes[1] << 8) + bytes[0];
    return value & 0xffff;
}

	if (typeof decodeUplink === 'function') {
		__ogtb_decode_uplink = decodeUplink;
	} else if (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function') {
		__ogtb_decode_uplink = codec.decodeUplink;
	}
})();

// ─── Source encoder (TTN downlinkEncoder : vs330-encoder.js) ─────────
(function () {
/**
 * Payload Encoder
 *
 * Copyright 2025 Milesight IoT
 *
 * @product VS330
 */
var RAW_VALUE = 0x00;

/* eslint no-redeclare: "off" */
/* eslint-disable */
// Chirpstack v4
function encodeDownlink(input) {
    var encoded = milesightDeviceEncode(input.data);
    return { bytes: encoded };
}

// Chirpstack v3
function Encode(fPort, obj) {
    return milesightDeviceEncode(obj);
}

// The Things Network
function Encoder(obj, port) {
    return milesightDeviceEncode(obj);
}
/* eslint-enable */

function milesightDeviceEncode(payload) {
    var encoded = [];

    if ("reboot" in payload) {
        encoded = encoded.concat(reboot(payload.reboot));
    }
    if ("collection_interval" in payload) {
        encoded = encoded.concat(setCollectionInterval(payload.collection_interval));
    }
    if ("report_interval" in payload) {
        encoded = encoded.concat(setReportInterval(payload.report_interval));
    }
    if ("human_exist_height" in payload) {
        encoded = encoded.concat(setHumanExistHeight(payload.human_exist_height));
    }
    if ("test_enable" in payload) {
        encoded = encoded.concat(setTestEnable(payload.test_enable));
    }
    if ("test_duration" in payload) {
        encoded = encoded.concat(setTestDuration(payload.test_duration));
    }
    if ("back_test_config" in payload) {
        encoded = encoded.concat(setBackTestMode(payload.back_test_config));
    }

    return encoded;
}

/**
 * reboot
 * @param {number} reboot values: (0: no, 1: yes)
 * @example { "reboot": 1 }
 */
function reboot(reboot) {
    var yes_no_map = { 0: "no", 1: "yes" };
    var reboot_values = getValues(yes_no_map);
    if (reboot_values.indexOf(reboot) === -1) {
        throw new Error("reboot must be one of " + reboot_values.join(", "));
    }

    if (getValue(yes_no_map, reboot) === 0) {
        return [];
    }
    return [0xff, 0x10, 0xff];
}

/**
 * set collection interval
 * @param {number} collection_interval unit: second, range: [1, 10]
 * @example { "collection_interval": 5 }
 */
function setCollectionInterval(collection_interval) {
    if (typeof collection_interval !== "number") {
        throw new Error("collection_interval must be a number");
    }
    if (collection_interval < 1 || collection_interval > 10) {
        throw new Error("collection_interval must be in range [1, 10]");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x02);
    buffer.writeUInt16LE(collection_interval);
    return buffer.toBytes();
}

/**
 * report interval configuration
 * @param {number} report_interval uint: second, range: [60, 64800]
 * @example { "report_interval": 64800 }
 */
function setReportInterval(report_interval) {
    if (typeof report_interval !== "number") {
        throw new Error("report_interval must be a number");
    }
    if (report_interval < 60 || report_interval > 64800) {
        throw new Error("report_interval must be in the range of [60, 64800]");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x03);
    buffer.writeUInt16LE(report_interval);
    return buffer.toBytes();
}

/**
 * set human exist height
 * @param {number} human_exist_height unit: mm, range: [1, 300]
 * @example { "human_exist_height": 120 }
 */
function setHumanExistHeight(human_exist_height) {
    if (typeof human_exist_height !== "number") {
        throw new Error("human_exist_height must be a number");
    }
    if (human_exist_height < 1 || human_exist_height > 300) {
        throw new Error("human_exist_height must be in range [1, 300]");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x70);
    buffer.writeUInt16LE(human_exist_height);
    return buffer.toBytes();
}

/**
 * set test enable
 * @param {number} test_enable values: (0: disable, 1: enable)
 * @example { "test_enable": 1 }
 */
function setTestEnable(test_enable) {
    var enable_map = { 0: "disable", 1: "enable" };
    var enable_values = getValues(enable_map);
    if (enable_values.indexOf(test_enable) === -1) {
        throw new Error("test_enable must be one of " + enable_values.join(", "));
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x71);
    buffer.writeUInt8(getValue(enable_map, test_enable));
    return buffer.toBytes();
}

/**
 * set test mode duration
 * @param {number} test_duration unit: min, range: [1, 30]
 * @example { "test_duration": 10 }
 */
function setTestDuration(test_duration) {
    if (typeof test_duration !== "number") {
        throw new Error("test_duration must be a number");
    }
    if (test_duration < 1 || test_duration > 30) {
        throw new Error("test_duration must be in range [1, 30]");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x72);
    buffer.writeUInt16LE(test_duration);
    return buffer.toBytes();
}

/**
 * set back test mode
 * @param {object} back_test_config
 * @param {number} back_test_config.enable values: (0: disable, 1: enable)
 * @param {number} back_test_config.distance unit: mm, range: [40, 3500]
 * @example { "back_test_config": { "enable": 0, "distance": 1000 } }
 */
function setBackTestMode(back_test_config) {
    var enable = back_test_config.enable;
    var distance = back_test_config.distance;

    var enable_map = { 0: "disable", 1: "enable" };
    var enable_values = getValues(enable_map);
    if (enable_values.indexOf(enable) === -1) {
        throw new Error("back_test_config.enable must be one of " + enable_values.join(", "));
    }
    if (distance < 40 || distance > 3500) {
        throw new Error("back_test_config.distance must be in range [40, 3500]");
    }

    var buffer = new Buffer(5);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x7a);
    buffer.writeUInt8(getValue(enable_map, enable));
    buffer.writeUInt16LE(distance);
    return buffer.toBytes();
}

function getValues(map) {
    var values = [];
    for (var key in map) {
        values.push(RAW_VALUE ? parseInt(key) : map[key]);
    }
    return values;
}

function getValue(map, value) {
    if (RAW_VALUE) return value;

    for (var key in map) {
        if (map[key] === value) {
            return parseInt(key);
        }
    }

    throw new Error("not match in " + JSON.stringify(map));
}

function Buffer(size) {
    this.buffer = new Array(size);
    this.offset = 0;

    for (var i = 0; i < size; i++) {
        this.buffer[i] = 0;
    }
}

Buffer.prototype._write = function (value, byteLength, isLittleEndian) {
    var offset = 0;
    for (var index = 0; index < byteLength; index++) {
        offset = isLittleEndian ? index << 3 : (byteLength - 1 - index) << 3;
        this.buffer[this.offset + index] = (value >> offset) & 0xff;
    }
};

Buffer.prototype.writeUInt8 = function (value) {
    this._write(value, 1, true);
    this.offset += 1;
};

Buffer.prototype.writeInt8 = function (value) {
    this._write(value < 0 ? value + 0x100 : value, 1, true);
    this.offset += 1;
};

Buffer.prototype.writeUInt16LE = function (value) {
    this._write(value, 2, true);
    this.offset += 2;
};

Buffer.prototype.writeInt16LE = function (value) {
    this._write(value < 0 ? value + 0x10000 : value, 2, true);
    this.offset += 2;
};

Buffer.prototype.toBytes = function () {
    return this.buffer;
};

	if (typeof encodeDownlink === 'function') {
		__ogtb_encode_downlink = encodeDownlink;
	} else if (typeof codec !== 'undefined' && codec && typeof codec.encodeDownlink === 'function') {
		__ogtb_encode_downlink = codec.encodeDownlink;
	}
})();

function decodeUplink(input) {
	if (typeof __ogtb_decode_uplink !== 'function') {
		return { data: {}, warnings: [], errors: ['decodeUplink TTN introuvable dans le codec source'] };
	}
	return __ogtb_decode_uplink(input);
}

function encodeDownlink(input) {
	if (typeof __ogtb_encode_downlink !== 'function') {
		return { bytes: [], fPort: input && input.fPort, warnings: [], errors: ['encodeDownlink TTN introuvable dans le codec source'] };
	}
	return __ogtb_encode_downlink(input);
}
	// ─── /Source TTN v3 ─────────────────────────────────────────────────

	__opengtb_ttn_decode = (typeof decodeUplink === 'function')
		? decodeUplink
		: (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function')
			? codec.decodeUplink
			: null;
	__opengtb_ttn_encode = (typeof encodeDownlink === 'function')
		? encodeDownlink
		: (typeof codec !== 'undefined' && codec && typeof codec.encodeDownlink === 'function')
			? codec.encodeDownlink
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

function encodeDownlink(input) {
	if (typeof __opengtb_ttn_encode !== 'function') {
		return { bytes: [], fPort: input && input.fPort, warnings: [], errors: ['encodeDownlink TTN introuvable dans le codec source'] };
	}
	var r;
	try {
		r = __opengtb_ttn_encode(input) || {};
	} catch (e) {
		return { bytes: [], fPort: input && input.fPort, warnings: [], errors: [(e && e.message) ? e.message : String(e)] };
	}
	return {
		bytes: Array.isArray(r.bytes) ? r.bytes : [],
		fPort: typeof r.fPort === 'number' ? r.fPort : (input && input.fPort),
		warnings: Array.isArray(r.warnings) ? r.warnings : [],
		errors: Array.isArray(r.errors) ? r.errors : []
	};
}

