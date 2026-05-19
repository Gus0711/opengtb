// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Develiot
// Device       : Remote Water Meter Reader
// fPort(s)     : 5, 12
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/develiot/rwmr.js
// Adapté par   : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. ChirpStack → Device Profiles → <votre profil>
//   2. Onglet « Codec » → « JavaScript functions »
//   3. Coller ce fichier intégralement dans « Codec functions »
//
// Note : le codec TTN d'origine est conservé intact dans un IIFE ;
// decodeUplink est ré-exposé au top-level et
// normalisé au format TR013 attendu par v4.
// ─────────────────────────────────────────────────────────────────────

var __opengtb_ttn_decode;
(function () {
	// ─── Source TTN v3 (intact) ─────────────────────────────────────────
function decodeUplink(input) {
    var decoded = {};
    var port = input.fPort;
    if (port === 12)
        decoded = { data: decodePort12Bytes(input.bytes) };
    else {
        decoded = {
            errors: ["Unknown port"]
        };
    }
    return decoded;
}

// 15 | 00 00 00 00 | 00 00 00 00 | FF | BF   //V8
function decodePort12Bytes(bytes) {
    var decodedPayload = decodeV8Payloads(bytes);
    return decodedPayload;
}


function decodeV8Payloads(bytes) {
    var firmwareVersion = bytes[0] >> 4;
    var activatedServices = checkActiveServices((bytes[0] & 0x0F));
    var pulseCntr1 = convertByteArrayToInt(arraySplice(bytes, 1, 4));
    var pulseCntr2 = convertByteArrayToInt(arraySplice(bytes, 1, 4));
    // var batteryStatus = convertByteArrayToInt(bytes.splice(1, 1)) / 1000;
    var batteryStatus = parseFloat(_map(convertByteArrayToInt(arraySplice(bytes, 1, 1)), 0, 255, 0, 3.3).toFixed(2));
    var temperature = parseFloat(_map(convertByteArrayToInt(arraySplice(bytes, 1, 1)), 0, 255, -30, 60).toFixed(2));

    var decoded = {
        type: "status",
        hardwareVersion: 8,
        firmwareVersion: firmwareVersion,
        pulseCounter1: pulseCntr1,
        pulseCounter2: pulseCntr2,
        batteryLevel: batteryStatus,
        temperature: temperature,
    };
    if (activatedServices) {
        decoded.activatedServices = activatedServices;
    }
    return decoded;
}



function convertByteArrayToInt(bytes) {
    function toHexString(byteArray) {
        return Array.prototype.map.call(byteArray, function (byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }).join('');
    }
    var hex = toHexString(bytes.reverse());
    return parseInt(hex, 16);
}

function _map(x, x1, x2, y1, y2) {
    return ((x - x1) * (y2 - y1) / (x2 - x1) + y1);
}

function checkActiveServices(hex) {
    function _checkState(value, pos) {
        return ((value >> pos) & 1);
    }
    var ENABLED_SERVICES = [];
    var SERVICES = [
        "LORASENSE_REPORT_SERVICE_PULSE_COUNTER1",
        "LORASENSE_REPORT_SERVICE_PULSE_COUNTER2",
        "LORASENSE_REPORT_SERVICE_TEMPERATURE",
    ];

    for (var i = 0; i < 3; i++) {
        if (_checkState(hex, i)) {
            ENABLED_SERVICES.push(SERVICES[i]);
        }
    }
    return ENABLED_SERVICES;
}

function arraySplice(array, start, deleteCount) {
    var result = [];
    var removed = [];
    var argsLen = arguments.length;
    var arrLen = array.length;
    var i, k;
  
    // Follow spec more or less
    start = parseInt(start, 10);
    deleteCount = parseInt(deleteCount, 10);
  
    // Deal with negative start per spec
    // Don't assume support for Math.min/max
    if (start < 0) {
      start = arrLen + start;
      start = (start > 0)? start : 0;
    } else {
      start = (start < arrLen)? start : arrLen;
    }
  
    // Deal with deleteCount per spec
    if (deleteCount < 0) deleteCount = 0;
  
    if (deleteCount > (arrLen - start)) {
      deleteCount = arrLen - start;
    }
  
    // Copy members up to start
    for (i = 0; i < start; i++) {
      result[i] = array[i];
    }
  
    // Add new elements supplied as args
    for (i = 3; i < argsLen; i++) {
      result.push(arguments[i]);
    }
  
    // Copy removed items to removed array
    for (i = start; i < start + deleteCount; i++) {
      removed.push(array[i]);
    }
  
    // Add those after start + deleteCount
    for (i = start + (deleteCount || 0); i < arrLen; i++) {
      result.push(array[i]);
    }
  
    // Update original array
    array.length = 0;
    i = result.length;
    while (i--) {
      array[i] = result[i];
    }
  
    // Return array of removed elements
    return removed;
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

