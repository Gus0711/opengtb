// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Dragino Technology Co., Limited
// Device       : LDDS45 - Distance Sensor
// fPort(s)     : 2, 42
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/dragino/ldds45.js
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
  switch (input.fPort) {
    case 2:
      data.Bat = value / 1000;
      value = (input.bytes[2] << 8) | input.bytes[3];
      data.Distance = value + ' mm';
      if (value === 0) data.Distance = 'No Sensor';
      else if (value === 20) data.Distance = 'Invalid Reading';
      data.Interrupt_flag = input.bytes[4];

      value = (input.bytes[5] << 8) | input.bytes[6];
      if (input.bytes[5] & 0x80) {
        value |= 0xffff0000;
      }
      data.TempC_DS18B20 = (value / 10).toFixed(2); //DS18B20,temperature
      data.Sensor_flag = input.bytes[7];
      return {
        data: data,
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}
