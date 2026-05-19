// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Netvox Technology Co., Ltd
// Device       : R720G - Wireless GPS Tracker with tilt angle
// fPort(s)     : 6, 7
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/netvox/payload/r720g.js
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
function getCmdId(inputcmd){
  var cmdIDs = {
    0x01: "ConfigReportReq",
    0x81: "ConfigReportRsp",
    0x02: "ReadConfigReportReq",
    0x82: "ReadConfigReportRsp",
    0x03: "SetActiveThresholdReq",
    0x83: "SetActiveThresholdRsp",
    0x04: "GetActiveThresholdReq",
    0x84: "GetActiveThresholdRsp"
  };
  return cmdIDs[inputcmd];
}

function getDeviceName(dev){
  var deviceName = {
    0xB5: "R720G"
  };
  return deviceName[dev];
}

function getDeviceType(devName){
  if (devName == "R720G")
	  return 0xB5;
}

function padLeft(str, len) {
    str = '' + str;
    if (str.length >= len) {
        return str;
    } else {
        return padLeft("0" + str, len);
    }
}

function decodeUplink(input) {
  var data = {};
  switch (input.fPort) {
    case 6:
		if (input.bytes[2] === 0x00)
		{
			data.Device = getDeviceName(input.bytes[1]);
			data.SWver =  input.bytes[3]/10;
			data.HWver =  input.bytes[4];
			data.Datecode = padLeft(input.bytes[5].toString(16), 2) + padLeft(input.bytes[6].toString(16), 2) + padLeft(input.bytes[7].toString(16), 2) + padLeft(input.bytes[8].toString(16), 2);
			
			return {
				data: data,
			};
		}

		if (input.bytes[3] & 0x80)
		{
			var tmp_v = input.bytes[3] & 0x7F;
			data.Volt = (tmp_v / 10).toString() + '(low battery)';
		}
		else
			data.Volt = input.bytes[3]/10;

		data.Device = getDeviceName(input.bytes[1]);
		if (input.bytes[2] === 0x01)
		{
			if (input.bytes[4] == 0xFF && input.bytes[5] == 0xFF && input.bytes[6] == 0xFF && input.bytes[7] == 0xFF)
				data.Latitude = "0xFFFFFFFF";
			else
				data.Latitude = (input.bytes[4]<<24 | input.bytes[5]<<16 | input.bytes[6]<<8 | input.bytes[7])/1000000;
				
			if (input.bytes[8] & 0x80)
				data.AngleX = (0x100 - input.bytes[8]) * -1;
			else
				data.AngleX = input.bytes[8];
				
			if (input.bytes[9] & 0x80)
				data.AngleY = (0x100 - input.bytes[9]) * -1;
			else
				data.AngleY = input.bytes[9];
				
			if (input.bytes[10] & 0x80)
				data.AngleZ = (0x100 - input.bytes[10]) * -1;
			else
				data.AngleZ = input.bytes[10];	 
		}
		else if (input.bytes[2] === 0x02)
		{
			if (input.bytes[4] == 0xFF && input.bytes[5] == 0xFF && input.bytes[6] == 0xFF && input.bytes[7] == 0xFF)
				data.Longitude = "0xFFFFFFFF";
			else
				data.Longitude = (input.bytes[4]<<24 | input.bytes[5]<<16 | input.bytes[6]<<8 | input.bytes[7])/1000000;
				
			data.HDop = input.bytes[8];
			
			if (input.bytes[9] == 0xFF && input.bytes[10] == 0xFF)
				data.AltitudeGPS = "0xFFFF";
			else if (input.bytes[9] & 0x80)
			{
				var tmpalti = (input.bytes[9]<<8 | input.bytes[10]);
				data.AltitudeGPS = (0x10000 - tmpalti) * -1;
			}
			else
				data.AltitudeGPS = (input.bytes[9]<<8 | input.bytes[10]);
		}

		break;
		
	case 7:
		data.Device = getDeviceName(input.bytes[1]);
		if (input.bytes[0] === 0x81 || input.bytes[0] === 0x83)
		{
			data.Cmd = getCmdId(input.bytes[0]);
			data.Status = (input.bytes[2] === 0x00) ? 'Success' : 'Failure';
		}
		else if (input.bytes[0] === 0x82)
		{
			data.Cmd = getCmdId(input.bytes[0]);
			data.MinTime = (input.bytes[2]<<8 | input.bytes[3]);
			data.MaxTime = (input.bytes[4]<<8 | input.bytes[5]);			
		}
		else if (input.bytes[0] === 0x84)
		{
			data.Cmd = getCmdId(input.bytes[0]);
			data.ActiveThreshold = input.bytes[2];			
		}
		
		break;

	default:
      return {
        errors: ['unknown FPort'],
      };
	  
    }
          
	  
	 return {
		data: data,
	};
 }
  
function encodeDownlink(input) {
  var ret = [];
  var devid;
 
  devid = getDeviceType(input.data.Device);

  if (input.data.Cmd == getCmdId(0x01))
  {
	  var mint = input.data.MinTime;
	  var maxt = input.data.MaxTime;

	  ret = ret.concat(0x01, devid, (mint >> 8), (mint & 0xFF), (maxt >> 8), (maxt & 0xFF), 0x00, 0x00, 0x00, 0x00, 0x00);
  }
  else if (input.data.Cmd == getCmdId(0x02))
  {
	  ret = ret.concat(0x02, devid, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
  }  
  else if (input.data.Cmd == getCmdId(0x03))
  {
  	  var th = input.data.ActiveThreshold;
  	  
	  ret = ret.concat(0x03, devid, th, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
  }
  else if (input.data.Cmd == getCmdId(0x04))
  {
	  ret = ret.concat(0x04, devid, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
  } 
  return {
    fPort: 7,
    bytes: ret
  };
}  
  
function decodeDownlink(input) {
  var data = {};
  switch (input.fPort) {
    case 7:
		data.Device = getDeviceName(input.bytes[1]);
		if (input.bytes[0] === 0x01)
		{
			data.Cmd = getCmdId(input.bytes[0]);
			data.MinTime = (input.bytes[2]<<8 | input.bytes[3]);
			data.MaxTime = (input.bytes[4]<<8 | input.bytes[5]);
		}
		else if (input.bytes[0] === 0x02 || input.bytes[0] === 0x04)
		{
			data.Cmd = getCmdId(input.bytes[0]);
		}
		else if (input.bytes[0] === 0x03)
		{
			data.Cmd = getCmdId(input.bytes[0]);
			data.ActiveThreshold = input.bytes[2];
		}
		break;
		
    default:
      return {
        errors: ['invalid FPort'],
      };
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

