// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Aqua-Scope Technologies
// Device       : Ball Valve Servo BVSLWE01
// fPort(s)     : 10, 42
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/aquascope/bvs.js
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
          leak: (input.bytes[0] & 0x01) ? "Y":"N",
          valve: (input.bytes[0] & 0x20) ? "On":"Off",
          temperature: t
        },
      };
    case 16:
      return {
        // Decoded data
        data: {
          valve: (input.bytes[0] & 0x20) ? "On":"Off",
          temperature: t
        },
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}

function encodeDownlink(input) {
  if (input.data.valve == "On") r = 255; else r = 0;
  return {
    // LoRaWAN FPort used for the downlink message
    fPort: 10,
    // Encoded bytes
    bytes: [2,r],
  };
}

function decodeDownlink(input) {
  switch (input.fPort) {
    case 10:
      if (input.bytes[0] == 2)
        return {
          data: {
            valve: input.bytes[1]?"On":"Off",
          },
        };
    default:
      return {
        errors: ['invalid FPort'],
      };
  }
}
