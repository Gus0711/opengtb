// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Bosch Connected Devices and Solutions GmbH
// Device       : Parking Lot Sensor
// fPort(s)     : 1, 2, 3
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/bosch/tpl110-0292.js
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
  switch (input.fPort) {
    case 1: // Parking status
      data.type = 'parking status';
      data.occupied = (input.bytes[0] & 0x1) === 0x1;
      break;

    case 2: // Heartbeat
      data.type = 'heartbeat';
      data.occupied = (input.bytes[0] & 0x1) === 0x1;
      if (input.bytes.length >= 2) {
        data.temperature =
          input.bytes[1] & 0x80 ? input.bytes[1] - 0x100 : input.bytes[1];
      }
      break;

    case 3: // Start-up
      data.type = 'startup';
      data.debugCodes = [];
      for (var i = 0; i <= 8; i += 4) {
        var debugCode = ((input.bytes[i + 1] & 0xf) << 8) | input.bytes[i];
        if (debugCode) {
          data.debugCodes.push(debugCode);
        }
      }
      data.firmwareVersion =
        input.bytes[12] + '.' + input.bytes[13] + '.' + input.bytes[14];
      data.resetCause = [
        undefined,
        'watchdog',
        'power on',
        'system request',
        'other',
      ][input.bytes[15]];
      data.occupied = (input.bytes[16] & 0x1) == 0x1;
      break;

    case 4: // Device information
      data.type = 'device information';
      data.bytes = input.bytes;
      break;

    case 5: // Device usage
      data.type = 'device usage';
      data.bytes = input.bytes;
      break;

    case 6: // Debug
      data.type = 'debug';
      data.timestamp =
        (input.bytes[3] << 24) |
        (input.bytes[2] << 16) |
        (input.bytes[1] << 8) |
        input.bytes[0];
      data.debugCode = ((input.bytes[5] & 0xf) << 8) | input.bytes[4];
      data.sequenceNumber = (input.bytes[9] << 8) | input.bytes[8];
      break;
  }

  return {
    data: data,
  };
}
