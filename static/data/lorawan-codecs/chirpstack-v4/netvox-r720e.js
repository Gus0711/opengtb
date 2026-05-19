// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Netvox Technology Co., Ltd
// Device       : R720E - Wireless TVOC Detection Sensor
// fPort(s)     : 6, 7
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/netvox/payload/r720e.js
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
function getCfgCmd(cfgcmd){
	var cfgcmdlist = {
	  1:   "ConfigReportReq",
	  129: "ConfigReportRsp",
	  2:   "ReadConfigReportReq",
	  130: "ReadConfigReportRsp",
	  3:   "ResetTVOCBaseLineReq",
	  131: "ResetTVOCBaseLineRsp"
	};
	return cfgcmdlist[cfgcmd];
  }
  
function getCmdToID(cmdtype){
	if (cmdtype == "ConfigReportReq")
		return 1;
	else if (cmdtype == "ConfigReportRsp")
		return 129;
	else if (cmdtype == "ReadConfigReportReq")
		return 2;
	else if (cmdtype == "ReadConfigReportRsp")
		return 130;
	else if (cmdtype == "ResetTVOCBaseLineReq")
		return 3;
	else if (cmdtype == "ResetTVOCBaseLineRsp")
		return 131;
}
  
function getDeviceName(dev){
	var deviceName = {
	  165: "R720E"
	};
	return deviceName[dev];
}
  
function getDeviceID(devName){
	var deviceName = {
	  "R720E": 165
	};
	return deviceName[devName];
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
		  
		  	data.Device = getDeviceName(input.bytes[1]);
			if (input.bytes[3] & 0x80)
			{
				var tmp_v = input.bytes[3] & 0x7F;
				data.Volt = (tmp_v / 10).toString() + '(low battery)';
			}
			else
				data.Volt = input.bytes[3]/10;

			data.TVOC_VOC = (input.bytes[4]<<8 | input.bytes[5]);
			if (input.bytes[6] & 0x80)
			{
				var tmpval = (input.bytes[6]<<8 | input.bytes[7]);
				data.Temp = (0x10000 - tmpval)/100 * -1;
			}
			else
				data.Temp = (input.bytes[6]<<8 | input.bytes[7])/100;

			data.Humi = (input.bytes[8]<<8 | input.bytes[9])/100;
			data.SensorUnit = (input.bytes[10] === 0x00) ? 'ppb' : 'index';

		 	break;
		  
		case 7:
			data.Cmd = getCfgCmd(input.bytes[0]);
			data.Device = getDeviceName(input.bytes[1]);
			if ((input.bytes[0] === getCmdToID("ConfigReportRsp")) || (input.bytes[0] === getCmdToID("ResetTVOCBaseLineRsp")))
			{
				data.Status = (input.bytes[2] === 0x00) ? 'Success' : 'Failure';
			}
			else if (input.bytes[0] === getCmdToID("ReadConfigReportRsp"))
			{
				data.MinTime = (input.bytes[2]<<8 | input.bytes[3]);
				data.MaxTime = (input.bytes[4]<<8 | input.bytes[5]);
				data.BatteryChange = input.bytes[6]/10;
				data.TVOC_VOCChange = (input.bytes[7]<<8 | input.bytes[8]);
				data.TempChange = input.bytes[9]/10;
				data.HumiChange = input.bytes[10]/10;
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
	var getCmdID;
		
	getCmdID = getCmdToID(input.data.Cmd);
	devid = getDeviceID(input.data.Device);
  
	if (input.data.Cmd == "ConfigReportReq")
	{
		var mint = input.data.MinTime;
		var maxt = input.data.MaxTime;
		var batteryChg = input.data.BatteryChange * 10;
		var tvocChg = input.data.TVOC_VOCChange;
		var tempChg = input.data.TempChange * 10;
		var humiChg = input.data.HumiChange * 10;
		
		ret = ret.concat(getCmdID, devid, (mint >> 8), (mint & 0xFF), (maxt >> 8), (maxt & 0xFF), batteryChg, (tvocChg >> 8), (tvocChg & 0xFF), tempChg, humiChg);
	}
	else if ((input.data.Cmd == "ReadConfigReportReq") || (input.data.Cmd == "ResetTVOCBaseLineReq"))
	{
		ret = ret.concat(getCmdID, devid, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
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
			data.Cmd = getCfgCmd(input.bytes[0]);
			data.Device = getDeviceName(input.bytes[1]);
			if (input.bytes[0] === getCmdToID("ConfigReportReq"))
			{
				data.MinTime = (input.bytes[2]<<8 | input.bytes[3]);
				data.MaxTime = (input.bytes[4]<<8 | input.bytes[5]);
				data.BatteryChange = input.bytes[6]/10;
				data.TVOC_VOCChange = (input.bytes[7]<<8 | input.bytes[8]);
				data.TempChange = input.bytes[9]/10;
				data.HumiChange = input.bytes[10]/10;
			}
	
			break;
			
		default:
			return {
				rrors: ['invalid FPort'],
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

