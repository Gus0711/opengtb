// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Arwin Technology Limited
// Device       : LRS20100 - Temperature & Humidity Sensor
// fPort(s)     : 8, 10, 12, 13
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/arwin-technology/lrs20100.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
//   4. (downlink non fourni par ce vendor)
// ─────────────────────────────────────────────────────────────────────

var lrs20100_events = ['heartbeat', 'rsvd', 'temperature_high', 'temperature_low', 'humidity_high', 'humidity_low'];

function hex2dec(hex) {
  var dec = hex&0xFFFF;
  if (dec & 0x8000)
    dec = -(0x10000-dec)
  return dec;
}

function decodeUplink(input) {
  switch (input.fPort) {
    case 10: // sensor data
      switch (input.bytes[0]) {
        case 1: // LRS20100
          var evt="";
          for (let i=0; i<8; i++) {
          if ((0x01<<i)&input.bytes[1]) 
            if (evt==="")
              evt=lrs20100_events[i];
            else
              evt=evt+","+lrs20100_events[i];
          };
          return {
            data: {
              event: evt,
              battery: input.bytes[2],
              temperature: hex2dec(input.bytes[3]<<8|input.bytes[4])/10,
              humidity: hex2dec(input.bytes[5]<<8|input.bytes[6])/10,
            },
          };
        default:
          return {
            errors: ['unknown sensor type']
          };
      }
      break;
    case 8: // version
      var ver = input.bytes[0]+"."+("00"+input.bytes[1]).slice(-2)+"."+("000"+(input.bytes[2]<<8|input.bytes[3])).slice(-3);    
      return {
        data: {
          firmwareVersion: ver,
        }
      };
    case 12: // device settings
      switch (input.bytes[0]) {
        case 1:
          return {
            data: {
              dataUploadInterval: hex2dec(input.bytes[1]<<8|input.bytes[2]),
            }
          };
        default:
          return {
            errors: ['unknown sensor type']
          }
      }
      case 13: // threshold settings
      switch (input.bytes[0]) {
        case 1:
          return {
            data: {
              highTemperatureThreshold: hex2dec(input.bytes[1]<<8|input.bytes[2]),
              lowTemperatureThreshold: hex2dec(input.bytes[3]<<8|input.bytes[4]),
              highHumidityThreshold: (input.bytes[5]),
              lowHumidityThreshold: (input.bytes[6]),
            }
          }
        default:
          return {
            errors: ['unknown sensor type']
          }
      }
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}
