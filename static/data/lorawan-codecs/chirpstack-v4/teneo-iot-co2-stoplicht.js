// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Teneo IoT
// Device       : CO2 stoplicht
// fPort(s)     : 1
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/teneo-iot/co2-stoplicht.js
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
  var data = {};
  var index = 0;
  data.battery = (input.bytes[index++] & 0x0f) / 10 + 2;

  if (input.fPort == 223) {
    if ((input.bytes[0] & 0xc0) == 0x80) {
      data.type = 'status';
      data.status = input.bytes[0] & ~0xc0;
    }

    return data;
  }

  if (input.fPort == 1) {
    data.co2 = ((input.bytes[2] << 24) | (input.bytes[3] << 16) | (input.bytes[4] << 8) | input.bytes[5]) / 100;

    var Tempx100 = (input.bytes[6] << 8) + input.bytes[7];

    if (Tempx100 == 32767) {
      data.temperature = 'no temp';
    } else {
      if (Tempx100 > 32767) {
        data.temperature = -(65536 - Tempx100) / 100;
      } else {
        data.temperature = Tempx100 / 100;
      }
    }

    data.relativeHumidity = ((input.bytes[8] << 8) | input.bytes[9]) / 100;
  }

  return {
    data: data,
  };
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
