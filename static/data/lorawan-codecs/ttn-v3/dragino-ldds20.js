// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Dragino Technology Co., Limited
// Device       : LDDS20 - Liquid Level Sensor
// fPort(s)     : 2, 42
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/dragino/ldds20.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
// ─────────────────────────────────────────────────────────────────────

function decodeUplink(input) {
  var data = {};
  var len = input.bytes.length;
  var value = ((input.bytes[0] << 8) | input.bytes[1]) & 0x3fff;
  var batV = value / 1000; //Battery,units:V
  var distance = 0;
  var interrupt = input.bytes[len - 1];
  switch (input.fPort) {
    case 2:
      if (len == 5) {
        data.value = (input.bytes[2] << 8) | input.bytes[3];
        data.distance = value; //distance,units:mm
        if (value < 20) data.distance = 'Invalid Reading';
      } else data.distance = 'No Sensor';
      return {
        data: data,
      };

    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}
