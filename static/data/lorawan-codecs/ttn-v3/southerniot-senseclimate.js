// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Southern IoT
// Device       : senseclimate
// fPort(s)     : 1
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/southerniot/senseclimate.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
//   4. (optionnel) Onglet « Downlink » → encodeDownlink est dans le même fichier
// ─────────────────────────────────────────────────────────────────────

// var directions = ['N', 'E', 'S', 'W'];
// var colors = ['red', 'green'];
// var degrees = {
//   N: 0,
//   E: 90,
//   S: 180,
//   W: 270,
// };

function decodeUplink(input) {
  switch (input.fPort) {
    case 1:
      return {
        // Decoded data
        data: {
          temperature : input.bytes[0],
          humidity : input.bytes[1]
        },
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}

// function normalizeUplink(input) {
//   return {
//     // Normalized data
//     data: {
//       wind: {
//         direction: degrees[input.data.direction], // letter to degrees
//         speed: input.data.speed * 0.5144, // knots to m/s
//       },
//     },
//   };
// }

// function encodeDownlink(input) {
//   var i = colors.indexOf(input.data.led);
//   if (i === -1) {
//     return {
//       errors: ['invalid LED color'],
//     };
//   }
//   return {
//     // LoRaWAN FPort used for the downlink message
//     fPort: 2,
//     // Encoded bytes
//     bytes: [i],
//   };
// }

// function decodeDownlink(input) {
//   switch (input.fPort) {
//     case 2:
//       return {
//         // Decoded downlink (must be symmetric with encodeDownlink)
//         data: {
//           led: colors[input.bytes[0]],
//         },
//       };
//     default:
//       return {
//         errors: ['invalid FPort'],
//       };
//   }
// }
