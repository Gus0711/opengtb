// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Senzemo
// Device       : SMC30 - Senstick Microclimate
// fPort(s)     : non spécifié dans le profil
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/senzemo/smc30.js
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
/*

   _____                                      _____                 __  _      __  
  / ___/___  ____  ____  ___  ____ ___  ____ / ___/___  ____  _____/ /_(_)____/ /__
  \__ \/ _ \/ __ \/_  / / _ \/ __ `__ \/ __ \\__ \/ _ \/ __ \/ ___/ __/ / ___/ //_/
 ___/ /  __/ / / / / /_/  __/ / / / / / /_/ /__/ /  __/ / / (__  ) /_/ / /__/ ,<   
/____/\___/_/ /_/ /___/\___/_/ /_/ /_/\____/____/\___/_/ /_/____/\__/_/\___/_/|_|  
                                                                                   
  Senstick SMC30 HW 3.0 - FW 2.x                             
*/


function decodeUplink(input) {
  const bytes = input.bytes; 
  const port = input.fPort; 

  // If Data Packet
  if (port == 1 || port == 2) {
    
    var Status = bytes[0];
    var Temperature = (bytes[1] << 8) + bytes[2];
    var Humidity = (bytes[3] << 8) + bytes[4];
    var AirPressure = (bytes[5] << 8) + bytes[6];
    var BatteryLevel = bytes[7];  

    return {
      data: {
        Status: Status,
        Temperature: sintToDec(Temperature),
        Humidity: Humidity / 100.0,
        AirPressure: AirPressure / 10.0,
        BatteryLevel: (BatteryLevel + 100) / 100
      },
      	warnings: [],
      	errors: []
    };
  }
  // If Config packet
  else {
    
    var Status = bytes[0];    
    var SendPeriod = bytes[1];
    var MovementThreshold = bytes[2];
    var PacketConfirm = bytes[3];
    var DataRate = bytes[4]; 
    var FamilyId = bytes[5];
    var ProductId = bytes[6];         
    var HW = bytes[7];
    var FW = bytes[8];      
    
    return {
      data: {
        Status: Status,
        SendPeriod: SendPeriod,
        MovementThreshold: MovementThreshold, 
        PacketConfirm: PacketConfirm,
        DataRate: DataRate, 
        FamilyId: FamilyId,
        ProductId: ProductId,    
        HW: HW/10,
        FW: FW/10
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

