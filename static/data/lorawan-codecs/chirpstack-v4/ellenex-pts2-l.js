// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Ellenex
// Device       : PTS2-L - Pressure Transmitter
// fPort(s)     : 15, 42
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/ellenex/pts2-l.js
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
    case 15:
      // return error if length of Bytes is not 8
      if (input.bytes.length != 8) {
        return {
          errors: ['Invalid uplink payload: length is not 8 byte'],
        };
      }
      let pressure = readHex2bytes(input.bytes[3], input.bytes[4]);
      let batteryVoltage = input.bytes[7] * 0.1;
      return {
        // Decoded data
        data: {
          pressure: pressure,
          batteryVoltage: +batteryVoltage.toFixed(1),
        },
      };
    default:
      return {
        errors: ['Unknown FPort: please use fPort 15'],
      };
  }
}

/*
 * The readHex2bytes function is to decode a signed 16-bit integer
 * represented by 2 bytes.  
 */
function readHex2bytes(byte1, byte2) {
  let result = (byte1 << 8) | byte2;  // merge the two bytes
  // check whether input is signed as a negative number
  // by checking whether significant bit (leftmost) is 1
  let negative = byte1 & 0x80;
  // process negative value
  if (negative) {
    //result = ~(0xFFFF0000 | (result - 1)) * (-1);  // minus 1 and flip all bits
    result = result - 0x10000;
  }
  return result;
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
