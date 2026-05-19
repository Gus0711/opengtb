// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Rivercity Innovations Ltd.
// Device       : Lynx - Micro LoRa GPS Tracker
// fPort(s)     : 2, 3, 4, 5
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/rivercity-innovations/lynx.js
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
  var decoded = {};
    
  if( input.fPort == 2 )
  {
    decoded.type = "position";
    
    decoded.latitudeDeg = input.bytes[3] + input.bytes[2] * 256 + input.bytes[1] * 65536 + input.bytes[0] * 16777216; 
    if (decoded.latitudeDeg >= 0x80000000) // 2^31 
      decoded.latitudeDeg -= 0x100000000; // 2^32 
    decoded.latitudeDeg /= 1e6; 
    
    decoded.longitudeDeg = input.bytes[7] + input.bytes[6] * 256 + input.bytes[5] * 65536 + input.bytes[4] * 16777216; 
    if (decoded.longitudeDeg >= 0x80000000) // 2^31 
      decoded.longitudeDeg -= 0x100000000; // 2^32 
    decoded.longitudeDeg /= 1e6; 
    
    decoded.inTrip = ((input.bytes[8] & 0x80) !== 0) ? true : false;
    decoded.fixFailed = ((input.bytes[8] & 0x40) !== 0) ? true : false; 
    decoded.batV = ((input.bytes[8] & 0x3F) + 20) / 10; // 6 bits, range 0V to 6V 

    decoded.direction = (input.bytes[9] * 360/255); // 8 bits, range 0 to (360-360/255) degrees
    
    decoded.temperature = input.bytes[10];
    if (decoded.temperature > 127) // negative
      decoded.temperature -= 128;
    decoded.temperature = decoded.temperature / 2;
  }
  else if(input.fPort == 3)
  {
    decoded.LoRaWANVersion = input.bytes[0].toString(16) + "." + input.bytes[1].toString(16) + "." + input.bytes[2].toString(16) + "." + input.bytes[3].toString(16);
    decoded.FirmwareVersion = input.bytes[4].toString(16) + "." + input.bytes[5].toString(16) + "." + input.bytes[6].toString(16) + "." + input.bytes[7].toString(16);
  }
  else if (input.fPort == 4)
  {
    decoded.ShortSleepTime = input.bytes[3] + input.bytes[2] * 256 + input.bytes[1] * 65536 + input.bytes[0] * 16777216;
    decoded.LongSleepTime = input.bytes[7] + input.bytes[6] * 256 + input.bytes[5] * 65536 + input.bytes[4] * 16777216;
  }
  else if (input.fPort == 5)
  {
    decoded.gpsTimeoutSec = input.bytes[3] + input.bytes[2] * 256 + input.bytes[1] * 65536 + input.bytes[0] * 16777216;
    decoded.accelSensitivity = input.bytes[4];
  }
  return {
    data: decoded
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
