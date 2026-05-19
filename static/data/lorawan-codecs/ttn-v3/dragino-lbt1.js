// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Dragino Technology Co., Limited
// Device       : LBT1 - Bluetooth Tracker
// fPort(s)     : 2, 42
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/dragino/lbt1.js
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
  // Decode an uplink message from a buffer
  // (array) of bytes to an object of fields.
  var port = input.fPort;
  var bytes = input.bytes;
  var mode = bytes[5];
  var data = {};
  var i;
  var con;
  var str = '';
  var value = (bytes[0] << 8) | bytes[1];
  var addr = '';
  var rssi = 0;
  var major = 1;
  var minor = 1;

  switch (input.fPort) {
    case 2:
      if (mode == 2) {
        for (i = 38; i < 50; i++) {
          con = bytes[i].toString();
          str += String.fromCharCode(con);
        }

        data.addr = str;
        data.batV = value / 1000;
        data.major = 1;
        data.minor = 1;
        data.rssi = 0;

        str = '';

        for (i = 6; i < 38; i++) {
          con = bytes[i].toString();
          str += String.fromCharCode(con);
        }

        value = str;
      }

      if (mode == 3) {
        str = '';
        for (i = 18; i < 22; i++) {
          con = bytes[i].toString();
          str += String.fromCharCode(con);
        }

        data.major = parseInt(str, 16);
        data.batV = value / 1000;
        data.addr = '';

        str = '';

        for (i = 22; i < 26; i++) {
          con = bytes[i].toString();
          str += String.fromCharCode(con);
        }

        data.minor = parseInt(str, 16);

        str = '';

        for (i = 28; i < 32; i++) {
          con = bytes[i].toString();
          str += String.fromCharCode(con);
        }

        data.rssi = parseInt(str);

        str = '';
        for (i = 6; i < 18; i++) {
          con = bytes[i].toString();
          str += String.fromCharCode(con);
        }

        value = str;
      }

      if (mode == 1) {
        for (i = 6; i < 11; i++) {
          con = bytes[i].toString();
          str += String.fromCharCode(con);
        }
        data.batV = value / 1000;
        value = str;
        data.addr = '';
        data.major = 1;
        data.minor = 1;
        data.rssi = 0;
      }

      data.uuid = value;
      data.alarm = (bytes[2] >> 4) & 0x0f;
      data.step_count = ((bytes[2] & 0x0f) << 16) | (bytes[3] << 8) | bytes[4];
      return {
        data: data,
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}
