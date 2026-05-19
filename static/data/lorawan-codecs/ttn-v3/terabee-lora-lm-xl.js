// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Terabee
// Device       : LoRa Level Monitoring XL
// fPort(s)     : 1
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/terabee/lora-lm-xl.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
// ─────────────────────────────────────────────────────────────────────

function isKthBitSet(byte, k){
  return byte & (1 << k);
}

function decodeErrors(errorByte){
  var errors = [];
  if (isKthBitSet(errorByte, 0))
    errors.push("System reset has been triggered due to an"
    + " unexpected error. ");

  if (isKthBitSet(errorByte, 1))
    errors.push("Embedded LoRa module failed to"
    + " enter sleep mode. If possible, please restart the device.");

  if (isKthBitSet(errorByte, 2))
    errors.push("System failed to read voltage from the battery."
    + " If possible, please restart the device.");

  if (isKthBitSet(errorByte, 3))
    errors.push("System failed to get a response from the"
    + " onboard ToF distance sensor. If possible, please restart the device.");
  return errors;
}

function decodeLevelPercentage(level){
  if (level === 255)
    return "LEVEL_ERROR";
  return level;
}

function decodeDistance(distance){
  if (distance === 0)
    return "TARGET_TOO_CLOSE";
  if (distance === 65535)
    return "TARGET_TOO_FAR";
  if (distance === 1)
    return "INVALID_READING";
  return distance;
}

function decodeUplink(input) {

  var data = {};
  var errors = [];
  var bytes = input.bytes;

  data.distance = decodeDistance(bytes[0]<<8 | bytes[1]);
  data.levelPercentage = decodeLevelPercentage(bytes[2]);
  data.batteryVoltage = bytes[3]<<8 | bytes[4];

  errors = decodeErrors(bytes[5]);
  if(!errors.length == 0){
    return {
      errors: errors
    }
  }

  return {
    data: data,
  };
}