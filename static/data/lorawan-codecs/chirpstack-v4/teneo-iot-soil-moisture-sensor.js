// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Teneo IoT
// Device       : Soil Moisture Sensor
// fPort(s)     : 1
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/teneo-iot/soil-moisture-sensor.js
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
function decodeUplink(input){
	var data = {};
	data.sensorType = 'moisture';

	if (input.bytes.length === 0){
		data.valid = false;
		return{
			data: data
		}
	}

	data.settingsAllowed = true;
	data.moisture = 0;
	data.charging = false;
	data.battery = 2 + (input.bytes[0] / 10);

	if (input.fPort === 1){
		if (input.bytes.length === 2){
			data.valid = true;
			data.moisture = input.bytes[1];
		}
		else if (input.bytes.length === 6){
			data.valid = true;
			data.moisture = input.bytes[1];

			var temp = input.bytes[2]<<24>>16 | input.bytes[3];
			data.temperature = temp / 100;
		} else{
			data.valid = false;
			data.errorcode = -1;
		}
	} else if (input.fPort === 3){
		data.valid = false;
		data.charging = true;
	}

	return{
		data: data
	}
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
