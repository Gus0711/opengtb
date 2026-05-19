// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : The Things Industries
// Device       : Generic Node (Sensor Edition)
// fPort(s)     : 1
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/the-things-industries/generic-node-sensor-edition-codec.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
//   4. (downlink non fourni par ce vendor)
// ─────────────────────────────────────────────────────────────────────

function decodeUplink(input) {
  var data = {};
  data.batt_volt = input.bytes[0] / 10;
  data.temperature = ((input.bytes[1] << 8) + input.bytes[2] - 500) / 10;
  data.humidity = ((input.bytes[3] << 8) + input.bytes[4]) / 10;
  data.button = input.bytes[5];

  return {
    data: data,
  };
}

function normalizeUplink(input) {
  return {
    data: {
      air: {
          temperature: input.data.temperature,
          relativeHumidity: input.data.humidity,
      },
      battery: input.data.batt_volt,
    },
  };
}
