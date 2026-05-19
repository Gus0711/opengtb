// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Browan Communication Incorp.
// Device       : IAQ Sensor
// fPort(s)     : 42, 103
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/browan/tbhv110.js
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
  var bytes = input.bytes;

  // Check if the payload is empty by verifying if all elements in 'bytes' are 0 or if 'bytes' is empty
  var isEmptyPayload = bytes.length === 0 || bytes.every(element => element === 0);
  if (isEmptyPayload) {
      return {}; // Return an empty object if the payload is empty
  }

  switch (input.fPort) {
    case 103:
      return {
        data: {
          status: bytes[0] & 0x01,
          tempHumidChanged: (bytes[0] >> 4) & 0x01,
          iaqChanged: (bytes[0] >> 5) & 0x01,
          battery: (25 + (bytes[1] & 0x0f)) / 10,
          temperatureBoard: (bytes[2] & 0x7f) - 32,
          humidity: bytes[3] & 0x7f,
          eco2: (bytes[5] << 8) | bytes[4],
          voc: (bytes[7] << 8) | bytes[6],
          iaq: (bytes[9] << 8) | bytes[8],
          temperature: (bytes[10] & 0x7f) - 32,
        },
      };
    default:
      return {
        errors: ["unknown FPort"],
      };
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
