// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Arwin Technology Limited
// Device       : LRS2M001-4P3P - Power Monitoring Sensor
// fPort(s)     : 8, 10, 16, 50, 55, 57, 60
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/arwin-technology/lrs2m001-4xxx.js
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
var lrs2m001_meter_events = ['heartbeat/button', 'bakcup power', 'ph_C_under_V', 'ph_C_over_V', 'ph_B_under_V', 'ph_B_over_V', 'ph_A_under_V', 'ph_A_over_V', 'backup_batt_low'];
var lrs2m001_phase_events = ['over_current','heartbeat/button'];
var decoded;

function hex2dec(hex) {
  var dec = hex&0x3fffff;
  if (dec & 0x200000)
    dec = -(0x400000-dec);
  return dec;
}

function decodePhaseData(input, channel, phase) {
  var evt_amp = input.bytes[1]<<8|input.bytes[2];
  var pow_pf = input.bytes[3]<<24|input.bytes[4]<<16|input.bytes[5]<<8|input.bytes[6];
  var evt="";
  for (let i=0; i<2; i++) {
    if ((0x01<<i)&(evt_amp>>14)) 
      if (evt==="")
        evt=lrs2m001_phase_events[i];
      else
        evt=evt+","+lrs2m001_phase_events[i];
  }
  if (input.bytes[0] === 0x0a) { 
    return {
      data: {
        channel: channel,
        phase: phase,
        event: evt,
        current: (evt_amp&0x3fff)/10,
        active_pow: hex2dec(pow_pf>>10)/10,
        power_factor: (pow_pf&0x03ff)/1000,
        active_energy: (input.bytes[7]<<24|input.bytes[8]<<16|input.bytes[9]<<8|input.bytes[10])/10
      }
    }
  }
  else {
    return {
      error: ['unknown packet type']
    };
  }
}

function decodeUplink(input) {
  switch (input.fPort) {
    case 10: // meter data
      var freq_evt = input.bytes[7]<<16|input.bytes[8]<<8|input.bytes[9];      
      var evt="";
      for (let i=0; i<10; i++) {
        if ((0x01<<i)&freq_evt) 
          if (evt==="")
            evt=lrs2m001_meter_events[i];
          else
            evt=evt+","+lrs2m001_meter_events[i];
      }
      return {
        data: {
              event: evt,
              phase_A_V: (input.bytes[1]<<8|input.bytes[2])/10,
              phase_B_V: (input.bytes[3]<<8|input.bytes[4])/10,
              phase_C_V: (input.bytes[5]<<8|input.bytes[6])/10,
              freq: freq_evt>>10,
              backup_batt: input.bytes[10],
            },
        };
    case 50:
      decoded = decodePhaseData(input, 1, 'A');
      return decoded;
    case 51:
      decoded = decodePhaseData(input, 1, 'B');
      return decoded;
    case 52:
      decoded = decodePhaseData(input, 1, 'C');
      return decoded;
    case 53:
      decoded = decodePhaseData(input, 2, 'A');
      return decoded;
    case 54:
      decoded = decodePhaseData(input, 2, 'B');
      return decoded;
    case 55:
      decoded = decodePhaseData(input, 2, 'C');
      return decoded;
    case 56:
      decoded = decodePhaseData(input, 3, 'A');
      return decoded;
    case 57:
      decoded = decodePhaseData(input, 3, 'B');
      return decoded;
    case 58:
      decoded = decodePhaseData(input, 3, 'C');
      return decoded;
    case 59:
      decoded = decodePhaseData(input, 4, 'A');
      return decoded;
    case 60:
      decoded = decodePhaseData(input, 4, 'B');
      return decoded;
    case 61:
      decoded = decodePhaseData(input, 4, 'C');
      return decoded;
    case 8: // version
      var ver = input.bytes[0]+"."+("00"+input.bytes[1]).slice(-2)+"."+("000"+(input.bytes[2]<<8|input.bytes[3])).slice(-3);    
      return {
        data: {
          firmwareVersion: ver,
        }
      };
    case 16: // device settings
      if (input.bytes[0] === 0x0a) {    
        return {
          data: {
            dataUploadInterval: input.bytes[1]<<8|input.bytes[2],
            underVoltageLimit: input.bytes[3]<<8|input.bytes[4],
            overVoltageLimit: input.bytes[5]<<8|input.bytes[6],
            overCurrentLimit: input.bytes[7]<<8|input.bytes[8],
          }
        };  
      }
      else {
        return {
          error: ['unknown packet type']
        };
      }      
      break;
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}

function encodeDownlink(input) {
  var payload = [];

  if (input.data.cmd === 'getFirmwareVersion') {
    return {
      fPort: 20,
      bytes: [0]
    };
  }
  else if (input.data.cmd === 'getDeviceSettings') {
    return {
      fPort: 21,
      bytes: [0]
    };
  }
  else if (input.data.cmd === 'setDeviceSettings') {
    var ult = input.data.dataUploadInterval;
    var uvl = input.data.underVoltageLimit;
    var ovl = input.data.overVoltageLimit;
    var ocl = input.data.overCurrentLimit;
    var dack = 1;
    return {
      fPort: 22,
      bytes: payload.concat(ult>>8,ult&0xff,uvl>>8,uvl&0xff,ovl>>8,ovl&0xff,ocl>>8,ocl&0xff,dack)
    };
  }
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

