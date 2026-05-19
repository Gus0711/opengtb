// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Xignal
// Device       : Mouse Trap
// fPort(s)     : 1
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/xignal/mousetrap.js
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

  switch (input.fPort) {
    case 1:

     if (input.bytes[4] === 0x00){
       data.trapState = 'failed';
     } else if (input.bytes[4] === 0x01){
       data.trapState = 'normal';
     } else if (input.bytes[4] === 0x02){
      data.trapState = 'trapped';
    } else if (input.bytes[4] === 0x03){
      data.trapState = 'abnormal';
    } else if (input.bytes[4] === 0x04){
      data.trapState = 'moved';
    } else if (input.bytes[4] === 0x07){
      data.trapState = 'error';
    } else if (input.bytes[4] === 0x08){
      data.trapState = 'wakeup';
    }
    data.msgId = input.bytes[0];
    data.battVoltage = input.bytes[1]/10;
    data.temperature = (input.bytes[2] << 8 | input.bytes[3]) / 100;
    data.id = input.bytes[10] << 8 | input.bytes[5];
       
        
    
    
      return {
        data : data,
      };
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
