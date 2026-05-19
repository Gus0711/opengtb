// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : ELV Elektronik AG
// Device       : LoRaWAN® GPS Tracker 1
// fPort(s)     : 10
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/elv/elv-lw-gps1-1.0.0.js
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
 * ELV-LW-GPS1-Payload-Parser
 * 
 * Version: V1.0.0
 * 
 * */



var tx_reason = ["Reserved", "Timer_Event", "User_Button", "GNSS_Timeout", "Heartbeat", "Input_One_Shot", "Input_Cyclic", "Motion_Start", "Motion_Cyclic", "Motion_Stop" ];

/*
 * @brief   Receives the bytes transmitted from a ELV-LW-GPS1 device 
 * @param   bytes:  Array with the data stream
 * @param   port:   Used TTN/TTS data port 
 * @return  Decoded data from the ELV-LW-GPS1 device
 * */
function decodeUplink( input )
{

  var bytes = input.bytes;
  var port = input.fPort;
  
  var decoded = {};               // Container with the decoded output
  var index   = bytes[0] + 1;     // Index variable for the application data in the bytes[] array
  
  if( port === 10 ) // The default port for app data
  {
    if( bytes.length >= 1 ) // Minimum 1 Bytes for Header length
    {
      // Collecting header data
      decoded.TX_Reason       = tx_reason[( bytes[1] & 0x0F )]; // Read out the reason for sending 
      decoded.Supply_Voltage  = ( bytes[2] << 8 ) | bytes[3];

      if( bytes.length > ( bytes[0] + 1 ) ) // There is not only the header data
      {
        // Loop for collecting the application data 
        do
        {
          switch( bytes[index] )
          {
            case 0x01:  // Positioning Data (TTN Mapper conform)
            {
              decoded.latitude  = parseFloat( bytes[++index] | ( bytes[++index] << 8 ) | ( bytes[++index] << 16 ) | ( bytes[++index] << 24 ) ) / 1000000;
              decoded.longitude = parseFloat( bytes[++index] | ( bytes[++index] << 8 ) | ( bytes[++index] << 16 ) | ( bytes[++index] << 24 ) ) / 1000000;
              decoded.altitude  = bytes[++index] | ( bytes[++index] << 8 ) | ( bytes[++index] << 16 ) | ( bytes[++index] << 24 );
              decoded.altitude  = Number( ( decoded.altitude / 10000 ).toFixed( 2 ) );
              decoded.hdop      = Number( parseFloat( String( bytes[++index] ) + "." + String( bytes[++index] * 4 ).padStart( 2, '0' ) ).toFixed( 2 ) );
            }
              break;
            default:  // There is something wrong with the data type value
            {
              // Removing all added properties from the "decoded" object with a deep clean
              // Clear all properties from the "decoded" object
              decoded = {};

              // Add error code propertiy to the "decoded" object
              decoded.parser_error = "Data Type Failure";
            }
              break;
          }
        }
        while( ( ++index < bytes.length ) && ( 'parser_error' in decoded === false ) );
      }
    }
    else
    {
      decoded.parser_error = "Not enough data";
    }
  }
  else
  {
    decoded.parser_error = "Wrong Port Number";
  }

  //return decoded;

  return{
    data: decoded,
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
