// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Beijing COTX Networks Technologies Co. Ltd.
// Device       : Petfon LoRa Tracker
// fPort(s)     : non spécifié dans le profil
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/cotx/cotxpetfon.js
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

  let data = Bytes2HexString(input.bytes);
  let decoded = {};
  if(input.bytes[0] == 241){
    decoded.type = input.bytes[0];
    if(input.bytes[6] & 0x80){
      decoded.longitude = (parseInt(data.substr(12,8),16) - parseInt('100000000',16))/1000000;
    }else{
      decoded.longitude = parseInt(data.substr(12,8),16)/1000000;
    }
    if(input.bytes[10] & 0x80){
      decoded.latitude = (parseInt(data.substr(20,8),16) - parseInt('100000000',16))/1000000;
    }else{
      decoded.latitude = parseInt(data.substr(20,8),16)/1000000;
    }
    decoded.paws = parseInt(data.substr(32,8),16);
    let run_time_bit = parseInt(data.substr(40,8),16).toString(2);
    decoded.battery = parseInt(run_time_bit.slice(-21,-14),2);
    decoded.working = parseInt(run_time_bit.slice(-10),2);

  }else if(input.bytes[0] == 240){
    decoded.type = input.bytes[0];
    decoded.paws = parseInt(data.substr(12,8),16);
    let run_time_bit = parseInt(data.substr(40,8),16).toString(2);
    decoded.battery = parseInt(run_time_bit.slice(-21,-14),2);
    decoded.working = parseInt(run_time_bit.slice(-10),2);
  }else if(input.bytes[0] == 242){
    decoded.type = input.bytes[0];
    decoded.paws = parseInt(data.substr(70,8),16);
    let run_time_bit = parseInt(data.substr(40,8),16).toString(2);
    decoded.battery = parseInt(run_time_bit.slice(-21,-14),2);
    decoded.working = parseInt(run_time_bit.slice(-10),2);
  }

  return {
    data: {
      bytes: decoded
    },
    warnings: [],
    errors: []
  };
}

function Bytes2HexString(arrBytes) {
  var str = "";
  for (var i = 0; i < arrBytes.length; i++) {
    var tmp;
    var num=arrBytes[i];
    if (num < 0) {
      tmp =(255+num+1).toString(16);
    } else {
      tmp = num.toString(16);
    }
    if (tmp.length == 1) {
      tmp = "0" + tmp;
    }
    str += tmp;
  }
  return str;
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

