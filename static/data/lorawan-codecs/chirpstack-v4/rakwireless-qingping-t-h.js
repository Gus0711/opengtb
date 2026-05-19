// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : RAKwireless Technology Co.
// Device       : QingPing Temperature & Humidity Monitor for LoRaWAN
// fPort(s)     : non spécifié dans le profil
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/rakwireless/decoder-qingping.js
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
function Decoder(bytes, port) {
  
	var i = 0;
    var output = {};
    var device_address = data[i++];
    var function_code = data[i++];
	var data_length = data[i++];
    var data_type = data[i++];
    
	// Parsing only real time data from sensor   
	if ((0x41 == function_code) && (0x01 == data_type)) {
      
      	// id
		output.device = device_address;

        // timestamp
        output.timestamp = (data[i] << 24) + (data[i+1] << 16) + (data[i+2] << 8) + data[i+3];
        i+=4;

        // temperature
        output.temperature = ((data[i] * 16) + (data[i+1] >> 4) - 500) / 10.0;
        output.humidity = (256 * (data[i+1] & 0x0F) + data[i+2]) / 10.0;
		output.co2 = (data[i+3] << 8) + data[i+4];
        i+=5;

        // battery
        output.battery = data[i];

	}

  	return output;

}

function bytesToHex(bytes) {
  
	var hexArray = [];
  	for (var i = 0; i < bytes.length; i++) {
	    var hex = (bytes[i] & 0xff).toString(16).toUpperCase();
    	if (hex.length === 1) {
      		hex = '0' + hex;
    	}
    	hexArray.push(hex);
  	}
  	return hexArray.join('');

}

function decodeUplink(input) {

	bytes = input.bytes;
	fPort = input.fPort;

	return {
		data: Decoder(bytes, fPort),
		warnings: [],
		errors: []
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

