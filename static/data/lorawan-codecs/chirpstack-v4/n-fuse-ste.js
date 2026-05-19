// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : n-fuse GmbH
// Device       : Environment sensor
// fPort(s)     : non spécifié dans le profil
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/n-fuse/ste.js
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
const iaq_accuracy_type = [
  {val: 0, str: 'none'},
  {val: 1, str: 'low'},
  {val: 2, str: 'medium'},
  {val: 3, str: 'high'},
]

function decodeUplink(input) {
  // assert frame port 1
  if(input.fPort != 1) return {errors: ['unknown FPort']};
  // assert protocol version 01
  if(input.bytes[0] & 0xc0 != 0x40) return {errors: ['unknown format version']};

  const iaq_raw =
    input.bytes[10] <<  1 & 0x100 |
    input.bytes[6]  <<  0 & 0x000;
  const voc_raw =
    input.bytes[10] << 12 & 0x1000 |
    input.bytes[ 9] <<  8 & 0x0f00 |
    input.bytes[ 7] <<  0 & 0x00ff;
  const co2_raw =
    input.bytes[10] << 12 & 0x7000 |
    input.bytes[ 9] <<  8 & 0x0f00 |
    input.bytes[ 8] <<  0 & 0x00ff;

  let voc_real = 0
  const voc_mantissa = voc_raw & 0x03ff;
  const voc_exponent = voc_raw & 0x1c00;
  if(voc_exponent) {
    voc_real = voc_raw / 1024.0;
  } else {
    const floor = 8 << (3 * (voc_exponent - 1));
    const ceil  = 8 << (3 * voc_exponent);
    const range = ceil - floor;
    voc_real = voc_mantissa / 1024.0 * range + floor;
  }

  return {
    data: {
      bme680: {
        temperature: /* °C    */ (input.bytes[3] << 1 & 0x100 | input.bytes[2]) / 511 * 125 - 40,
        humidity:    /* %rH   */ input.bytes[3] & 0x7f,
        pressure:    /* hPa   */ input.bytes[5] << 8 | input.bytes[4],
        co2:         /* ppm   */ co2_raw,  // CO2-e  (CO2 equivalent)
        voc:         /* ppm   */ voc_real, // bVOC-e (breath Volatile Organic Compound Equivalent)
        iaq:         /* index */ iaq_raw,  // Indor Air Quality Index
        iaq_accuracy: iaq_accuracy_type[input.bytes[10] & 0x03],
      },
      info: {
        version: 0x01,
        battery: /* Voltage     */ (input.bytes[1] & 0x7f) / 100 + 2,
        txpower: /* rp002 index */ input.bytes[0] >> 2 & 0x0f,
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
