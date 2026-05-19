// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : n-fuse GmbH
// Device       : Action button
// fPort(s)     : non spécifié dans le profil
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/n-fuse/sta.js
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
const trigger_type = [
  {val: 0, type: 'rtc',     str: 'Scheduled time interval'},
  {val: 1, type: 'action',  str: 'Single Press'},
  {val: 2, type: 'action',  str: 'Double Press'},
  {val: 3, type: 'action',  str: 'Long Press'},
]

function decodeUplink(input) {
  // assert frame port 1
  if(input.fPort != 1) return {errors: ['unknown FPort']};
  // assert protocol version 01
  if(input.bytes[0] & 0xc0 != 0x40) return {errors: ['unknown format version']};

  // Simplify trigger
  const trigger = (input.bytes[0] & 0x01) && ((input.bytes[1] >> 6 & 0x02 | input.bytes[0] >> 1 & 0x01) + 1);

  return {
    data: {
      mcu: {
        temperature: /* °C */ input.bytes[2] / 255 * 165 - 40,
      },
      info: {
        version: 0x01,
        battery: /* Voltage     */ (input.bytes[1] & 0x7f) / 100 + 2,
        txpower: /* rp002 index */ input.bytes[0] >> 2 & 0x0f,
        trigger: trigger_type[trigger],
        ...(trigger && {gesture_count: input.bytes[3]}),
      }
    }
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
