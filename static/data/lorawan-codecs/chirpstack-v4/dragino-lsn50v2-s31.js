// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Dragino Technology Co., Limited
// Device       : LSN50v2-S31 - Temperature & Humidity Sensor
// fPort(s)     : 2, 42
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/dragino/lsn50v2-s31.js
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
  var mode = (input.bytes[6] & 0x7c) >> 2;
  var data = {};
  switch (input.fPort) {
    case 2:
      if (mode != 2 && mode != 31) {
        data.BatV = ((input.bytes[0] << 8) | input.bytes[1]) / 1000;
        data.TempC1 = parseFloat(((((input.bytes[2] << 24) >> 16) | input.bytes[3]) / 10).toFixed(2));
        data.ADC_CH0V = ((input.bytes[4] << 8) | input.bytes[5]) / 1000;
        data.Digital_IStatus = input.bytes[6] & 0x02 ? 'H' : 'L';
        if (mode != 6) {
          data.EXTI_Trigger = input.bytes[6] & 0x01 ? 'TRUE' : 'FALSE';
          data.Door_status = input.bytes[6] & 0x80 ? 'CLOSE' : 'OPEN';
        }
      }
      if (mode == '0') {
        data.Work_mode = 'IIC';
        if (((input.bytes[9] << 8) | input.bytes[10]) === 0) {
          data.Illum = ((input.bytes[7] << 24) >> 16) | input.bytes[8];
        } else {
          data.TempC_SHT = parseFloat(((((input.bytes[7] << 24) >> 16) | input.bytes[8]) / 10).toFixed(2));
          data.Hum_SHT = parseFloat((((input.bytes[9] << 8) | input.bytes[10]) / 10).toFixed(1));
        }
      } else if (mode == '1') {
        data.Work_mode = ' Distance';
        data.Distance_cm = parseFloat((((input.bytes[7] << 8) | input.bytes[8]) / 10).toFixed(1));
        if (((input.bytes[9] << 8) | input.bytes[10]) != 65535) {
          data.Distance_signal_strength = parseFloat(((input.bytes[9] << 8) | input.bytes[10]).toFixed(0));
        }
      } else if (mode == '2') {
        data.Work_mode = ' 3ADC';
        data.BatV = input.bytes[11] / 10;
        data.ADC_CH0V = ((input.bytes[0] << 8) | input.bytes[1]) / 1000;
        data.ADC_CH1V = ((input.bytes[2] << 8) | input.bytes[3]) / 1000;
        data.ADC_CH4V = ((input.bytes[4] << 8) | input.bytes[5]) / 1000;
        data.Digital_IStatus = input.bytes[6] & 0x02 ? 'H' : 'L';
        data.EXTI_Trigger = input.bytes[6] & 0x01 ? 'TRUE' : 'FALSE';
        data.Door_status = input.bytes[6] & 0x80 ? 'CLOSE' : 'OPEN';
        if (((input.bytes[9] << 8) | input.bytes[10]) === 0) {
          data.Illum = ((input.bytes[7] << 24) >> 16) | input.bytes[8];
        } else {
          data.TempC_SHT = parseFloat(((((input.bytes[7] << 24) >> 16) | input.bytes[8]) / 10).toFixed(2));
          data.Hum_SHT = parseFloat((((input.bytes[9] << 8) | input.bytes[10]) / 10).toFixed(2));
        }
      } else if (mode == '3') {
        data.Work_mode = '3DS18B20';
        data.TempC2 = parseFloat(((((input.bytes[7] << 24) >> 16) | input.bytes[8]) / 10).toFixed(2));
        data.TempC3 = parseFloat(((((input.bytes[9] << 24) >> 16) | input.bytes[10]) / 10).toFixed(2));
      } else if (mode == '4') {
        data.Work_mode = 'Weight';
        data.Weight = ((input.bytes[7] << 24) >> 16) | input.bytes[8];
      } else if (mode == '5') {
        data.Work_mode = 'Count';
        data.Count = (input.bytes[7] << 24) | (input.bytes[8] << 16) | (input.bytes[9] << 8) | input.bytes[10];
      } else if (mode == '31') {
        data.Work_mode = 'ALARM';
        data.BatV = ((input.bytes[0] << 8) | input.bytes[1]) / 1000;
        data.TempC1 = parseFloat(((((input.bytes[2] << 24) >> 16) | input.bytes[3]) / 10).toFixed(2));
        data.TempC1MIN = (input.bytes[4] << 24) >> 24;
        data.TempC1MAX = (input.bytes[5] << 24) >> 24;
        data.SHTEMPMIN = (input.bytes[7] << 24) >> 24;
        data.SHTEMPMAX = (input.bytes[8] << 24) >> 24;
        data.SHTHUMMIN = input.bytes[9];
        data.SHTHUMMAX = input.bytes[10];
      }

      if (input.bytes.length == 11 || input.bytes.length == 12)
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
  var data = {};
  var air = {};
  var action = {};

  if (input.data.TempC_SHT) {
    air.temperature = input.data.TempC_SHT;
  }

  if (input.data.Hum_SHT) {
    air.relativeHumidity = input.data.Hum_SHT;
  }

  if (input.data.Door_status === 'CLOSE' || input.data.Door_status === 'OPEN') {
    action.contactState = input.data.Door_status === 'CLOSE' ? 'closed' : 'open';
  }

  if (Object.keys(air).length > 0) {
    data.air = air;
  }

  if (Object.keys(action).length > 0) {
    data.action = action;
  }

  if (input.data.BatV) {
    data.battery = input.data.BatV;
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
