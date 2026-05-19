// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Ellenex
// Device       : PLS2-L-V6- Level Transmitter
// fPort(s)     : 15
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/ellenex/pls2-l-v6.js
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/ellenex/encoder.js
// Adapté par   : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. ChirpStack → Device Profiles → <votre profil>
//   2. Onglet « Codec » → « JavaScript functions »
//   3. Coller ce fichier intégralement dans « Codec functions »
//
// Note : le codec TTN d'origine est conservé intact dans un IIFE ;
// decodeUplink et encodeDownlink sont ré-exposés au top-level et
// normalisés au format TR013 attendu par v4.
// ─────────────────────────────────────────────────────────────────────

var __opengtb_ttn_decode;
var __opengtb_ttn_encode;
(function () {
	// ─── Source TTN v3 (intact) ─────────────────────────────────────────
// Codec OpenGTB — combinaison decoder + encoder (fichiers TTN distincts).
// Chaque source TTN est encapsulé dans son propre IIFE pour éviter les
// collisions quand chaque fichier déclare sa propre `decodeUplink`.
var __ogtb_decode_uplink;
var __ogtb_encode_downlink;

// ─── Source decoder (TTN uplinkDecoder) ────────────────────────────
(function () {

function decodeUtf8(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]);
  }
  return s;
}

function bytesToFloat16(bytes) {
  const half = (bytes[0] << 8) | bytes[1];
  const exp = (half & 0x7c00) >> 10;
  const frac = half & 0x03ff;
  let val;
  if (exp === 0) {
    val = (frac / 1024) * Math.pow(2, -14);
  } else if (exp === 31) {
    val = frac ? NaN : Infinity;
  } else {
    val = (1 + frac / 1024) * Math.pow(2, exp - 15);
  }
  return half & 0x8000 ? -val : val;
}

function bytesToFloat32(bytes) {
  const dv = new DataView(new ArrayBuffer(4));
  for (let i = 0; i < 4; i++) dv.setUint8(i, bytes[i]);
  return dv.getFloat32(0, false);
}

function bytesToFloat64(bytes) {
  const dv = new DataView(new ArrayBuffer(8));
  for (let i = 0; i < 8; i++) dv.setUint8(i, bytes[i]);
  return dv.getFloat64(0, false);
}

function decodeCBOR(buf) {
  let i = 0;
  function readByte() {
    return buf[i++];
  }
  function readN(n) {
    const s = buf.slice(i, i + n);
    i += n;
    return s;
  }

  function readLength(ai) {
    if (ai < 24) return ai;
    if (ai === 24) return readByte();
    if (ai === 25) {
      const b = readN(2);
      return (b[0] << 8) | b[1];
    }
    if (ai === 26) {
      const b = readN(4);
      return (b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3];
    }
    if (ai === 27) {
      const b = readN(8);
      return Number(
        (BigInt(b[0]) << 56n) | (BigInt(b[1]) << 48n) | (BigInt(b[2]) << 40n) | (BigInt(b[3]) << 32n) | (BigInt(b[4]) << 24n) | (BigInt(b[5]) << 16n) | (BigInt(b[6]) << 8n) | BigInt(b[7]),
      );
    }
    if (ai === 31) return -1; // indefinite
    throw new Error('Unsupported length encoding');
  }

  function parseItem() {
    const initial = readByte();
    const major = initial >> 5;
    const ai = initial & 0x1f;

    switch (major) {
      case 0:
        return readLength(ai);
      case 1: {
        const n = readLength(ai);
        return -1 - n;
      }
      case 2: {
        const len = readLength(ai);
        return readN(len);
      }
      case 3: {
        const len = readLength(ai);
        return decodeUtf8(readN(len));
      }
      case 4: {
        const len = readLength(ai);
        const arr = [];
        if (len === -1) {
          while (buf[i] !== 0xff) arr.push(parseItem());
          i++;
        } else {
          for (let k = 0; k < len; k++) arr.push(parseItem());
        }
        return arr;
      }
      case 5: {
        const len = readLength(ai);
        const obj = {};
        if (len === -1) {
          while (buf[i] !== 0xff) {
            obj[parseItem()] = parseItem();
          }
          i++;
        } else {
          for (let k = 0; k < len; k++) obj[parseItem()] = parseItem();
        }
        return obj;
      }
      case 7:
        if (ai === 20) return false;
        if (ai === 21) return true;
        if (ai === 22) return null;
        if (ai === 23) return undefined;
        if (ai === 25) return bytesToFloat16(readN(2));
        if (ai === 26) return bytesToFloat32(readN(4));
        if (ai === 27) return bytesToFloat64(readN(8));
        if (ai === 31) return null;
        return ai;
      default:
        throw new Error('Unsupported major type: ' + major);
    }
  }

  return parseItem();
}

// --- mapping for your device ---
const SENSOR_MAP = {
  L: { name: 'Level(m)', transform: (v) => Number(v) },
  v: { name: 'Battery_Voltage(mv)', transform: (v) => Number(v) },
};

function mapCbor(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const k in obj) {
    if (SENSOR_MAP[k]) {
      out[SENSOR_MAP[k].name] = SENSOR_MAP[k].transform(obj[k]);
    } else {
      out[k] = obj[k];
    }
  }
  return out;
}

// --- TTN entry point ---
function decodeUplink(input) {
  try {
    const parsed = decodeCBOR(input.bytes);
    return { data: mapCbor(parsed) };
  } catch (e) {
    return { data: {} };
  }
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
	// ─── /Source TTN v3 ─────────────────────────────────────────────────

	__opengtb_ttn_decode = (typeof decodeUplink === 'function')
		? decodeUplink
		: (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function')
			? codec.decodeUplink
			: null;
	__opengtb_ttn_encode = (typeof encodeDownlink === 'function')
		? encodeDownlink
		: (typeof codec !== 'undefined' && codec && typeof codec.encodeDownlink === 'function')
			? codec.encodeDownlink
			: null;
})();

function decodeUplink(input) {
	if (typeof __opengtb_ttn_decode !== 'function') {
		return { data: {}, warnings: [], errors: ['decodeUplink TTN introuvable dans le codec source'] };
	}
	var r;
	try {
		r = __opengtb_ttn_decode(input) || {};
	} catch (e) {
		return { data: {}, warnings: [], errors: [(e && e.message) ? e.message : String(e)] };
	}
	var data = (r && r.data !== undefined) ? r.data : r;
	return {
		data: data,
		warnings: Array.isArray(r.warnings) ? r.warnings : [],
		errors: Array.isArray(r.errors) ? r.errors : []
	};
}

function encodeDownlink(input) {
	if (typeof __opengtb_ttn_encode !== 'function') {
		return { bytes: [], fPort: input && input.fPort, warnings: [], errors: ['encodeDownlink TTN introuvable dans le codec source'] };
	}
	var r;
	try {
		r = __opengtb_ttn_encode(input) || {};
	} catch (e) {
		return { bytes: [], fPort: input && input.fPort, warnings: [], errors: [(e && e.message) ? e.message : String(e)] };
	}
	return {
		bytes: Array.isArray(r.bytes) ? r.bytes : [],
		fPort: typeof r.fPort === 'number' ? r.fPort : (input && input.fPort),
		warnings: Array.isArray(r.warnings) ? r.warnings : [],
		errors: Array.isArray(r.errors) ? r.errors : []
	};
}

