// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Aqua-Scope Technologies
// Device       : Ball Valve Servo BVSLWE01
// fPort(s)     : 10, 42
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/aquascope/bvs.js
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
  var t = input.bytes[2]*0xff+input.bytes[3]
  switch (input.fPort) {
    case 10:
      return {
        // Decoded data
        data: {
          leak: (input.bytes[0] & 0x01) ? "Y":"N",
          valve: (input.bytes[0] & 0x20) ? "On":"Off",
          temperature: t
        },
      };
    case 16:
      return {
        // Decoded data
        data: {
          valve: (input.bytes[0] & 0x20) ? "On":"Off",
          temperature: t
        },
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}

function encodeDownlink(input) {
  if (input.data.valve == "On") r = 255; else r = 0;
  return {
    // LoRaWAN FPort used for the downlink message
    fPort: 10,
    // Encoded bytes
    bytes: [2,r],
  };
}

function decodeDownlink(input) {
  switch (input.fPort) {
    case 10:
      if (input.bytes[0] == 2)
        return {
          data: {
            valve: input.bytes[1]?"On":"Off",
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
