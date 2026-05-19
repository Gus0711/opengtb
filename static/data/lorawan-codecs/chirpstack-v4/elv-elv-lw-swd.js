// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : ELV Elektronik AG
// Device       : LoRaWAN® water sensor
// fPort(s)     : 10
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/elv/elv-lw-swd.js
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
/*
* ELV-LW-SWD Payload Parser
*
* Version: V1.0.4
*
* */

function decodeUplink(input)
{
  var data = input.bytes;
  var valid = true;

  if (typeof Decoder === "function")
  {
    data = Decoder(data, input.fPort);
  }

  if (typeof Converter === "function")
  {
    data = Converter(data, input.fPort);
  }

  if (typeof Validator === "function")
  {
    valid = Validator(data, input.fPort);
  }

  if (valid) 
  {
    return{
      data: data
    };
  } 
  else 
  {
    return{
     data: {},
     errors: ["Invalid data received"]
    };
  }
}
 
var tx_reason = ["Reserved", "Join Button Pressed", "Cyclic Timer", "Settings", "Joined", "Tilt", "Dryness",  
"Moisture", "Water",];
var frame_type = ["Device_Info", "Device_State", "Sensor_Data", "Config_Data"];
var device_modes = ["Dryness", "Moisture", "Water", "Tilt"];

/*
* @brief   Receives the bytes transmitted from a device of the ELV-LW-OMO
* @param   bytes:  Array with the data stream
* @param   port:   Used TTN/TTS data port
* @return  Decoded data from a device of the ELV-LW-SWD
* */
function Decoder(bytes, port)
{
  var decoded = {};   // Container with the decoded output

  if (port === 10)
  {
    // The default port for app data
    // Minimum 5 Bytes for Header

    // Collecting header data
    decoded.Supply_Voltage = parseFloat((1 + (bytes[0] >> 6)) + (bytes[0] & 0x3F)*0.02);
    decoded.Frame_Type = frame_type[(bytes[1])]; //Frametype encodes what Kind of Payload is being send
    decoded.TX_Reason = tx_reason[(bytes[2])];

    //Write every reason for sending correspondig to bit n
    switch (decoded.Frame_Type)
    {
      case "Device_Info":
      {
        var bl_version_major = bytes[3];
        var bl_version_minor = bytes[4];
        var bl_version_patch = bytes[5];

        decoded.Bootloader_Version = `${bl_version_major}.${bl_version_minor}.${bl_version_patch}`; //Build version-String from 3 previous values

        var fw_version_major = bytes[6];
        var fw_version_minor = bytes[7];
        var fw_version_patch = bytes[8];

        decoded.Firmware_Version = `${fw_version_major}.${fw_version_minor}.${fw_version_patch}`;//Build version-String from 3 previous values

        decoded.Hw_Revision = bytes[9] << 8 | bytes[10]; //Hardware version is encoded as 16-Bit int
        break;
      }
      
      case "Device_State":
      {
        decoded.Error_Msg = bytes[3];
        
        decoded.Dryness = !!(bytes[4] & 0x1);
        decoded.Moisture = !!(bytes[4] & 0x2);
        decoded.Water = !!(bytes[4] & 0x4);
        
        decoded.Tilt_Angle = bytes[5];
        
        decoded.Activation_count = (bytes[6] << 8 | bytes[7]);
        break;
      }
      
      case "Sensor_Data":
      {
        decoded.Error_Msg = bytes[3];
        
        decoded.Dry = !!(bytes[4] & 0x1);
        decoded.Moisture = !!(bytes[4] & 0x2);
        decoded.Water = !!(bytes[4] & 0x4);

        decoded.Tilt_Angle = bytes[5];
        break;
      }
      
      case "Config_Data":
      {         
        decoded.Datarate = `DR${bytes[3] + 1}`;   
        
        decoded.Send_Cycle = bytes[4];
        
        decoded.Device_Mode = "";
        for(let i = 0; i < 8; i++) 
        {
          if((bytes[5] >> i) & 1)
          {
            decoded.Device_Mode += device_modes[i];
          }   
        }
        
        decoded.Trigger_Angle = bytes[6];
        
        decoded.Acoustic_Alarm_Trigger_Source = bytes[7];
        
        decoded.Acoustic_Alarm_Signal_Dryness = bytes[8];
        decoded.Acoustic_Alarm_Duration_Dryness = bytes[9];
         
        decoded.Acoustic_Alarm_Signal_Moisture = bytes[10];
        decoded.Acoustic_Alarm_Duration_Moisture = bytes[11];
        
        decoded.Acoustic_Alarm_Signal_Water = bytes[12];
        decoded.Acoustic_Alarm_Duration_Water = bytes[13];
        
        decoded.Acoustic_Alarm_Signal_Flat = bytes[14];
        decoded.Acoustic_Alarm_Duration_Flat = bytes[15];
        
        decoded.Acoustic_Alarm_Signal_Tilt = bytes[16];
        decoded.Acoustic_Alarm_Duration_Tilt = bytes[17];
        break;
      }
    }
  }
  else 
  {
    decoded.parser_error = "Wrong Port Number";
  }
  
   return decoded;
}

function decodeDownlink(input) {
  return {
    data: {
      bytes: input.bytes
    },
    warnings: [],
    errors: []
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
