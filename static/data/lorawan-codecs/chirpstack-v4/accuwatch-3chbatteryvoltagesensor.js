// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Accuwatch
// Device       : LoraWan 3ch Voltage Sensor
// fPort(s)     : non spécifié dans le profil
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/accuwatch/3chbatteryvoltagesensor.js
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
  // Helper function to convert bytes to float
  function bytesToFloat(bytes) {
    var bits = (bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0];
    var sign = (bits & 0x80000000) ? -1 : 1;
    var exponent = ((bits >> 23) & 0xFF) - 127;
    var significand = (bits & ~(-1 << 23));

    if (exponent === 128)
        return sign * ((significand) ? NaN : Infinity);

    if (exponent === -127) {
        if (significand === 0) return sign * 0.0;
        exponent = -126;
        significand /= (1 << 22);
    } else significand = (significand | (1 << 23)) / (1 << 23);

    return sign * significand * Math.pow(2, exponent);
  }

  // Decode each float from the 12-byte payload
  var sensor1Voltage = bytesToFloat(input.bytes.slice(0, 4));
  var sensor2Voltage = bytesToFloat(input.bytes.slice(4, 8));
  var sensor3Voltage = bytesToFloat(input.bytes.slice(8, 12));

  // Round the float values to 2 decimal places
  sensor1Voltage = Math.round(sensor1Voltage * 100) / 100;
  sensor2Voltage = Math.round(sensor2Voltage * 100) / 100;
  sensor3Voltage = Math.round(sensor3Voltage * 100) / 100;

  // Return decoded values
  return {
    data: {
      sensor1Voltage: sensor1Voltage.toFixed(2),
      sensor2Voltage: sensor2Voltage.toFixed(2),
      sensor3Voltage: sensor3Voltage.toFixed(2)
    },
    warnings: [],
    errors: []
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

