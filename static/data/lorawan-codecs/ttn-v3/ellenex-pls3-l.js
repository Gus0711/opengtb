// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Ellenex
// Device       : PLS3-L - Level Transmitter
// fPort(s)     : non spécifié dans le profil
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/ellenex/uplinkdecoder-singlesense.js
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/ellenex/encoder.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
//   4. (optionnel) Onglet « Downlink » → encodeDownlink est dans le même fichier
// ─────────────────────────────────────────────────────────────────────

// Codec OpenGTB — combinaison decoder + encoder (fichiers TTN distincts).
// Chaque source TTN est encapsulé dans son propre IIFE pour éviter les
// collisions quand chaque fichier déclare sa propre `decodeUplink`.
var __ogtb_decode_uplink;
var __ogtb_encode_downlink;

// ─── Source decoder (TTN uplinkDecoder) ────────────────────────────
(function () {
function decodeUplink(input) {
    switch (input.fPort) {
      case 15:
        // return error if length of Bytes is not 8
        if (input.bytes.length != 8) {
          return {
            errors: ['Invalid uplink payload: length is not 8 byte'],
          };
        }
        let primarySense = readHex2bytes(input.bytes[3], input.bytes[4]);
        //let secondarySense = readHex2bytes(input.bytes[5], input.bytes[6]);
        let batteryVoltage = input.bytes[7] * 0.1;
        return {
          // Decoded data
          data: {
            sensorReading: primarySense,
            batteryVoltage: +batteryVoltage.toFixed(1),
          },
        };
      default:
        return {
          errors: ['Unknown FPort: please use fPort 1'],
        };
    }
  }
  
  /*
   * The readHex2bytes function is to decode a signed 16-bit integer
   * represented by 2 bytes.  
   */
  function readHex2bytes(byte1, byte2) {
    let result = (byte1 << 8) | byte2;  // merge the two bytes
    // check whether input is signed as a negative number
    // by checking whether significant bit (leftmost) is 1
    let negative = byte1 & 0x80;
    // process negative value
    if (negative) {
      //result = ~(0xFFFF0000 | (result - 1)) * (-1);  // minus 1 and flip all bits
      result = result - 0x10000;
    }
    return result;
  }

	if (typeof decodeUplink === 'function') {
		__ogtb_decode_uplink = decodeUplink;
	} else if (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function') {
		__ogtb_decode_uplink = codec.decodeUplink;
	}
})();

// ─── Source encoder (TTN downlinkEncoder : encoder.js) ─────────
(function () {
function encodeDownlink(input) {
  let result;
  switch (input.command) {
    /* Command 1: Change sampling rate */
    case 1:
      result = changeSamplingRate(input.data);
      break;
    /* Command 2: Enable/Disable confirmation */
    case 2:
      result = confirmation(input.data);
      break;
    /* Command 3: Reset device */
    case 3:
      result = resetDevice(input.data);
      break;
    /* Command 4: Change periodic auto-reset settings */
    case 4:
      result = autoResetDevice(input.data);
      break;
    default:
      return {
        errors: ['Unknown command: please use command 1-4, used' + input.command],
      };
  }

  if (Array.isArray(result)) {
    return {
      fPort: 5,
      bytes: result,
    };
  } else {
    // return error if there is any
    return result;
  }
}

/*
 * Command 1
 * The changeSamplingRate function encodes the JSON data
 * to a 4 bytes array downlink messsage that changes device
 * sampling rate.
 */
function changeSamplingRate(data) {
  if (typeof data.unit !== 'string') {
    return {
      errors: ["Missing required field or invalid input: unit"],
    };
  }
  if (typeof data.time !== 'number') {
    return {
      errors: ["Missing required field or invalid input: time"],
    };
  }

  let bytes = [0x10];
  let unit = data.unit, time = data.time;
  // Add time unit
  if (unit == "second") {
    bytes.push(0x00);
  } else if (unit == "minute") {
    bytes.push(0x01);
  } else {
    return {
      errors: ["Invalid time unit: must be either \"minute\" or \"second\""],
    };
  }

  // Add length of time with a minimum sleep period is 60 seconds
  if ((unit == "second" && time < 60) || (unit == "minute" && time < 1)) {
    return {
      errors: ["Invalid sampling interval: minimum is 60 seconds (i.e. 1 minute)"],
    };
  } 
  return bytes.concat(decimalToHexBytes(time));
}

/*
 * Command 2
 * The confirmation function encodes the JSON data
 * to a 2 bytes array downlink messsage that enable/disable
 * confirmation.
 */
function confirmation(data) {
  if (typeof data.confirmation !== 'boolean') {
    return {
      errors: ["Missing required field or invalid input: confirmation"],
    };
  }

  if (data.confirmation) {
    return [0x07, 0x01];
  } else {
    return [0x07, 0x00];
  }
}

/*
 * Command 3
 * The resetDevice function encodes the JSON data
 * to a 2 bytes array downlink messsage that resets
 * the device.
 */
function resetDevice(data) {
  if (typeof data.reset !== 'boolean' || !data.reset) {
    return {
      errors: ["Missing required field or invalid input: reset"],
    };
  }

  if (data.reset) {
    return [0xFF, 0x00];
  }
}

/*
 * Command 4
 * The resetDevice function encodes the JSON data
 * to a 3 bytes array downlink messsage that changes
 * periodic auto-reset settings of device.
 */
function autoResetDevice(data) {
  if (typeof data.count !== 'number') {
    return {
      errors: ["Missing required field or invalid input: count"],
    };
  }
  // 
  return [0x16].concat(decimalToHexBytes(data.count));
}

/*
 * The decimalToHexBytes converts a decimal number
 * to 2 bytes hex array
 */
function decimalToHexBytes(n) {
  return [n >> 8, n & 0xFF];
}

	if (typeof encodeDownlink === 'function') {
		__ogtb_encode_downlink = encodeDownlink;
	} else if (typeof codec !== 'undefined' && codec && typeof codec.encodeDownlink === 'function') {
		__ogtb_encode_downlink = codec.encodeDownlink;
	}
})();

function decodeUplink(input) {
	if (typeof __ogtb_decode_uplink !== 'function') {
		return { data: {}, warnings: [], errors: ['decodeUplink TTN introuvable dans le codec source'] };
	}
	return __ogtb_decode_uplink(input);
}

function encodeDownlink(input) {
	if (typeof __ogtb_encode_downlink !== 'function') {
		return { bytes: [], fPort: input && input.fPort, warnings: [], errors: ['encodeDownlink TTN introuvable dans le codec source'] };
	}
	return __ogtb_encode_downlink(input);
}
