// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Rivercity Innovations Ltd.
// Device       : TxH - Temperature & Humidity Sensor
// fPort(s)     : 2, 3, 5, 6
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/rivercity-innovations/txh.js
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
function decodeUplink(input) {
  var decoded = {};
  
  if (input.fPort == 2)
  {
    decoded.temperature = input.bytes[1] + input.bytes[0] * 256;
    if (decoded.temperature >= 0x8000) // negative
        decoded.temperature -= 0x10000;
    decoded.temperature = decoded.temperature/10;

    decoded.humidity = input.bytes[3] + input.bytes[2] * 256;
    if (decoded.humidity >= 0x8000) // negative
        decoded.humidity -= 0x10000;
    decoded.humidity = decoded.humidity/10;
    
    decoded.temperatureAlertActive = ( (input.bytes[4] & 0x02) == 0x02 ? true : false);
    decoded.humidityAlertActive = ( (input.bytes[4] & 0x01) == 0x01 ? true : false);

    if (input.bytes.length > 5)
    {
      decoded.battery = (input.bytes[6] + input.bytes[5] * 256)/1000;
    }
  }
  else if (input.fPort == 3)
  {
    decoded.LoRaWANVersion = input.bytes[0].toString(16) + "." + input.bytes[1].toString(16) + "." + input.bytes[2].toString(16) + "." + input.bytes[3].toString(16);
    decoded.FirmwareVersion = input.bytes[4].toString(16) + "." + input.bytes[5].toString(16) + "." + input.bytes[6].toString(16) + "." + input.bytes[7].toString(16);
  }
  else if (input.fPort == 5)
  {
    /* System parameters */
    decoded.TemperatureLimitHigh = input.bytes[1] + input.bytes[0]*256;
    if(decoded.TemperatureLimitHigh >= 0x8000)
    {
     	decoded.TemperatureLimitHigh -= 0x10000;
    }
    decoded.TemperatureLimitHigh = decoded.TemperatureLimitHigh/10;
    
    decoded.TemperatureLimitLow = input.bytes[3] + input.bytes[2]*256;
    if(decoded.TemperatureLimitLow >= 0x8000)
    {
     	decoded.TemperatureLimitLow -= 0x10000;
    }
    decoded.TemperatureLimitLow = decoded.TemperatureLimitLow/10;
    
    decoded.HumidityLimitHigh = input.bytes[5] + input.bytes[4]*256;
    if(decoded.HumidityLimitHigh >= 0x8000)
    {
     	decoded.HumidityLimitHigh -= 0x10000;
    }
    decoded.HumidityLimitHigh = decoded.HumidityLimitHigh/10;
    
    decoded.HumidityLimitLow = input.bytes[7] + input.bytes[6]*256;
    if(decoded.HumidityLimitLow >= 0x8000)
    {
     	decoded.HumidityLimitLow -= 0x10000;
    }
    decoded.HumidityLimitLow = decoded.HumidityLimitLow/10;
    
    decoded.DataAverageNumber = input.bytes[8];
    
    decoded.TemperatureAlertsEnabled 	= false;
    decoded.HumidityAlertsEnabled 		= false;
    decoded.AdrOn 						= false;
    decoded.ConfirmedUplinks 			= false;
    decoded.IsAlertsConfirmed 			= false;
    
    if((input.bytes[9] & 0x10) > 0) {decoded.TemperatureAlertsEnabled = true;}
    if((input.bytes[9] & 0x08) > 0) {decoded.HumidityAlertsEnabled = true;}
    if((input.bytes[9] & 0x04) > 0) {decoded.AdrOn = true;}
    if((input.bytes[9] & 0x02) > 0) {decoded.ConfirmedUplinks = true;}
    if((input.bytes[9] & 0x01) > 0) {decoded.IsAlertsConfirmed = true;}
  }
  else if(input.fPort == 6)
  {
    decoded.CheckTimeSeconds = input.bytes[3] + input.bytes[2]*256 + input.bytes[1]*65536 + input.bytes[0]*16777216;
    decoded.ReportsNumChecksRegular = input.bytes[5] + input.bytes[4]*256;
    decoded.ReportsNumChecksAlert = input.bytes[7] + input.bytes[6]*256;
  }
  
  return {
    data: decoded
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

