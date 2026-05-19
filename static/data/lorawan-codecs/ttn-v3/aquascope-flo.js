// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Aqua-Scope Technologies
// Device       : Flood Sensor FLOLWE01
// fPort(s)     : 10, 42
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/aquascope/wwd.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
// ─────────────────────────────────────────────────────────────────────

function decodeUplink(input) {
  var t = input.bytes[2]*0xff+input.bytes[3]
  switch (input.fPort) {
    case 10:
      return {
        // Decoded data
        data: {
          leak: input.bytes[0] & 0x01 ,
          remote: (input.bytes[0] & 0x02)?1:0 ,
          battery: input.bytes[1],
          temperature: t
        },
      };
    case 16:
      return {
        // Decoded data
        data: {
          battery: input.bytes[1],
          temperature: t
        },
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}
