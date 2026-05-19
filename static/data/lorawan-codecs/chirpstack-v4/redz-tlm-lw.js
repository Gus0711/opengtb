// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : REDZ Smart Communication
// Device       : TLM LoRaWAN EndNode Modem
// fPort(s)     : 1
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/redz/tlm-lw.js
// Adapté par   : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. ChirpStack → Device Profiles → <votre profil>
//   2. Onglet « Codec » → « JavaScript functions »
//   3. Coller ce fichier intégralement dans « Codec functions »
//
// Note : le codec TTN d'origine est conservé intact dans un IIFE ;
// decodeUplink est ré-exposé au top-level et
// normalisé au format TR013 attendu par v4.
// ─────────────────────────────────────────────────────────────────────

var __opengtb_ttn_decode;
(function () {
	// ─── Source TTN v3 (intact) ─────────────────────────────────────────

function decodeUplink(input) {
  switch (input.fPort) {
    case 1:
      return {
        // Decoded data
        data: {
          frameType: getFrameType([input.bytes[0] & 0x0F]),
          deviceID: '0x'+((input.bytes[1] << 24) + (input.bytes[2] << 16) + (input.bytes[3] << 8) + (input.bytes[4])).toString(16),
          targetPort: input.bytes[5],
          deviceTime: get_status_time((input.bytes[6] << 24) + (input.bytes[7] << 16) + (input.bytes[8] << 8) + (input.bytes[9])),
          firmwareVersion: `${input.bytes[10]}` +'.' + `${input.bytes[11]}` +'.' + `${input.bytes[12]}`,
          deviceName: getDeviceName(input.bytes),
        },
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}

function getFrameType(byte) {

  var frameTypes = ['ModbusRTU', 'ModbusTCP', 'Trasnparent'];

  if(byte >=0 && byte <=2)
    return frameTypes[byte];
  else
    return 'Unknown Frame';
}

function getDeviceName(bytes) {

  var deviceNameS="";

  for(var i=13;i<bytes.length;i++)
    deviceNameS = deviceNameS + String.fromCharCode(bytes[i]);

  return deviceNameS;
}

function get_status_time(hex){

  var hour= (((hex) >> 16) & 0x1F);
	var min=  (((hex) >> 6) & 0x3F);
  var sec = ((hex) & 0x3F);

	
  var year= ((((hex) >> 26) & 0x3F) + 2000);
	var mon= (((hex) >> 12) & 0x0F);
	var day= (((hex) >> 21) & 0x1F);
	
	var time =  year +'-'+ mon +'-'+ day +' '+ hour +':'+ min +':'+ sec;
	return time;
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

