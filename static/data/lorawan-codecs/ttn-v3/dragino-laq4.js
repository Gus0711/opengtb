// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Dragino Technology Co., Limited
// Device       : LAQ4 - Air Quality Sensor
// fPort(s)     : 2, 42
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/dragino/laq4.js
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
  var mode = (bytes[2] & 0x7c) >> 2;
  var bat = ((bytes[0] << 8) | bytes[1]) / 1000;
  var data = {};
  switch (input.fPort) {
    case 2:
      if (mode == 1) {
        data.Bat_V = bat;
        data.Work_mode = 'CO2';
        data.Alarm_status = bytes[2] & 0x01 ? 'TRUE' : 'FALSE';
        data.TVOC_ppb = (bytes[3] << 8) | bytes[4];
        data.CO2_ppm = (bytes[5] << 8) | bytes[6];
        data.TempC_SHT = parseFloat(((((bytes[7] << 24) >> 16) | bytes[8]) / 10).toFixed(2));
        data.Hum_SHT = parseFloat((((bytes[9] << 8) | bytes[10]) / 10).toFixed(1));
      } else if (mode == 31) {
        data.Bat_V = bat;
        data.Work_mode = 'ALARM';
        data.SHTEMPMIN = (bytes[3] << 24) >> 24;
        data.SHTEMPMAX = (bytes[4] << 24) >> 24;
        data.SHTHUMMIN = bytes[5];
        data.SHTHUMMAX = bytes[6];
        data.CO2MIN = (bytes[7] << 8) | bytes[8];
        data.CO2MAX = (bytes[9] << 8) | bytes[10];
      }

      if (bytes.length == 11) {
        return {
          data: data,
        };
      }
      break;
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}
