// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : STMicroelectronics International NV
// Device       : NUCLEO-WL55JC2
// fPort(s)     : 2, 42
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/stmicroelectronics/nucleo-wl55jc.js
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
    case 2:
      data.battery_voltage = {
        displayName: 'Battery voltage',
        unit: 'V',
        value: (((input.bytes[6] * 1200) / 254) + 1800) / 1000
      };
      data.humidity = {
        displayName: 'Relative humidity',
        unit: '%',
        value: ((input.bytes[4] << 8) + input.bytes[5]) / 10
      };
      data.light = {
        displayName: 'Red led status',
        value: (input.bytes[0] & 0x01) ? 'ON':'OFF'
      };
      data.pressure = {
        displayName: 'Barometric pressure',
        unit: 'hPa',
        value: ((input.bytes[1] << 8) + input.bytes[2]) / 10
      };
      data.temperature = {
        displayName: 'Internal temperature',
        unit: '°C',
        value: input.bytes[3] & 0x80 ? input.bytes[3] - 0x100 : input.bytes[3]
      };
      return {
        data: data
      }
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}

function encodeDownlink(input) {
  return {
    bytes: [input.data.led],
    fPort: 2,
  };
}

function decodeDownlink(input) {
  switch (input.fPort) {
    case 2:
      return {
        data: {
          led: input.bytes[0],
        },
      };
    default:
      return {
        errors: ['invalid FPort'],
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
