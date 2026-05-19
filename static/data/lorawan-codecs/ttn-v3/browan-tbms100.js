// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Browan Communication Incorp.
// Device       : Motion Sensor
// fPort(s)     : 42, 102
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/browan/tbms100.js
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
    var bytes = input.bytes;

    // Check if the payload is empty by verifying if all elements in 'bytes' are 0 or if 'bytes' is empty
  var isEmptyPayload = bytes.length === 0 || bytes.every(element => element === 0);
  if (isEmptyPayload) {
      return {}; // Return an empty object if the payload is empty
  }

    switch (input.fPort) {
      case 102:
        return {
          data: {
            status: bytes[0] & 0x01,
            battery: (25 + (bytes[1] & 0x0f)) / 10,
            temperatureBoard: (bytes[2] & 0x7f) - 32,
            time: (bytes[4] << 8) | bytes[3],
            count: ((bytes[7] << 16) | (bytes[6] << 8)) | bytes[5]
          }
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
    }
  }

function normalizeUplink(input) {
  return {
    data: {
      action: {
        motion: {
          detected: input.data.status > 0,
        }
      },
      air: {
          temperature: input.data.temperatureBoard,
      },
      battery: input.data.battery,
    },
  };
}
