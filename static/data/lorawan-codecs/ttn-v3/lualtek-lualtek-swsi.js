// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Lualtek
// Device       : Simple actuator
// fPort(s)     : non spécifié dans le profil
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/lualtek/lualtek-swsi.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
//   4. (downlink non fourni par ce vendor)
// ─────────────────────────────────────────────────────────────────────

function getData(bytes) {
    var switchValue = (bytes[0] << 8) | bytes[1];
    var batteryValue = (bytes[2] << 8) | bytes[3];
    var uplinkInterval = bytes.length > 4 ? (bytes[4] << 8) | bytes[5] : 0;
  
    var payload = {
      switchValue: switchValue,
      batteryValue: batteryValue
    };
  
    if (uplinkInterval > 0) {
      payload.uplinkInterval = uplinkInterval;
    }
  
    return payload;
  }
  
  function decodeUplink(input) {
    switch (input.fPort) {
      case 1:
        return {
          data: getData(input.bytes)
        };
      default:
        return {
          errors: ['unknown FPort'],
        };
    }
  }
  
  function downlinkAction(data) {
    if (data.switchValue === undefined && data.stepValue === undefined) {
      return {
        errors: ['Invalid data for downlink action'],
      }
    }
  
    return {
      bytes: [parseInt(data.switchValue || data.stepValue, 10)],
      fPort: 1
    };
  }
  
  function downlinkStepTiming(data) {
    if (data.stepTiming === undefined) {
      return {
        errors: ['Invalid data for downlink step timing'],
      }
    }
  
    return {
      bytes: [data.stepTiming],
      fPort: 4
    }
  }
  
  var downlinkByPort = {
    1: downlinkAction,
    4: downlinkStepTiming
  }
  
  function decodeDownlink(input) {
    return {
      data: {
        bytes: input.bytes,
        fPort: input.fPort
      }
    };
  }