// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Dragino Technology Co., Limited
// Device       : LLDS12 - LiDAR Distance Sensor
// fPort(s)     : 2, 42
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/dragino/llds12.js
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
  var batV = value / 1000;
  var temp = 0;
  var data = {};
  switch (input.fPort) {
    case 2:
      if (bytes[0] != 0x03 && bytes[10] != 0x02) {
        data.Bat = batV;
        value = ((bytes[2] << 24) >> 16) | bytes[3];
        data.TempC_DS18B20 = (value / 10).toFixed(2); //DS18B20,temperature

        value = (bytes[4] << 8) | bytes[5];
        data.Lidar_distance = value / 10;

        value = (bytes[6] << 8) | bytes[7];
        data.Lidar_signal = value;

        value = (bytes[9] << 24) >> 24;
        data.Lidar_temp = value;

        data.Interrupt_flag = bytes[8];
        data.Message_type = bytes[10];
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
