// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : The Things Products
// Device       : The Things Node
// fPort(s)     : non spécifié dans le profil
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/the-things-products/the-things-node.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
//   4. (downlink non fourni par ce vendor)
// ─────────────────────────────────────────────────────────────────────

var events = {
  1: 'setup',
  2: 'interval',
  3: 'motion',
  4: 'button',
};
var colors = ['red', 'green', 'blue'];

function decodeUplink(input) {
  var data = {};
  data.event = events[input.fPort];
  data.battery = (input.bytes[0] << 8) + input.bytes[1];
  data.light = (input.bytes[2] << 8) + input.bytes[3];
  data.temperature =
    (((input.bytes[4] & 0x80 ? input.bytes[4] - 0x100 : input.bytes[4]) << 8) +
      input.bytes[5]) /
    100;
  return {
    data: data,
  };
}
