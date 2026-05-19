// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Nwave Technologies
// Device       : Smart Parking Sensor G4 SM
// fPort(s)     : 1, 2, 3, 10
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/nwave/nps405.js
// Adapté par   : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. ChirpStack → Device Profiles → <votre profil>
//   2. Onglet « Codec » → « JavaScript functions »
//   3. Coller ce fichier intégralement dans « Codec functions »
//
// Note : le codec TTN d'origine est conservé intact dans un IIFE ;
// la fonction decodeUplink exposée à ChirpStack le réinvoque et normalise
// la sortie au format { data, warnings, errors } attendu par v4 (TR013).
// ─────────────────────────────────────────────────────────────────────

var __opengtb_ttn_decode;
(function () {
	// ─── Source TTN v3 (intact) ─────────────────────────────────────────
function decodeUplink(input) {
  var data = {};
  var bytes = input.bytes;
  var previousState;

  function calculatePreviousState(compressedDuration) {
    var result = {};
    result.previous_state_duration_overflow = false;

    if (compressedDuration < 90) {
      result.previous_state_duration = compressedDuration;
      result.previous_state_duration_error = 0;
    } else if (compressedDuration >= 90 && compressedDuration < 120) {
      result.previous_state_duration = 90 + (compressedDuration - 90) * 5;
      result.previous_state_duration_error = 4;
    } else if (compressedDuration >= 120 && compressedDuration < 127) {
      result.previous_state_duration = 240 + (compressedDuration - 120) * 60;
      result.previous_state_duration_error = 59;
    } else if (compressedDuration === 127) {
      result.previous_state_duration = 660;
      result.previous_state_duration_error = null;
      result.previous_state_duration_overflow = true;
    }

    return result;
  }
  
  switch (input.fPort) {
    case 1: // Parking status
      data.type = "parking_status";
      data.occupied = (bytes[0] & 0x1) === 0x1;
      previousState = calculatePreviousState((bytes[0] >> 1) & 0x7F);
      data.previous_state_duration = previousState.previous_state_duration;
      data.previous_state_duration_error = previousState.previous_state_duration_error;
      data.previous_state_duration_overflow = previousState.previous_state_duration_overflow;

      break;

    case 2: // Heartbeat
      const batteryHealthEnum = {
        low: 'low',
        normal: 'normal',
        critical: 'critical'
      }

      data.type = "heartbeat";
      data.occupied = (bytes[0] & 0x1) === 0x1;
      data.hw_health_status = bytes[0] & 0x7F;

      var temp_byte = (bytes[2] > 127) ? bytes[2] - 256 : bytes[2]
      data.temperature = temp_byte / 2 + 10;

      var batteryVoltageMv = 2500 + bytes[1] * 4;
      data.battery_voltage = batteryVoltageMv / 1000;

      var criticalThreshold;
      var lowThreshold;

      if (data.temperature >= -5) {
        criticalThreshold = 2900;
        lowThreshold = 3000;
      } else if (data.temperature < -5) {
        criticalThreshold = 2800;
        lowThreshold = 2900;
      }

      if (batteryVoltageMv >= lowThreshold) {
        data.battery_health = batteryHealthEnum.normal;
      } else if (batteryVoltageMv >= criticalThreshold && batteryVoltageMv < lowThreshold) {
        data.battery_health = batteryHealthEnum.low;
      } else if (batteryVoltageMv < criticalThreshold) {
        data.battery_health = batteryHealthEnum.critical;
      }

      break;

    case 3: // Startup
      data.type = "startup";
      data.firmware_version = bytes[0] + "." + bytes[1] + "." + bytes[2];
      data.reset_cause = [
        "rejoining_lorawan_network",
        "watchdog",
        "power_on",
        "user_request",
        undefined,
        undefined,
        "brownout",
        "other",
      ][bytes[3]];
      data.occupied = (bytes[4] & 0x1) == 0x1;
      break;

    case 6: // Debug
      data.type = "debug";
      data.bytes = bytes
      break;

    case 10: // SDI tag registration
      data.type = "user_registration";

      if ((bytes[0] & 0x1) === 0x1) {
        data.occupied = true;
        previousState = calculatePreviousState((bytes[0] >> 1) & 0x7F);
        data.previous_state_duration = previousState.previous_state_duration;
        data.previous_state_duration_error = previousState.previous_state_duration_error;
        data.previous_state_duration_overflow = previousState.previous_state_duration_overflow;
      } else {
        data.occupied = null;
        data.previous_state_duration = null;
        data.previous_state_duration_error = null;
        data.previous_state_duration_overflow = null;
      }

      data.tag_id = (bytes[1] << 24 | bytes[2] << 16 | bytes[3] << 8 | bytes[4]).toString(16).toUpperCase();

      break;
  }

  return {
    data: data,
  };
}
	// ─── /Source TTN v3 ─────────────────────────────────────────────────

	__opengtb_ttn_decode = (typeof decodeUplink === 'function')
		? decodeUplink
		: (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function')
			? codec.decodeUplink
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
