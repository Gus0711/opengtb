// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Netvox Technology Co., Ltd
// Device       : R900A03 - Wireless Water leak Sensor
// fPort(s)     : 22, 23
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/netvox/payload/r900a03.js
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
function getCfgCmd(cfgcmd){
  var cfgcmdlist = {
    1:   "ConfigReportReq",
    129: "ConfigReportRsp",
    2:   "ReadConfigReportReq",
    130: "ReadConfigReportRsp",
	3:   "SetShockSensorSensitivityReq",
    131: "SetShockSensorSensitivityRsp",
    4:   "GetShockSensorSensitivityReq",
    132: "GetShockSensorSensitivityRsp",
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
  else if (cmdtype == "SetShockSensorSensitivityReq")
	  return 3;
  else if (cmdtype == "SetShockSensorSensitivityRsp")
	  return 131;
  else if (cmdtype == "GetShockSensorSensitivityReq")
	  return 4;
  else if (cmdtype == "GetShockSensorSensitivityRsp")
	  return 132;
}

function getDeviceName(dev){
  var deviceName = {
	267: "R900A03",
  };
  return deviceName[dev];
}

function getDeviceID(devName){
  var deviceName = {
	"R900A03": 267,
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
    case 22:
		if (input.bytes[3] === 0x00)
		{
			data.Device = getDeviceName((input.bytes[1]<<8 | input.bytes[2]));
			data.SWver =  input.bytes[4]/10;
			data.HWver =  input.bytes[5];
			data.Datecode = padLeft(input.bytes[6].toString(16), 2) + padLeft(input.bytes[7].toString(16), 2) + padLeft(input.bytes[8].toString(16), 2) + padLeft(input.bytes[9].toString(16), 2);
			
			return {
				data: data,
			};
		}
		
		data.Device = getDeviceName((input.bytes[1]<<8 | input.bytes[2]));
		if (input.bytes[4] & 0x80)
		{
			var tmp_v = input.bytes[4] & 0x7F;
			data.Volt = (tmp_v / 10).toString() + '(low battery)';
		}
		else
			data.Volt = input.bytes[4]/10;

		data.WaterLeak = (input.bytes[5] === 0x00) ? 'noLeak' : 'Leak';
		data.ShockTamperAlarm = (input.bytes[6] === 0x00) ? 'NoAlarm' : 'Alarm';

		break;
		
	case 23:
		data.Cmd = getCfgCmd(input.bytes[0]);
		data.Device = getDeviceName((input.bytes[1]<<8 | input.bytes[2]));
		if (input.bytes[0] === getCmdToID("ConfigReportRsp")
		|| input.bytes[0] === getCmdToID("SetShockSensorSensitivityRsp"))
		{
			data.Status = (input.bytes[3] === 0x00) ? 'Success' : 'Failure';
		}
		else if (input.bytes[0] === getCmdToID("ReadConfigReportRsp") )
		{
			data.MinTime = (input.bytes[3]<<8 | input.bytes[4]);
			data.MaxTime = (input.bytes[5]<<8 | input.bytes[6]);
		}
		else if (input.bytes[0] === getCmdToID("GetShockSensorSensitivityRsp") )
		{
			data.ShockSensorSensitivity = input.bytes[3];
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

  if (input.data.Cmd == "ConfigReportReq" )
  {
	  var mint = input.data.MinTime;
	  var maxt = input.data.MaxTime;

	  ret = ret.concat(getCmdID, (devid>>8), (devid & 0xFF), (mint >> 8), (mint & 0xFF), (maxt >> 8), (maxt & 0xFF));
  }
  else if (input.data.Cmd == "ReadConfigReportReq" 
  	|| input.data.Cmd == "GetShockSensorSensitivityReq" )
  {
	  ret = ret.concat(getCmdID, (devid>>8), (devid & 0xFF));
  }
  else if (input.data.Cmd == "SetShockSensorSensitivityReq")
  {
	  var sSensor = input.data.ShockSensorSensitivity;
	  ret = ret.concat(getCmdID, (devid>>8), (devid & 0xFF),sSensor);
  }  

  return {
    fPort: 23,
    bytes: ret
  };
}  
  
function decodeDownlink(input) {
  var data = {};
  switch (input.fPort) {
    case 23:
		data.Cmd = getCfgCmd(input.bytes[0]);
		data.Device = getDeviceName((input.bytes[1]<<8 | input.bytes[2]));
		if (input.bytes[0] === getCmdToID("ConfigReportReq"))
		{
			data.MinTime = (input.bytes[3]<<8 | input.bytes[4]);
			data.MaxTime = (input.bytes[5]<<8 | input.bytes[6]);
		}
		else if (input.bytes[0] === getCmdToID("SetShockSensorSensitivityReq"))
		{
			data.ShockSensorSensitivity = input.bytes[3];
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
