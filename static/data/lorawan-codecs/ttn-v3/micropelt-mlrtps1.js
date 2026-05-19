// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : micropelt
// Device       : MLRTPS1 - Thermostat
// fPort(s)     : 1
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/micropelt/mlrtps1.js
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
  switch (input.fPort) {
    case 1:
      {
        var output = {
          Ambient_Temperature: input.bytes[0] * 0.25,
          PIR_Status: input.bytes[1]>>5 & 0x01,
          Energy_Storage_Low: input.bytes[1]>>4 & 0x01,
          Radio_Communication_Error: input.bytes[1]>>3 & 0x01,
          Radio_Signal_Strength: input.bytes[1]>>2 & 0x01,
          PIR_Sensor_Failure: input.bytes[1]>>1 & 0x01,
          Ambient_Temperature_Failure: input.bytes[1] & 0x01,
          Storage_Voltage: Number((input.bytes[2]*0.02).toFixed(2)),
          Set_Point_Temperature_Value: get_spt_value(input.bytes[3])
        };
        return { data: output };
      }
      default:
        return {
          errors: ['unknown FPort'],
        };
      }

  }
  
  function get_spt_value(spt_byte) {
    switch (spt_byte) {
      case 0:
        return "0";
      case 1:
        return "+1";
      case 2:
        return "+2";
      case 3:
        return "+3";
      case 4:
        return "+4";
      case 5:
        return "+5";
      case 12:
        return "-4";
      case 13:
        return "-3";
      case 14:
        return "-2";
      case 15:
        return "-1";
      case 255:
        return "Freeze Protection 6°";
      default:
        return "0";
    }
  }
  