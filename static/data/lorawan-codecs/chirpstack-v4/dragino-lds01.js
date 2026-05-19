// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Dragino Technology Co., Limited
// Device       : LDS01 - Door Sensor
// fPort(s)     : 10, 42
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/dragino/lds01.js
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
  var value = ((bytes[0] << 8) | bytes[1]) & 0x3fff;
  var bat = value / 1000; //Battery,units:V

  var door_open_status = bytes[0] & 0x80 ? 1 : 0; //1:open,0:close
  var water_leak_status = bytes[0] & 0x40 ? 1 : 0;

  var mod = bytes[2];
  var alarm = bytes[9] & 0x01;
  var data = {};
  switch (input.fPort) {
    case 10:
      if (mod == 1) {
        var open_times = (bytes[3] << 16) | (bytes[4] << 8) | bytes[5];
        var open_duration = (bytes[6] << 16) | (bytes[7] << 8) | bytes[8]; //units:min
        (data.BAT_V = bat), (data.MOD = mod), (data.DOOR_OPEN_STATUS = door_open_status), (data.DOOR_OPEN_TIMES = open_times), (data.LAST_DOOR_OPEN_DURATION = open_duration), (data.ALARM = alarm);
      } else if (mod == 2) {
        var leak_times = (bytes[3] << 16) | (bytes[4] << 8) | bytes[5];
        var leak_duration = (bytes[6] << 16) | (bytes[7] << 8) | bytes[8]; //units:min
        (data.BAT_V = bat), (data.MOD = mod), (data.WATER_LEAK_STATUS = water_leak_status), (data.WATER_LEAK_TIMES = leak_times), (data.LAST_WATER_LEAK_DURATION = leak_duration);
      } else if (mod == 3) {
        (data.BAT_V = bat), (data.MOD = mod), (data.DOOR_OPEN_STATUS = door_open_status), (data.WATER_LEAK_STATUS = water_leak_status), (data.ALARM = alarm);
      } else {
        (data.BAT_V = bat), (data.MOD = mod);
      }
      return {
        data: data,
      };
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

