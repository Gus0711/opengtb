// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Nwave Technologies
// Device       : Smart Parking Sensor
// fPort(s)     : 1, 2, 3
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/nwave/nps310sm.js
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
      data.type = "parking_status";
      data.occupied = (input.bytes[0] & 0x1) === 0x1;
      break;

    case 2: // Heartbeat
      data.type = "heartbeat";
      data.occupied = (input.bytes[0] & 0x1) === 0x1;
      break;

    case 3: // Startup
      data.type = "startup";
      data.firmware_version = input.bytes[0] + "." + input.bytes[1] + "." + input.bytes[2];
      data.reset_cause = [
        undefined,
        "watchdog",
        "power_on",
        "user_request",
        "brownout",
        "other",
      ][input.bytes[3]];
      data.occupied = (input.bytes[4] & 0x1) === 0x1;
      break;

    case 6: // Debug
      data.type = "debug";
      data.bytes = input.bytes
      break;
  }

  return {
    data: data,
  };
}
