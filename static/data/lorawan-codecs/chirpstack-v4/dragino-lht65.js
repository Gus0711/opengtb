// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Dragino Technology Co., Limited
// Device       : LHT65 - Temperature & Humidity Sensor
// fPort(s)     : 2, 42
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/dragino/lht65.js
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
function str_pad(byte) {
  var zero = '00';
  var hex = byte.toString(16);
  var tmp = 2 - hex.length;
  return zero.substr(0, tmp) + hex + ' ';
}

function decodeUplink(input) {
  var port = input.fPort;
  var bytes = input.bytes;
  var Ext = bytes[6] & 0x0f;
  var poll_message_status = (bytes[6] & 0x40) >> 6;
  var Connect = (bytes[6] & 0x80) >> 7;
  var data = {};
  switch (input.fPort) {
    case 2:
      if (Ext == 0x09) {
        data.TempC_DS = parseFloat(((((bytes[0] << 24) >> 16) | bytes[1]) / 100).toFixed(2));
        data.Bat_status = bytes[4] >> 6;
      } else {
        data.BatV = (((bytes[0] << 8) | bytes[1]) & 0x3fff) / 1000;
        data.Bat_status = bytes[0] >> 6;
      }

      if (Ext != 0x0f) {
        data.TempC_SHT = parseFloat(((((bytes[2] << 24) >> 16) | bytes[3]) / 100).toFixed(2));
        data.Hum_SHT = parseFloat(((((bytes[4] << 8) | bytes[5]) & 0xfff) / 10).toFixed(1));
      }
      if (Connect == '1') {
        data.No_connect = 'Sensor no connection';
      }

      if (Ext == '0') {
        data.Ext_sensor = 'No external sensor';
      } else if (Ext == '1') {
        data.Ext_sensor = 'Temperature Sensor';
        data.TempC_DS = parseFloat(((((bytes[7] << 24) >> 16) | bytes[8]) / 100).toFixed(2));
      } else if (Ext == '4') {
        data.Work_mode = 'Interrupt Sensor send';
        data.Exti_pin_level = bytes[7] ? 'High' : 'Low';
        data.Exti_status = bytes[8] ? 'True' : 'False';
      } else if (Ext == '5') {
        data.Work_mode = 'Illumination Sensor';
        data.ILL_lx = (bytes[7] << 8) | bytes[8];
      } else if (Ext == '6') {
        data.Work_mode = 'ADC Sensor';
        data.ADC_V = ((bytes[7] << 8) | bytes[8]) / 1000;
      } else if (Ext == '7') {
        data.Work_mode = 'Interrupt Sensor count';
        data.Exit_count = (bytes[7] << 8) | bytes[8];
      } else if (Ext == '8') {
        data.Work_mode = 'Interrupt Sensor count';
        data.Exit_count = (bytes[7] << 24) | (bytes[8] << 16) | (bytes[9] << 8) | bytes[10];
      } else if (Ext == '9') {
        data.Work_mode = 'DS18B20 & timestamp';
        data.Systimestamp = (bytes[7] << 24) | (bytes[8] << 16) | (bytes[9] << 8) | bytes[10];
      } else if (Ext == '15') {
        data.Work_mode = 'DS18B20ID';
        data.ID = str_pad(bytes[2]) + str_pad(bytes[3]) + str_pad(bytes[4]) + str_pad(bytes[5]) + str_pad(bytes[7]) + str_pad(bytes[8]) + str_pad(bytes[9]) + str_pad(bytes[10]);
      }

      if (poll_message_status === 0) {
        if (bytes.length == 11) {
          return {
            data: data,
          };
        }
      }
      break;
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}

function normalizeUplink(input) {
  var data = [];

  if (input.data.TempC_SHT) {
    data.push({
      air: {
        location: 'indoor',
        temperature: input.data.TempC_SHT,
        relativeHumidity: input.data.Hum_SHT,
      },
    });
  }

  if (input.data.TempC_DS) {
    var val = {
      air: {
        location: 'outdoor',
        temperature: input.data.TempC_DS,
      },
    };
    if (input.data.BatV) {
      val.battery = input.data.BatV;
    }
    data.push(val);
  }

  return { data: data };
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

