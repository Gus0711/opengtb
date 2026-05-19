// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Dragino Technology Co., Limited
// Device       : WSC1-L - Weather Station Process Unit
// fPort(s)     : 2, 42
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/dragino/wsc1-l.js
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
function zxc(num) {
  if (parseInt(num) < 10) num = '0' + num;
  return num;
}

function decodeUplink(input) {
  var port = input.fPort;
  var bytes = input.bytes;
  var data = {};
  switch (input.fPort) {
    case 2:
      {
        if (bytes[0] < 0xe0) {
          var direction = { 0: 'N', 1: 'NNE', 2: 'NE', 3: 'ENE', 4: 'E', 5: 'ESE', 6: 'SE', 7: 'SSE', 8: 'S', 9: 'SSW', 10: 'SW', 11: 'WSW', 12: 'W', 13: 'WNW', 14: 'NW', 15: 'NNW' };
          var dic = {};
          var sensor = ['bat', 'wind_speed', 'wind_direction_angle', 'illumination', 'rain_snow', 'CO2', 'TEM', 'HUM', 'pressure', 'rain_gauge', 'PM2_5', 'PM10', 'PAR', 'TSR'];
          var sensor_diy = ['A1', 'A2', 'A3', 'A4'];
          var algorithm = [0x03, 0x01, 0x01, 0x11, 0x20, 0x20, 0x01, 0x01, 0x01, 0x01, 0x20, 0x20, 0x20, 0x01];
          for (i = 0; i < bytes.length; ) {
            var len = bytes[i + 1];
            if (bytes[i] < 0xa1) {
              var sensor_type = bytes[i];
              var operation = algorithm[sensor_type] >> 4;
              var count = algorithm[sensor_type] & 0x0f;

              if (operation === 0) {
                if (sensor_type === 0x06) {
                  //TEM
                  if (bytes[i + 2] & 0x80)
                    dic[sensor[sensor_type]] = (((bytes[i + 2] << 8) | bytes[i + 3]) - 0xffff) / (count * 10.0); //<0
                  else dic[sensor[sensor_type]] = ((bytes[i + 2] << 8) | bytes[i + 3]) / (count * 10.0);
                } else dic[sensor[sensor_type]] = ((bytes[i + 2] << 8) | bytes[i + 3]) / (count * 10.0);
              } else if (operation === 1) {
                dic[sensor[sensor_type]] = ((bytes[i + 2] << 8) | bytes[i + 3]) * (count * 10);
              } else {
                if (sensor_type === 0x04)
                  //RAIN_SNOW
                  dic[sensor[sensor_type]] = bytes[i + 2];
                else dic[sensor[sensor_type]] = (bytes[i + 2] << 8) | bytes[i + 3];
              }

              if (sensor_type === 0x01) {
                dic.wind_speed_level = bytes[i + 4];
              } else if (sensor_type === 0x02) {
                values = bytes[i + 4];
                dic.wind_direction = direction[values];
              }
            } else {
              dic[sensor_diy[bytes[i] - 0xa1]] = (bytes[i + 2] << 8) | bytes[i + 3];
            }

            i = i + 2 + len;
          }
        }
      }
      return {
        data: dic,
      };
      break;

    case 5:
      {
        var frequency = { 1: 'EU868', 2: 'US915', 3: 'IN865', 4: 'AU915', 5: 'KZ865', 6: 'RU864', 7: 'AS923', 8: 'AS923-1', 9: 'AS923-2', 10: 'AS923-3' };
        {
          var node = bytes[0];
          if (node === 13);
          data.node = 'WSC1-L';
          var version1 = bytes[1],
            version2 = bytes[2] >> 4,
            version3 = bytes[2] & 0x0f;
          data.version = 'V' + '.' + version1 + '.' + version2 + '.' + version3;
          var values = bytes[3];
          data.frequency_band = frequency[values];
          data.sub_band = bytes[4];
          data.bat = ((bytes[5] << 8) | bytes[6]) / 1000;
          data.weather_sensor_types = bytes[7].toString(16) + zxc(bytes[8].toString(16)) + bytes[9].toString(16);
        }
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
