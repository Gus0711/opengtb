// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Dragino Technology Co., Limited
// Device       : LDDS04 - Distance Sensor
// fPort(s)     : 2, 42
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/dragino/ldds04.js
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
  var port = input.fPort;
  var bytes = input.bytes;
  var value = ((bytes[0] << 8) | bytes[1]) & 0x3fff;
  var data = {};
  switch (input.fPort) {
    case 2:
      if (!(bytes[0] == 0x03 && bytes[10] == 0x02)) {
        data.BatV = value / 1000;
        data.EXTI_Trigger = bytes[0] & 0x80 ? 'TRUE' : 'FALSE';
        data.distance1_cm = ((bytes[2] << 8) | bytes[3]) / 10;
        data.distance2_cm = ((bytes[4] << 8) | bytes[5]) / 10;
        data.distance3_cm = ((bytes[6] << 8) | bytes[7]) / 10;
        data.distance4_cm = ((bytes[8] << 8) | bytes[9]) / 10;
        data.mes_type = bytes[10];
      }
      return {
        data: data,
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}
