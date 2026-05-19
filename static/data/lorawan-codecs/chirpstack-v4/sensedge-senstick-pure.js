// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Sensedge
// Device       : Senstick Pure - Air Quality & Microclimate Sensor
// fPort(s)     : non spécifié dans le profil
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/sensedge/senstick-pure.js
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
  switch (input.fPort) {
    case 2:
      return {
        // Decoded data
        data: {
          Status: bytes[0],
          Temperature: sintToDec(bytes[1] << 8 | bytes[2]),
          Humidity: (bytes[3] << 8 | bytes[4]) / 100,
          AirPressure: bytes[5] + 845, 
          IAQ: bytes[6] << 8 | bytes[7],
          StaticIAQ: bytes[8] << 8 | bytes[9],
          eCO2: bytes[10] << 8 | bytes[11],
          BreathVOC: bytes[12] / 10,
          IAQAccuracy: bytes[13]
        },
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}

function sintToDec(T){
  if (T > 32767) {
    return ((T - 65536) / 100.0);
  }
  else {
    return (T / 100.0);
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
