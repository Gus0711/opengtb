// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Plenom A/S
// Device       : kuando Busylight IoT Omega LoRaWAN
// fPort(s)     : 15
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/plenom/busylight.js
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
  if (input.bytes.length == 24)
  {
  return {
    data: {
      RSSI: byteArrayToLong(input.bytes, 0),
      SNR: byteArrayToLong(input.bytes, 4),
      messages_received: byteArrayToLong(input.bytes, 8),
      messages_send: byteArrayToLong(input.bytes, 12),
      lastcolor_red: input.bytes[16],
      lastcolor_blue: input.bytes[17],
      lastcolor_green: input.bytes[18],
      lastcolor_ontime: input.bytes[19],
      lastcolor_offtime: input.bytes[20],
      sw_rev: input.bytes[21],
      hw_rev: input.bytes[22],
      adr_state: input.bytes[23]
    },
    warnings: [],
    errors: []
  };
  }
  else if (input.bytes.length == 25)
  {
  return {
    data: {
      RSSI: byteArrayToLong(input.bytes, 0),
      SNR: byteArrayToLong(input.bytes, 4),
      messages_received: byteArrayToLong(input.bytes, 8),
      messages_send: byteArrayToLong(input.bytes, 12),
      lastcolor_red: input.bytes[16],
      lastcolor_blue: input.bytes[17],
      lastcolor_green: input.bytes[18],
      lastcolor_ontime: input.bytes[19],
      lastcolor_offtime: input.bytes[20],
      sw_rev: input.bytes[21],
      hw_rev: input.bytes[22],
      adr_state: input.bytes[23],
      high_brightness_mode: input.bytes[24]
    },
    warnings: [],
    errors: []
  };
  }
 else if (input.bytes.length == 19) 
  { 
  return { 
    data: { 
      messages_received: byteArrayToLong(input.bytes, 0), 
      messages_send: byteArrayToLong(input.bytes, 4), 
      lastcolor_red: input.bytes[8], 
      lastcolor_blue: input.bytes[9], 
      lastcolor_green: input.bytes[10], 
      lastcolor_ontime: input.bytes[11], 
      lastcolor_offtime: input.bytes[1], 
      sw_rev: input.bytes[13], 
      hw_rev: input.bytes[14], 
      sound_no: input.bytes[15], 
      sound_volume: input.bytes[16], 
      sound_duration:input.bytes[17], 
      high_brightness_mode: input.bytes[18] 
    }, 
    warnings: [], 
    errors: [] 
  }; 
  } 
else if (input.bytes.length == 20) 
  { 
  return { 
    data: { 
      messages_received: byteArrayToLong(input.bytes, 0), 
      messages_send: byteArrayToLong(input.bytes, 4), 
      lastcolor_red: input.bytes[8], 
      lastcolor_blue: input.bytes[9], 
      lastcolor_green: input.bytes[10], 
      lastcolor_ontime: input.bytes[11], 
      lastcolor_offtime: input.bytes[1], 
      sw_rev: input.bytes[13], 
      hw_rev: input.bytes[14], 
      sound_no: input.bytes[15], 
      sound_volume: input.bytes[16], 
      sound_duration:input.bytes[17], 
      high_brightness_mode: input.bytes[18],
      controlbyte: input.bytes[19]
    }, 
    warnings: [], 
    errors: [] 
  }; 
  } 
  else if (input.bytes.length == 10)
  {
return {
    data: {
      messages_send: byteArrayToLong(input.bytes, 0),
      lastcolor_red: input.bytes[4],
      lastcolor_blue: input.bytes[5],
      lastcolor_green: input.bytes[6],
      lastcolor_ontime: input.bytes[7],
      lastcolor_offtime: input.bytes[8],
      high_brightness_mode: input.bytes[9]
    },
    warnings: [],
    errors: []
  };    
  }
  else
  {
    return {data: {
      bytes: input.bytes,
      },
    warnings: [],
    errors: []
    }
  }
}


byteArrayToLong = function(/*byte[]*/byteArray, /*int*/from) {
    return byteArray[from] | (byteArray[from+1] << 8) | (byteArray[from+2] << 16) | (byteArray[from+3] << 24);
};

function encodeDownlink(input) {
  
  return {
    bytes:[(input.data.red & 0x00FF), (input.data.blue & 0x00FF), (input.data.green & 0x00FF), (input.data.ontime & 0x00FF), 
    (input.data.offtime & 0x00FF)],
    fPort: 15,
    warnings: [],
    errors: []
  };
}

function decodeDownlink(input) {
if (input.bytes.length == 5)
  {  
  return {
    
    data: {
      red: input.bytes[0],
      green: input.bytes[2],
      blue: input.bytes[1],
      ontime: input.bytes[3],
      offtime: input.bytes[4]
    },
    warnings: [],
    errors: []
  }
  }
else if (input.bytes.length == 6)
  {  
  return {
    
    data: {
      red: input.bytes[0],
      green: input.bytes[2],
      blue: input.bytes[1],
      ontime: input.bytes[3],
      offtime: input.bytes[4],
      immediate_uplink: input.bytes[5]
    },
    warnings: [],
    errors: []
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
