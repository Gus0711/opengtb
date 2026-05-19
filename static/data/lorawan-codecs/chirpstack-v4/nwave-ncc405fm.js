// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Nwave Technologies
// Device       : Smart Car Counter G4 FM
// fPort(s)     : 1, 2, 3
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/nwave/ncc405.js
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
  var data = {};
  switch (input.fPort) {
    case 1: // Counter update
      data.type = "counter_update";
      data.counter_value = input.bytes[0] << 8 | input.bytes[1]
      break;

    case 2: // Heartbeat
      data.type = "heartbeat";
      data.hw_health_status = input.bytes[0] & 0x7F;
      var batteryVoltageMv = 2500 + input.bytes[1] * 4;
      data.battery_voltage = batteryVoltageMv / 1000;

      var batteryMeanVoltageMv = 2500 + input.bytes[2] * 4;
      data.battery_voltage_mean_24h = batteryMeanVoltageMv / 1000;

      break;

    case 3: // Startup
      data.type = "startup";
      data.firmware_version = input.bytes[0] + "." + input.bytes[1] + "." + input.bytes[2];
      data.reset_cause = [
        "rejoining_lorawan_network",
        "watchdog",
        "power_on",
        "user_request",
        undefined,
        undefined,
        "brownout",
        "other",
      ][input.bytes[3]];
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

