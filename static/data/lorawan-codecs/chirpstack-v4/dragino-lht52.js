// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Dragino Technology Co., Limited
// Device       : LHT52 - Temperature & Humidity Sensor
// fPort(s)     : 2, 5, 42
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/dragino/lht52.js
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
function str_pad(byte) {
  var zero = '0';
  var hex = byte.toString(16);
  var tmp = 2 - hex.length;
  return zero.substr(0, tmp) + hex;
}

function decodeUplink(input) {
  var port = input.fPort;
  var bytes = input.bytes;
  var data = {};
  switch (input.fPort) {
    case 2:
      {
        if (bytes.length == 11) {
          data.TempC_SHT = parseFloat(((((bytes[0] << 24) >> 16) | bytes[1]) / 100).toFixed(2));
          data.Hum_SHT = parseFloat(((((bytes[2] << 24) >> 16) | bytes[3]) / 10).toFixed(1));
          data.TempC_DS = parseFloat(((((bytes[4] << 24) >> 16) | bytes[5]) / 100).toFixed(2));

          data.Ext = bytes[6];
          data.Systimestamp = (bytes[7] << 24) | (bytes[8] << 16) | (bytes[9] << 8) | bytes[10];
        } else {
          data.Status = 'RPL data or sensor reset';
        }
      }
      return {
        data: data,
      };
      break;

    case 3:
      {
        data.Status = 'Data retrieved, your need to parse it by the application server';
      }
      return {
        data: data,
      };
      break;

    case 4:
      {
        data.DS18B20_ID = str_pad(bytes[0]) + str_pad(bytes[1]) + str_pad(bytes[2]) + str_pad(bytes[3]) + str_pad(bytes[4]) + str_pad(bytes[5]) + str_pad(bytes[6]) + str_pad(bytes[7]);
      }
      return {
        data: data,
      };
      break;

    case 5:
      {
        data.Sensor_Model = bytes[0];
        data.Firmware_Version = str_pad((bytes[1] << 8) | bytes[2]);
        data.Freq_Band = bytes[3];
        data.Sub_Band = bytes[4];
        data.Bat_mV = (bytes[5] << 8) | bytes[6];
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
    data.push({
      air: {
        location: 'outdoor',
        temperature: input.data.TempC_DS,
      },
    });
  }

  if (input.data.Bat_mV) {
    data.push({
      battery: input.data.Bat_mV,
    });
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
