// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : AgroSense
// Device       : Pipe Pressure
// fPort(s)     : non spécifié dans le profil
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/makerfabs/pipe-pressure.js
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
// This file contains the uplink and downlink for ttn

// Uplink
function decodeUplink(input) {
    var num = input.bytes[0] * 256 + input.bytes[1]
    var bat = input.bytes[2] / 10.0
    var Volt_Pressure = (input.bytes[3] * 256 + input.bytes[4]) / 1000.0
    var Pipe_Pressure = (Volt_Pressure-0.483)*250  //KPa---(If the pressure sensor is replaced, the user has to modify the conversion formula.)
        Pipe_Pressure = Math.round(Pipe_Pressure * 1000) / 1000;  // keep three decimal places
    var time_interval = (input.bytes[13] * 16777216 + input.bytes[14] * 65536 + input.bytes[15] * 256 + input.bytes[16]) / 1000.0//S

    return {
        data: {
            field1: bat,
            field2: Volt_Pressure,
            field3: Pipe_Pressure,
            field4: time_interval,
        },
    };
}

// .................................................................................................
// .................................................................................................
// .................................................................................................

/* 
Downlink:

The downlink has two functions: 
the first is the modification interval for Fport1; 
the second is the amount of uploaded local latest log data for Fport5;
*/

// Encoder function to be used in the TTN console for downlink payload（Fport 1）
function Encoder(input) {
    var minutes = input.minutes;

    // Converting minutes to seconds
    var seconds = minutes * 60;

    // If the number of seconds is less than 300 seconds, set it to 300 seconds
    if (seconds < 300) {
        seconds = 300;
    }

    var payload = [
        (seconds >> 24) & 0xFF,
        (seconds >> 16) & 0xFF,
        (seconds >> 8) & 0xFF,
        seconds & 0xFF
    ];

    return payload;
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
