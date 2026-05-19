// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Accuwatch
// Device       : LoraWan 3ch Voltage Sensor
// fPort(s)     : non spécifié dans le profil
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/accuwatch/3chbatteryvoltagesensor.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
// ─────────────────────────────────────────────────────────────────────

function decodeUplink(input) {
  // Helper function to convert bytes to float
  function bytesToFloat(bytes) {
    var bits = (bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0];
    var sign = (bits & 0x80000000) ? -1 : 1;
    var exponent = ((bits >> 23) & 0xFF) - 127;
    var significand = (bits & ~(-1 << 23));

    if (exponent === 128)
        return sign * ((significand) ? NaN : Infinity);

    if (exponent === -127) {
        if (significand === 0) return sign * 0.0;
        exponent = -126;
        significand /= (1 << 22);
    } else significand = (significand | (1 << 23)) / (1 << 23);

    return sign * significand * Math.pow(2, exponent);
  }

  // Decode each float from the 12-byte payload
  var sensor1Voltage = bytesToFloat(input.bytes.slice(0, 4));
  var sensor2Voltage = bytesToFloat(input.bytes.slice(4, 8));
  var sensor3Voltage = bytesToFloat(input.bytes.slice(8, 12));

  // Round the float values to 2 decimal places
  sensor1Voltage = Math.round(sensor1Voltage * 100) / 100;
  sensor2Voltage = Math.round(sensor2Voltage * 100) / 100;
  sensor3Voltage = Math.round(sensor3Voltage * 100) / 100;

  // Return decoded values
  return {
    data: {
      sensor1Voltage: sensor1Voltage.toFixed(2),
      sensor2Voltage: sensor2Voltage.toFixed(2),
      sensor3Voltage: sensor3Voltage.toFixed(2)
    },
    warnings: [],
    errors: []
  };
}