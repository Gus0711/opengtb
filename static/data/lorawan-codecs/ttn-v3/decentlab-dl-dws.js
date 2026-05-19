// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Decentlab GmbH
// Device       : DL-DWS - Weighing Scale
// fPort(s)     : 1
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/decentlab/dl-dws-232263168-0000302459-1370.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
// ─────────────────────────────────────────────────────────────────────


/* https://www.decentlab.com/products/weighing-scale-for-lorawan */

var decentlab_decoder = {
  PROTOCOL_VERSION: 2,
  /* device-specific parameters */
  PARAMETERS: {
    f02: 232263168,
    s: 0.000302459,
    m0: 1370
  },
  SENSORS: [
    {length: 3,
     values: [{name: 'frequency',
               displayName: 'Frequency',
               convert: function (x) { return x[0] / x[1] * 32768; },
               unit: 'Hz'},
              {name: 'weight',
               displayName: 'Weight',
               convert: function (x) { return (Math.pow(x[0] / x[1] * 32768, 2) - this.PARAMETERS.f02) * this.PARAMETERS.s + this.PARAMETERS.m0; },
               unit: 'g'}]},
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
