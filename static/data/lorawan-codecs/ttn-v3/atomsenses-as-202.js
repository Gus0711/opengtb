// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Atomsenses
// Device       : AS202 LoRaWAN Car Park Air Quality
// fPort(s)     : 85
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/atomsenses/as-202.js
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
  var res = Decoder(input.bytes, input.fPort);
  if (res.error) {
    return {
      errors: [res.error],
    };
  }
  return {
    data: res,
  };
}

/**
 * Payload Decoder for The Things Network
 * 
 * Copyright 2024 Atomsenses
 * 
 * @product AS202
 */
function Decoder(bytes, port) {
  var decoded = {};

  for (var i = 0; i < bytes.length;) {
    var channel_id = bytes[i++];
    var channel_type = bytes[i++];
    // BATTERY
    if (channel_id === 0x01 && channel_type === 0x75) {
      decoded.battery = bytes[i];
      i += 1;
    }
    // TEMPERATURE
    else if (channel_id === 0x03 && channel_type === 0x67) {
      // ℃
      decoded.temperature = readInt16LE(bytes.slice(i, i + 2)) / 10;
      i += 2;
    }
    // HUMIDITY
    else if (channel_id === 0x04 && channel_type === 0x68) {
      decoded.humidity = bytes[i] / 2;
      i += 1;
    }
    // NO2
    else if (channel_id === 0x06 && channel_type === 0x70) {
      decoded.no2 = bytes[i];
      i += 1;
    }
    // CO
    else if (channel_id === 0x09 && channel_type === 0x73) {
      decoded.co = readUInt16LE(bytes.slice(i, i + 2));
      i += 2;
    } else {
      break;
    }
  }

  return decoded;
}

/* ******************************************
* bytes to number
********************************************/
function readUInt16LE(bytes) {
  var value = (bytes[1] << 8) + bytes[0];
  return value & 0xffff;
}

function readInt16LE(bytes) {
  var ref = readUInt16LE(bytes);
  return ref > 0x7fff ? ref - 0x10000 : ref;
}
