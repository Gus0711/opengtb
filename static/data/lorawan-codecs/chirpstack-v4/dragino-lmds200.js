// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Dragino Technology Co., Limited
// Device       : LMDS200 - Microwave Radar Distance Sensor
// fPort(s)     : 2, 42
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/dragino/lmds200.js
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
  var data = {};
  switch (input.fPort) {
    case 2:
      {
        data.Bat = ((bytes[0] << 8) | bytes[1]) / 1000;
        data.dis1 = (bytes[2] << 8) | bytes[3];
        data.dis2 = (bytes[4] << 8) | bytes[5];
        data.DALARM_count = (bytes[6] >> 2) & 0x3f;
        data.Distance_alarm = (bytes[6] >> 1) & 0x01;
        data.Interrupt_alarm = bytes[6] & 0x01;
      }
      return {
        data: data,
      };
      break;

    case 4:
      {
        data.TDC = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2];
        data.ATDC = bytes[3];
        data.Alarm_min = (bytes[4] << 8) | bytes[5];
        data.Alarm_max = (bytes[6] << 8) | bytes[7];
        data.Interrupt = bytes[8];
      }
      return {
        data: data,
      };
      break;

    case 5:
      {
        if (bytes[0] == 0x0c) data.SENSOR_MODEL = 'LMDS200';

        data.Ver = parseInt(((bytes[1] << 8) | bytes[2]).toString(16), 10);

        if (bytes[3] == 0x01) data.FREQUENCY_BAND = 'EU868';
        else if (bytes[3] == 0x02) data.FREQUENCY_BAND = 'US915';
        else if (bytes[3] == 0x03) data.FREQUENCY_BAND = 'IN865';
        else if (bytes[3] == 0x04) data.FREQUENCY_BAND = 'AU915';
        else if (bytes[3] == 0x05) data.FREQUENCY_BAND = 'KZ865';
        else if (bytes[3] == 0x06) data.FREQUENCY_BAND = 'RU864';
        else if (bytes[3] == 0x07) data.FREQUENCY_BAND = 'AS923';
        else if (bytes[3] == 0x08) data.FREQUENCY_BAND = 'AS923_1';
        else if (bytes[3] == 0x09) data.FREQUENCY_BAND = 'AS923_2';
        else if (bytes[3] == 0x0a) data.FREQUENCY_BAND = 'AS923_3';
        else if (bytes[3] == 0x0b) data.FREQUENCY_BAND = 'CN470';
        else if (bytes[3] == 0x0c) data.FREQUENCY_BAND = 'EU433';
        else if (bytes[3] == 0x0d) data.FREQUENCY_BAND = 'KR920';
        else if (bytes[3] == 0x0e) data.FREQUENCY_BAND = 'MA869';

        data.Sub_band = bytes[4];
        data.BAT = ((bytes[5] << 8) | bytes[6]) / 1000;
      }
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

