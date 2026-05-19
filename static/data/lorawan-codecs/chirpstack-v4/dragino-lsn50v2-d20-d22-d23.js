// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Dragino Technology Co., Limited
// Device       : LSN50v2-D20-D22-D23 - Temperature Sensor
// fPort(s)     : 2, 42
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/dragino/lsn50v2-d20-d22-d23.js
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
  var port = input.fPort;
  var bytes = input.bytes;
  var mode = (bytes[6] & 0x7c) >> 2;
  var data = {};
  switch (input.fPort) {
    case 2:
      if (mode == '3') {
        data.Work_mode = 'DS18B20';
        data.BatV = ((bytes[0] << 8) | bytes[1]) / 1000;
        data.ALARM_status = bytes[6] & 0x01 ? 'TRUE' : 'FALSE';

        if (bytes[2] == 0xff && bytes[3] == 0xff) {
          data.Temp_Red = 'NULL';
        } else {
          data.Temp_Red = parseFloat(((((bytes[2] << 24) >> 16) | bytes[3]) / 10).toFixed(1));
        }

        if (bytes[7] == 0xff && bytes[8] == 0xff) {
          data.Temp_White = 'NULL';
        } else {
          data.Temp_White = parseFloat(((((bytes[7] << 24) >> 16) | bytes[8]) / 10).toFixed(1));
        }

        if (bytes[9] == 0xff && bytes[10] == 0xff) {
          data.Temp_Black = 'NULL';
        } else {
          data.Temp_Black = parseFloat(((((bytes[9] << 24) >> 16) | bytes[10]) / 10).toFixed(1));
        }
      } else if (mode == '31') {
        data.Work_mode = 'ALARM';
        data.Temp_Red_MIN = (bytes[4] << 24) >> 24;
        data.Temp_Red_MAX = (bytes[5] << 24) >> 24;
        data.Temp_White_MIN = (bytes[7] << 24) >> 24;
        data.Temp_White_MAX = (bytes[8] << 24) >> 24;
        data.Temp_Black_MIN = (bytes[9] << 24) >> 24;
        data.Temp_Black_MAX = (bytes[10] << 24) >> 24;
      }

      if (bytes.length == 11)
        return {
          data: data,
        };
      break;
    default:
      return {
        errors: ['unknown FPort'],
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

