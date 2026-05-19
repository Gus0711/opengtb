// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : n-fuse GmbH
// Device       : Multisensor
// fPort(s)     : non spécifié dans le profil
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/n-fuse/stx.js
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
const trigger_type = [
  {val: 0, type: 'rtc',     str: 'Scheduled time interval'},
  {val: 1, type: 'bma400',  str: 'Motion above threshold'},
  {val: 2, type: 'sfh7776', str: 'Light intensity above threshold'},
  {val: 3, type: 'sfh7776', str: 'Light intensity below threshold'},
  {val: 4, type: 'hdc2080', str: 'Temperature above threshold'},
  {val: 5, type: 'hdc2080', str: 'Temperature below threshold'},
  {val: 6, type: 'hdc2080', str: 'Humidity above threshold'},
  {val: 7, type: 'hdc2080', str: 'Humidity below threshold'},
  {val: 8, type: 'action',  str: 'Reed switch'},
]

function decodeUplink(input) {
  // assert frame port 1
  if(input.fPort != 1) return {errors: ['unknown FPort']};
  // assert protocol version 01
  if(input.bytes[0] & 0xc0 != 0x40) return {errors: ['unknown format version']};

  return {
    data: {
      bma400: {
        x_axis:           /* m/s² */ (input.bytes[2] / 128.0) * (2 * 9.80665),
        y_axis:           /* m/s² */ (input.bytes[3] / 128.0) * (2 * 9.80665),
        z_axis:           /* m/s² */ (input.bytes[4] / 128.0) * (2 * 9.80665),
        x_axis_reference: /* m/s² */ (input.bytes[5] / 128.0) * (2 * 9.80665),
        y_axis_reference: /* m/s² */ (input.bytes[6] / 128.0) * (2 * 9.80665),
        z_axis_reference: /* m/s² */ (input.bytes[7] / 128.0) * (2 * 9.80665),
      },
      hdc2080: {
        temperature: /*  °C */ (input.bytes[9] << 1 & 0x100 | input.bytes[8]) / 512 * 165 - 40,
        humidity:    /* %rH */ (input.bytes[9] & 0x7f),
      },
      sfh7776: {
        luminance:   /* lx */ input.bytes[11] << 8 & 0x3f00 | input.bytes[10],
      },
      info: {
        version: 0x01,
        battery: /* Voltage     */ (input.bytes[1] & 0x7f) / 100 + 2,
        txpower: /* rp002 index */ input.bytes[0] >> 2 & 0x0f,
        trigger: trigger_type[input.bytes[11] >> 3 & 0x18 | input.bytes[1] >> 5 & 0x40 | input.bytes[0] & 0x03],
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

