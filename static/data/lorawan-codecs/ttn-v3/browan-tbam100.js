// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Browan Communication Incorp.
// Device       : Ambient Light Sensor
// fPort(s)     : 42, 104
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/browan/tbam100.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
// ─────────────────────────────────────────────────────────────────────

function decodeUplink(input) {
  var bytes = input.bytes;

  // Check if the payload is empty by verifying if all elements in 'bytes' are 0 or if 'bytes' is empty
  var isEmptyPayload = bytes.length === 0 || bytes.every(element => element === 0);

  if (isEmptyPayload) {
      return {}; // Return an empty object if the payload is empty
  }

  switch (input.fPort) {
    case 104:
      return {
        data: {
          darker: bytes[0] & 0x01,
          lighter: (bytes[0] >> 1) & 0x01,
          statusChange: (bytes[0] >> 4) & 0x01,
          keepAlive: (bytes[0] >> 5) & 0x01,
          battery: (25 + (bytes[1] & 0x0f)) / 10,
          temperatureBoard: (bytes[2] & 0x7f) - 32,
          lux: (((bytes[5] << 16) | (bytes[4] << 8)) | bytes[3]) / 100
        }
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}

