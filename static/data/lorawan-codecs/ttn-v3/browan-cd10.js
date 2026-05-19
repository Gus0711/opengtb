// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Browan Communication Incorp.
// Device       : MerryIoT Air Quality CO2
// fPort(s)     : 42, 127
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/browan/cd10.js
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

    switch (input.fPort) {
      case 127:
        return {
          data: {
            status: bytes[0] & 0x01,
            button: (bytes[0] >> 1) & 0x01,
            co2threshold: (bytes[0] >> 4) & 0x01,
            co2calibration: (bytes[0] >> 5) & 0x01,
            battery: (21 + (bytes[1] & 0x0f)) / 10,
            temperature: ((bytes[3] << 8) | bytes[2])/10,
            humidity: bytes[4],
            co2_ppm: (bytes[6] << 8) | bytes[5],
          }
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
    }
  }
