// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Dragino Technology Co., Limited
// Device       : LGT92 - GPS Location Tracker
// fPort(s)     : 2
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/dragino/lgt92.js
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
var movement = ['Disable', 'Move', 'Collide', 'User'];

function decodeUplink(input) {
  if (input.fPort != 2) {
    return {
      errors: ['unknown FPort'],
    };
  }
  var bytes = input.bytes;
  var warnings = [];
  var data = {
    latitude: ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) / 1000000,
    longitude: ((bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7]) / 1000000,
    ALARM_status: !!(bytes[8] & (1 << 6)),
    BatV: (((bytes[8] & 0x3f) << 8) | bytes[9]) / 1000,
    MD: movement[bytes[10] >> 6],
    LON: !!(bytes[10] & (1 << 5)),
    FW: 160 + (bytes[10] & 0x1f), // NB: 1.5 firmware uses an offset of 150 ...
  };

  // i.e. latitude/longitude are set to 0x0fffffff which decodes to 268.xxx
  if (data.BatV <= 2.84 && data.latitude > 268 && data.longitude > 268) {
    delete data.latitude;
    delete data.longitude;
    warnings.push('GPS turned off because of low battery');
  } else if (data.latitude == 0 && data.longitude == 0) {
    delete data.latitude;
    delete data.longitude;
    warnings.push('GPS failed to obtain location');
  }

  switch (bytes.length) {
    case 18: // GW verison 1.6
      data.hdop = bytes[15] / 100;
      data.altitude = (((bytes[16] << 24) >> 16) | bytes[17]) / 100;
    // fall-through
    case 15: // FW version 1.5
      data.Roll = (((bytes[11] << 24) >> 16) | bytes[12]) / 100;
      data.Pitch = (((bytes[13] << 24) >> 16) | bytes[14]) / 100;
      break;
  }

  if (warnings.length > 0) return { data: data, warnings: warnings };
  else return { data: data };
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

