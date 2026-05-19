// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Nwave Technologies
// Device       : Smart Parking Sensor
// fPort(s)     : 1, 2, 3
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/nwave/nps310sm.js
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
  switch (input.fPort) {
    case 1: // Parking status
      data.type = "parking_status";
      data.occupied = (input.bytes[0] & 0x1) === 0x1;
      break;

    case 2: // Heartbeat
      data.type = "heartbeat";
      data.occupied = (input.bytes[0] & 0x1) === 0x1;
      break;

    case 3: // Startup
      data.type = "startup";
      data.firmware_version = input.bytes[0] + "." + input.bytes[1] + "." + input.bytes[2];
      data.reset_cause = [
        undefined,
        "watchdog",
        "power_on",
        "user_request",
        "brownout",
        "other",
      ][input.bytes[3]];
      data.occupied = (input.bytes[4] & 0x1) === 0x1;
      break;

    case 6: // Debug
      data.type = "debug";
      data.bytes = input.bytes
      break;
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
