// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : SmartRural
// Device       : Grain Probe
// fPort(s)     : 2, 42
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/smartrural/grain-probe.js
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

function bytes2float(byte0, byte1, byte2, byte3) {
    var bits = (byte0 << 24) | (byte1 << 16) | (byte2 << 8) | (byte3);
    var sign = ((bits >>> 31) === 0) ? 1.0 : -1.0;
    var e = ((bits >>> 23) & 0xff);
    var m = (e === 0) ? (bits & 0x7fffff) << 1 : (bits & 0x7fffff) | 0x800000;
    var f = sign * m * Math.pow(2, e - 150);
    return f;
}
function decodeUplink(input) {
  var port = input.fPort;
  var bytes = input.bytes;
  var poll_message_status=(bytes[2]&0x40)>>6;
  var data = {};
  switch (input.fPort) {
    case 2:

  if(poll_message_status===0)
  {
  data.Ext= bytes[2]&0x0F;
  data.BatV= ((bytes[0]<<8 | bytes[1]) & 0x3FFF)/1000;

  if(data.Ext==0x01)
  {
    data.Temp_Channel1=parseFloat(((bytes[3]<<24>>16 | bytes[4])/100).toFixed(2));
    data.Temp_Channel2=parseFloat(((bytes[5]<<24>>16 | bytes[6])/100).toFixed(2));
  }
  else if(data.Ext==0x02)
  {
    data.Temp_Channel1=parseFloat(((bytes[3]<<24>>16 | bytes[4])/10).toFixed(1));
    data.Temp_Channel2=parseFloat(((bytes[5]<<24>>16 | bytes[6])/10).toFixed(1));
  }
  else if(data.Ext==0x03)
  {
    data.Res_Channel1=parseFloat(((bytes[3]<<8 | bytes[4])/100).toFixed(2));
    data.Res_Channel2=parseFloat(((bytes[5]<<8 | bytes[6])/100).toFixed(2));
  }

  data.Systimestamp=(bytes[7]<<24 | bytes[8]<<16 | bytes[9]<<8 | bytes[10] );
  }

    return {
		data:{
			"temperatures": [data.Temp_Channel1,data.Temp_Channel2],
			"Systimestamp": data.Systimestamp,
			"Ext": data.Ext,
			"battery": data.BatV,
			"debug": {
						bytes: input.bytes,
						warnings: [],
						errors: []
					}
		}
	};
      default:
   return {
     errors: ["unknown FPort"]
   }
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

