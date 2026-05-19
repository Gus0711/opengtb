// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Netvox Technology Co., Ltd
// Device       : R831C - Wireless Multifunctional Control Box
// fPort(s)     : 6, 7
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/netvox/payload/r831.js
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
	  3:   "SetSwitchTypeReq",
	  131: "SetSwitchTypeRsp",
	  4:   "GetSwitchTypeReq",
	  132: "GetSwitchTypeRsp",
	  144: "Off",
	  145: "On",
	  146: "Toggle",
	  148: "ReadCurrentStatus",
	  149: "Stop"
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
	else if (cmdtype == "SetSwitchTypeReq")
		return 3;
	else if (cmdtype == "SetSwitchTypeRsp")
		return 131;
	else if (cmdtype == "GetSwitchTypeReq")
		return 4;
	else if (cmdtype == "GetSwitchTypeRsp")
		return 132;
	else if (cmdtype == "Off")
		return 144;
	else if (cmdtype == "On")
		return 145;
	else if (cmdtype == "Toggle")
		return 146;
	else if (cmdtype == "ReadCurrentStatus")
		return 148;
	else if (cmdtype == "Stop")
		return 149;
}
  
function getDeviceName(dev){
	var deviceName = {
	  178: "R831A",
	  179: "R831B",
	  173: "R831C",
	  176: "R831D"
	};
	return deviceName[dev];
}
  
function getDeviceID(devName){
	var deviceName = {
	  "R831A": 178,
	  "R831B": 179,
	  "R831C": 173,
	  "R831D": 176
	};
	return deviceName[devName];
}

function getType(i){
	var type = {
	  0: "Toggle",
	  1: "Momentary"
	};
	return type[i];
}

function getTypeID(i){
	var id = {
	  "Toggle": 	0,
	  "Momentary": 	1
	};
	return id[i];
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
			
			if ((input.bytes[1] === 0xB2) || (input.bytes[1] === 0xB3))
			{			
				data.MotorStatus = (input.bytes[3] === 0x00) ? 'OFF' : 'ON';
			}
			else if ((input.bytes[1] === 0xAD) || (input.bytes[1] === 0xB0))
			{
				data.Relay_1 = (input.bytes[3] === 0x00) ? 'OFF' : 'ON';
				data.Relay_2 = (input.bytes[4] === 0x00) ? 'OFF' : 'ON';
				data.Relay_3 = (input.bytes[5] === 0x00) ? 'OFF' : 'ON';
				if (input.bytes[1] === 0xB0)
				{
					data.Input_1 = (input.bytes[6] === 0x00) ? 'OFF' : 'ON';
					data.Input_2 = (input.bytes[7] === 0x00) ? 'OFF' : 'ON';
					data.Input_3 = (input.bytes[8] === 0x00) ? 'OFF' : 'ON';
				}
			}

		 	break;
		  
		case 7:
			data.Cmd = getCfgCmd(input.bytes[0]);
			data.Device = getDeviceName(input.bytes[1]);
			if ((input.bytes[0] === getCmdToID("ConfigReportRsp")) || (input.bytes[0] === getCmdToID("SetSwitchTypeRsp")))
			{
				data.Status = (input.bytes[2] === 0x00) ? 'Success' : 'Failure';
			}
			else if (input.bytes[0] === getCmdToID("ReadConfigReportRsp"))
			{
				data.MinTime = (input.bytes[2]<<8 | input.bytes[3]);
				data.MaxTime = (input.bytes[4]<<8 | input.bytes[5]);
			}
			else if (input.bytes[0] === getCmdToID("GetSwitchTypeRsp"))
			{
				data.SwitchType = (input.bytes[2] === 0x00) ? 'Toggle' : 'Momentary';
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

		ret = ret.concat(getCmdID, devid, (mint >> 8), (mint & 0xFF), (maxt >> 8), (maxt & 0xFF), 0x00, 0x00, 0x00, 0x00, 0x00);
	}
	else if ((input.data.Cmd == "ReadConfigReportReq") || (input.data.Cmd == "GetSwitchTypeReq") || (input.data.Cmd == "ReadCurrentStatus") || (input.data.Cmd == "Stop"))
	{
		ret = ret.concat(getCmdID, devid, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
	}  
	else if (input.data.Cmd == "SetSwitchTypeReq")
	{
		var type = getTypeID(input.data.SwitchType);
		
		ret = ret.concat(getCmdID, devid, type, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
	}
	else if (input.data.Cmd == "Off")
	{
		if ((devid === 0xAD) || (devid === 0xB0))
		{
			var ch = input.data.Channel;
			ret = ret.concat(getCmdID, devid, ch, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
		}
		else
			ret = ret.concat(getCmdID, devid, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
	}
	else if (input.data.Cmd == "On")
	{
		if ((devid === 0xAD) || (devid === 0xB0))
		{
			var ch = input.data.Channel;
			ret = ret.concat(getCmdID, devid, ch, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
		}
		else
			ret = ret.concat(getCmdID, devid, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
	}
	else if (input.data.Cmd == "Toggle")
	{
		if ((devid === 0xAD) || (devid === 0xB0))
		{
			var ch = input.data.Channel;
			ret = ret.concat(getCmdID, devid, ch, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
		}
		else
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
			}
			else if (input.bytes[0] == getCmdToID("SetSwitchTypeReq"))
			{
				data.SwitchType = getType(input.bytes[2]);
			}
			else if (input.bytes[0] == getCmdToID("Off"))
			{
				if ((input.bytes[1] === 0xAD) || (input.bytes[1] === 0xB0))
					data.Channel = padLeft(input.bytes[2].toString(2), 8);
			}
			else if (input.bytes[0] == getCmdToID("On"))
			{
				if ((input.bytes[1] === 0xAD) || (input.bytes[1] === 0xB0))
					data.Channel = padLeft(input.bytes[2].toString(2), 8);
			}
			else if (input.bytes[0] == getCmdToID("Toggle"))
			{
				if ((input.bytes[1] === 0xAD) || (input.bytes[1] === 0xB0))
					data.Channel = padLeft(input.bytes[2].toString(2), 8);
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

