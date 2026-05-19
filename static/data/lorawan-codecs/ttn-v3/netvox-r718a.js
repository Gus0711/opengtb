// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Netvox Technology Co., Ltd
// Device       : R718A - Temperature and Humidity Sensor for Low Temperature Environment
// fPort(s)     : 6, 7
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/netvox/payload/r711_r718a_r718ab_r720a.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
//   4. (optionnel) Onglet « Downlink » → encodeDownlink est dans le même fichier
// ─────────────────────────────────────────────────────────────────────

function getCmdId(inputcmd){
  var cmdIDs = {
    1:   "ConfigReportReq",
    129: "ConfigReportRsp",
    2:   "ReadConfigReportReq",
    130: "ReadConfigReportRsp"
  };
  return cmdIDs[inputcmd];
}

function getDeviceName(dev){
  var deviceName = {
	 1: "R711(R712)",
    11: "R718A",
	19: "R718AB",
	110: "R720A",
	111: "R720B"
  };
  return deviceName[dev];
}

function getDeviceType(devName){
  if (devName == "R711(R712)")
	  return 1;
  else if (devName == "R718A")
	  return 11;
  else if (devName == "R718AB")
	  return 19;
  else if (devName == "R720A")
	  return 110;
  else if (devName == "R720B")
	  return 111;
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
		if (input.bytes[4] & 0x80)
		{
			var tmpval = (input.bytes[4]<<8 | input.bytes[5]);
			data.Temp = (0x10000 - tmpval)/100 * -1;
		}
		else
			data.Temp = (input.bytes[4]<<8 | input.bytes[5])/100;
		
		data.Humi = (input.bytes[6]<<8 | input.bytes[7])/100;
		
		if (input.bytes[1] === 0x6F)
			data.Alarm = input.bytes[8] ? 'ON' : 'OFF';

		break;
		
	case 7:
		data.Device = getDeviceName(input.bytes[1]);
		if (input.bytes[0] === 0x81)
		{
			data.Cmd = getCmdId(input.bytes[0]);
			data.Status = (input.bytes[2] === 0x00) ? 'Success' : 'Failure';
		}
		else if (input.bytes[0] === 0x82)
		{
			data.Cmd = getCmdId(input.bytes[0]);
			data.MinTime = (input.bytes[2]<<8 | input.bytes[3]);
			data.MaxTime = (input.bytes[4]<<8 | input.bytes[5]);
			data.BatteryChange = input.bytes[6]/10;
			data.TempChange = (input.bytes[7]<<8 | input.bytes[8])/100;
			data.HumiChange = (input.bytes[9]<<8 | input.bytes[10])/100;
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
	  var batteryChg = input.data.BatteryChange * 10;
	  var tempChg = input.data.TempChange * 100;
	  var humiChg = input.data.HumiChange * 100;

	  ret = ret.concat(0x01, devid, (mint >> 8), (mint & 0xFF), (maxt >> 8), (maxt & 0xFF), batteryChg, (tempChg >> 8), (tempChg & 0xFF), (humiChg >> 8), (humiChg & 0xFF));
  }
  else if (input.data.Cmd == getCmdId(0x02))
  {
	  ret = ret.concat(0x02, devid, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
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
			data.BatteryChange = input.bytes[6]/10;
			data.TempChange = (input.bytes[7]<<8 | input.bytes[8])/100;
			data.HumiChange = (input.bytes[9]<<8 | input.bytes[10])/100;
		}
		else if (input.bytes[0] === 0x02)
		{
			data.Cmd = getCmdId(input.bytes[0]);
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
