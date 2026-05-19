// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : micropelt
// Device       : MLRTPS1 - Thermostat
// fPort(s)     : 1
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/micropelt/mlrtps1.js
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
