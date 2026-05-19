// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : AgroSense
// Device       : ath20 - air-temperature-and-humidity-sensor
// fPort(s)     : 2
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/makerfabs/ath20.js
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
function decodeUplink(input) {

    // var num = input.bytes[0] * 256 + input.bytes[1]
    var bat = input.bytes[2] / 10.0
    var humi = (input.bytes[3] * 256 + input.bytes[4]) / 10.0
    // var temp = (input.bytes[5] * 256 + input.bytes[6] ) / 10.0

    var temp = input.bytes[5] * 256 + input.bytes[6]
    if (temp >= 0x8000) {
        temp -= 0x10000;
    }
    temp = temp / 10.0


    return {
        data: {
            Bat: bat,
            Humi: humi,
            Temp: temp,
        },

    };
}



// Encoder function to be used in the TTN console for downlink payload
function encodeDownlink(input) {
    var minutes = input.data.minutes;

    // Converting minutes to seconds
    var seconds = minutes * 60;

    // If the number of seconds is less than 300 seconds, set it to 300 seconds
    if (seconds < 300) {
        seconds = 300;
    }
    var bytes1 = (seconds >> 24) & 0xFF;
    var bytes2 = (seconds >> 16) & 0xFF;
    var bytes3 = (seconds >> 8) & 0xFF; 
    var bytes4 = seconds & 0xFF;

    // var payload = [
    //     (seconds >> 24) & 0xFF,
    //     (seconds >> 16) & 0xFF,
    //     (seconds >> 8) & 0xFF,
    //     seconds & 0xFF
    // ];

    return {        
        bytes: [bytes1,bytes2,bytes3,bytes4],
        fPort: 1,
    };
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

