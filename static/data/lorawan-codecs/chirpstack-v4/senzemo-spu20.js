// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Senzemo
// Device       : SPU20 - Senspuck Pure PV
// fPort(s)     : non spécifié dans le profil
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/senzemo/spu20.js
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
  ___  ___ _ __   ___ _______ _ __ ___   ___  
 / __|/ _ \ '_ \ / _ \_  / _ \ '_ ` _ \ / _ \ 
 \__ \  __/ | | |  __// /  __/ | | | | | (_) |
 |___/\___|_| |_|\___/___\___|_| |_| |_|\___/ 

  Senstick Pure SPU20 HW 2.0 - FW 1.0                             
*/

function decodeUplink(input) {
  const bytes = input.bytes;  
  
  var Status;
  var Temperature;
  var Humidity;
  var AirPressure;
  var TVOC;
  var CO2;
  var Voltage;

  // If Data Packet
  if (bytes.length == 15)
  {
    Status = bytes[0];
    Temperature = (bytes[1] << 8) + bytes[2];
    Humidity = (bytes[3] << 8) + bytes[4];
    AirPressure = (bytes[5] << 8) + bytes[6];
    TVOC = (bytes[7] << 8) + bytes[8]; 
    CO2 = (bytes[9] << 8) + bytes[10];
    Voltage = (bytes[11] << 8) + bytes[12]; 

    return {
      data: {
        Status: Status,
        Temperature: sintToDec(Temperature),
        Humidity: Humidity / 100.0,
        AirPressure: AirPressure / 10.0,
        TVOC: TVOC / 100.0,
        CO2: CO2,
        Voltage: Voltage
      },
        warnings: [],
        errors: []
    };
  }
  
  
  // If Config packet
  else if (bytes.length == 10)
  {
        Status = bytes[0];
    var PacketConfirm = bytes[1];
    var DataRate = bytes[2];
    var Config = bytes[3];
    var LedThreshold = bytes[4];
    var LedIntensity = bytes[5];           
    var FamilyId = bytes[6];  
    var ProductId = bytes[7];
    var HardwareVersion = bytes[8];
    var FirmWareVersion = bytes[9];    
        
    return {
      data: {
        Status: Status,
        PacketConfirm: PacketConfirm,
        DataRate: DataRate,
        Config: Config,        
        LedThreshold: LedThreshold * 10.0,
        LedIntensity: LedIntensity,
        FamilyId: FamilyId,
        ProductId: ProductId,
        HardwareVersion: HardwareVersion / 10.0,
        FirmWareVersion: FirmWareVersion / 10.0
        
      },
        warnings: [],
        errors: []
    };
  }
}


function sintToDec(T){
  if (T > 32767) {
    return ((T - 65536) / 100.0);
  }
  else {
    return (T / 100.0);
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
