// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Decentlab GmbH
// Device       : DL-ATM41G2 - Eleven Parameter Weather Station
// fPort(s)     : 1
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/decentlab/dl-atm41g2.js
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

/* https://www.decentlab.com/products/eleven-parameter-weather-station-for-lorawan */

var decentlab_decoder = {
  PROTOCOL_VERSION: 2,
  SENSORS: [
    {length: 17,
     values: [{name: 'solar_radiation',
               displayName: 'Solar radiation',
               convert: function (x) { return (x[0] - 32768) / 10; },
               unit: 'W⋅m⁻²'},
              {name: 'precipitation',
               displayName: 'Precipitation',
               convert: function (x) { return x[1] / 1000; },
               unit: 'mm'},
              {name: 'lightning_strike_count',
               displayName: 'Lightning strike count',
               convert: function (x) { return x[2] - 32768; },
               unit: 'None'},
              {name: 'lightning_average_distance',
               displayName: 'Lightning average distance',
               convert: function (x) { return x[3] - 32768; },
               unit: 'km'},
              {name: 'wind_speed',
               displayName: 'Wind speed',
               convert: function (x) { return (x[4] - 32768) / 100; },
               unit: 'm⋅s⁻¹'},
              {name: 'wind_direction',
               displayName: 'Wind direction',
               convert: function (x) { return (x[5] - 32768) / 10; },
               unit: '°'},
              {name: 'maximum_wind_speed',
               displayName: 'Maximum wind speed',
               convert: function (x) { return (x[6] - 32768) / 100; },
               unit: 'm⋅s⁻¹'},
              {name: 'air_temperature',
               displayName: 'Air temperature',
               convert: function (x) { return (x[7] - 32768) / 10; },
               unit: '°C'},
              {name: 'vapor_pressure',
               displayName: 'Vapor pressure',
               convert: function (x) { return (x[8] - 32768) / 100; },
               unit: 'kPa'},
              {name: 'barometric_pressure',
               displayName: 'Barometric pressure',
               convert: function (x) { return (x[9] - 32768) / 100; },
               unit: 'kPa'},
              {name: 'relative_humidity',
               displayName: 'Relative humidity',
               convert: function (x) { return (x[10] - 32768) / 10; },
               unit: '%'},
              {name: 'internal_temperature',
               displayName: 'Internal temperature',
               convert: function (x) { return (x[11] - 32768) / 10; },
               unit: '°C'},
              {name: 'tilt_angle_x_orientation',
               displayName: 'Tilt angle, X orientation',
               convert: function (x) { return (x[12] - 32768) / 10; },
               unit: '°'},
              {name: 'tilt_angle_y_orientation',
               displayName: 'Tilt angle, Y orientation',
               convert: function (x) { return (x[13] - 32768) / 10; },
               unit: '°'},
              {name: 'precipitation_electrical_conductivity',
               displayName: 'Precipitation electrical conductivity',
               convert: function (x) { return x[14] - 32768; },
               unit: 'µS⋅cm⁻¹'},
              {name: 'cumulative_precipitation',
               displayName: 'Cumulative precipitation',
               convert: function (x) { return (x[15] + x[16] * 65536) / 1000; },
               unit: 'mm'}]},
    {length: 1,
     values: [{name: 'battery_voltage',
               displayName: 'Battery voltage',
               convert: function (x) { return x[0] / 1000; },
               unit: 'V'}]}
  ],

  read_int: function (bytes, pos) {
    return (bytes[pos] << 8) + bytes[pos + 1];
  },

  decode: function (msg) {
    var bytes = msg;
    var i, j;
    if (typeof msg === 'string') {
      bytes = [];
      for (i = 0; i < msg.length; i += 2) {
        bytes.push(parseInt(msg.substring(i, i + 2), 16));
      }
    }

    var version = bytes[0];
    if (version != this.PROTOCOL_VERSION) {
      return {error: "protocol version " + version + " doesn't match v2"};
    }

    var deviceId = this.read_int(bytes, 1);
    var flags = this.read_int(bytes, 3);
    var result = {'protocol_version': version, 'device_id': deviceId};
    // decode payload
    var pos = 5;
    for (i = 0; i < this.SENSORS.length; i++, flags >>= 1) {
      if ((flags & 1) !== 1)
        continue;

      var sensor = this.SENSORS[i];
      var x = [];
      // convert data to 16-bit integer array
      for (j = 0; j < sensor.length; j++) {
        x.push(this.read_int(bytes, pos));
        pos += 2;
      }

      // decode sensor values
      for (j = 0; j < sensor.values.length; j++) {
        var value = sensor.values[j];
        if ('convert' in value) {
          result[value.name] = {displayName: value.displayName,
                                value: value.convert.bind(this)(x)};
          if ('unit' in value)
            result[value.name]['unit'] = value.unit;
        }
      }
    }
    return result;
  }
};

function decodeUplink(input) {
  var res = decentlab_decoder.decode(input.bytes);
  if (res.error) {
    return {
      errors: [res.error],
    };
  }
  return {
    data: res,
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
