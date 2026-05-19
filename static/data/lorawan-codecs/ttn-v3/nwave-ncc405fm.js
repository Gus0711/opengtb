// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Nwave Technologies
// Device       : Smart Car Counter G4 FM
// fPort(s)     : 1, 2, 3
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/nwave/ncc405.js
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
    case 1: // Counter update
      data.type = "counter_update";
      data.counter_value = input.bytes[0] << 8 | input.bytes[1]
      break;

    case 2: // Heartbeat
      data.type = "heartbeat";
      data.hw_health_status = input.bytes[0] & 0x7F;
      var batteryVoltageMv = 2500 + input.bytes[1] * 4;
      data.battery_voltage = batteryVoltageMv / 1000;

      var batteryMeanVoltageMv = 2500 + input.bytes[2] * 4;
      data.battery_voltage_mean_24h = batteryMeanVoltageMv / 1000;

      break;

    case 3: // Startup
      data.type = "startup";
      data.firmware_version = input.bytes[0] + "." + input.bytes[1] + "." + input.bytes[2];
      data.reset_cause = [
        "rejoining_lorawan_network",
        "watchdog",
        "power_on",
        "user_request",
        undefined,
        undefined,
        "brownout",
        "other",
      ][input.bytes[3]];
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
