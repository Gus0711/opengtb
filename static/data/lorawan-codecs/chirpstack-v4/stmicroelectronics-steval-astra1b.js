// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : STMicroelectronics International NV
// Device       : STEVAL-ASTRA1B
// fPort(s)     : 99
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/stmicroelectronics/steval-astra1b.js
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
  var data = {};
  var i,len = 0;
  switch (input.fPort) {
    case 99:
      for (i=1; i<input.bytes.length; i+=len+2)  // input.bytes[0] is not relevant
      {
        /* Pressure */
        if (input.bytes[i] == 0x73)
        {
          len = 2;
          data.pressure = {
          displayName: 'Barometric pressure',
          unit: 'hPa',
          value: ((input.bytes[i+1] << 8) + input.bytes[i+len]) / 10
          };
        }
        /* Temperature */ 
        else if (input.bytes[i] == 0x67)
        { 
          len = 2;   
          data.temperature = {
          displayName: 'Temperature',
          unit: '°C',
          value: (((input.bytes[i+1] & 0x80 ? input.bytes[i+1] - 0x100 : input.bytes[i+1]) << 8) + input.bytes[i+len]) / 10
          };
        }
        /* Humidity */                       // not required anymore
        else if (input.bytes[i] == 0x68)
        { 
          len = 1;   
          data.humidity = {
          displayName: 'Humidity',
          unit: '%',
          value: input.bytes[i+len] / 2
          };
        }
        /* Acceleration on X-Y-Z axis */
        else if (input.bytes[i] == 0x71)
        { 
          len = 6;
          data.accelerationOnX = {
          displayName: 'Acceleration on X axis',
          unit: 'mg',
          value: ((input.bytes[i+1] & 0x80 ? input.bytes[i+1] - 0x100 : input.bytes[i+1]) << 8) + input.bytes[i+2]
          };
          data.accelerationOnY = {
          displayName: 'Acceleration on Y axis',
          unit: 'mg',
          value: ((input.bytes[i+3] & 0x80 ? input.bytes[i+3] - 0x100 : input.bytes[i+3]) << 8) + input.bytes[i+4]
          };
          data.accelerationOnZ = {
          displayName: 'Acceleration on Z axis',
          unit: 'mg',
          value: ((input.bytes[i+5] & 0x80 ? input.bytes[i+5] - 0x100 : input.bytes[i+5]) << 8) + input.bytes[i+len]
          };
        }
        /* Latitude-Longitude-Altitude */
        else if (input.bytes[i] == 0x88)
        { 
          len = 9;
          data.latitude = {
          displayName: 'Latitude',
          unit: '°',
          value: (((input.bytes[i+1] & 0x80 ? input.bytes[i+1] - 0x100 : input.bytes[i+1]) << 16) + (input.bytes[i+2] << 8) + input.bytes[i+3]) / 10000.0
          };
          data.longitude = {
          displayName: 'Longitude',
          unit: '°',
          value: (((input.bytes[i+4] & 0x80 ? input.bytes[i+4] - 0x100 : input.bytes[i+4]) << 16) + (input.bytes[i+5] << 8) + input.bytes[i+6]) / 10000.0
          };
          data.altitude = {
          displayName: 'Altitude',
          unit: 'mslm',
          value: (((input.bytes[i+7] & 0x80 ? input.bytes[i+7] - 0x100 : input.bytes[i+7]) << 16) + (input.bytes[i+8] << 8) + input.bytes[i+len]) / 100.0
          };
        }  
        /* Battery voltage */
        else if (input.bytes[i] == 0x2)
        {    
          len = 2;
          data.batteryVoltage = {
          displayName: 'Battery voltage',
          unit: 'mV',
          value: (input.bytes[i+1] << 8) + input.bytes[i+len]
          };
        }
        /* Led status */                  //not implemented
        else if (input.bytes[i] == 0x1)
        {   
          len = 1;
          data.ledStatus = {
          displayName: 'Led status',
          value: (input.bytes[i+1] & 0x01) ? 'ON':'OFF'
          };
        }
        /* Tamper input */                //not implemented
        else if (input.bytes[i] == 0x0)
        {
          len = 1; 
          data.tamperInput = {
          displayName: 'Tamper input',
          unit: "null",
          value: "null"
          }
        }
        else{}
      }
      return {
        data: data
      }
    default:
      return {
        errors: ['unknown FPort'],
      };
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
