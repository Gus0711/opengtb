// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Teneo IoT
// Device       : Filling Degree Sensor
// fPort(s)     : 1
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/teneo-iot/filling-degree-sensor.js
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
  var data = {};
  data.sensorType = 'fillrate';

  if (input.bytes.length === 0) {
    data.valid = false;
    return data;
  }

  data.settingsAllowed = true;
  data.charging = false;
  data.battery = 2 + input.bytes[0] / 10;

  if (input.fPort === 1) {

    //Distance-only payload
    if (input.bytes.length === 3 || input.bytes.length === 7) {
      data.valid = true;
      data.distance = (input.bytes[1] << 8) | input.bytes[2];
      if (input.bytes.length == 7) {
        data.temperature = ((input.bytes[3] << 8) | input.bytes[4]) / 100;
        data.relativeHumidity = ((input.bytes[5] << 8) | input.bytes[6]) / 100;
      }
    }

    //Distance and status combined payload
    else if (input.bytes.length === 4 || input.bytes.length === 8) {
      data.valid = true;
      data.distance = (input.bytes[1] << 8) | input.bytes[2];
      var statusCode = input.bytes[3];
      if(statusCode != 0){
        if (statusCode === 4) {
          data.valid = true;
          data.distance = -1;
        } else  {
          data.valid = false;
          data.errorcode = statusCode;
        }
      }
      if (input.bytes.length === 8) {
        data.temperature = ((input.bytes[4] << 8) | input.bytes[5]) / 100;
        data.relativeHumidity = ((input.bytes[6] << 8) | input.bytes[7]) / 100;
      }
    } else {
      data.valid = false;
      data.errorcode = -1;
    }
  } else if (input.fPort === 2) {
    var code = input.bytes[1];
    if (code === 4) {
      data.valid = true;
      data.distance = -1;
    } else {
      data.valid = false;
      data.errorcode = input.bytes[1];
    }
  } else if (input.fPort === 3) {
    data.valid = false;
    data.charging = true;
  }

  return {
    data: data,
  };
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

