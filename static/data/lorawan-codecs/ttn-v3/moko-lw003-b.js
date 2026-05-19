// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Moko Technology Ltd
// Device       : LW003-B - Bluetooth Probe
// fPort(s)     : non spécifié dans le profil
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/moko/lw003-b.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
//   4. (downlink non fourni par ce vendor)
// ─────────────────────────────────────────────────────────────────────

function decodeUplink(input)
{
  var port = input.fPort;
  var bytes = input.bytes;
  var decoded = {};
  var fourStr = bytes.join("");
  if (port === 1)
  {
    decoded.type = "Device Information Packet";
    decoded.batterylevel = bytes[0]/100 ; //  IF equal to 0.55, means the battery level is 55%.
    decoded.voltagemv = bytes[1]*256 +bytes[2];
    decoded.firmwareversion = bytes[3]; //Convert to binary, if it is 01 00 00 11 ,the firmware is V1.0.3
    decoded.accelerometersensitivity = bytes[4];
    decoded.tamperstatus = bytes[5];
    decoded.temperature = ( ( bytes[6] * 256 + bytes[7] ) -4500 ) / 100; // the unit is ℃
    decoded.humidity =  ( bytes[8] * 256 + bytes[9] ) / 100;
    if ( bytes[10] == 0 )
    {
      decoded.region = "as923";
    }
    else if ( bytes[10] == 1 )
    {
      decoded.region = "au915";
    }
    else if ( bytes[10] == 5 )
    {
      decoded.region = "eu868";  
    }
    else if ( bytes[10] == 6 )
    {
      decoded.region = "kr920";  
    }
    else if ( bytes[10] == 7 )
    {
      decoded.region = "in865";     
    }
    else if ( bytes[10] == 8 )
    {
      decoded.region = "us915";  
    }
    else 
    {
      decoded.region = "ru864";     
    }
  }
  else if (port === 2)
  {
    decoded.tyep = "Beacons data packet";
    decoded.framecounter = bytes[0];
    decoded.Beaconsnumber = bytes[1];
    decoded.timeyear1st = bytes[2] * 256 + bytes[3];
    decoded.timemonth1st = bytes[4];
    decoded.timeday1st = bytes[5]; 
    decoded.timehour1st = bytes[6];
    decoded.timeminute1st = bytes[7];
    decoded.timesecond1st = bytes[8]; 
    decoded.beaconlength1st = bytes[9];
    decoded.beaconmac1st  = fourStr.substring(20,32);
    decoded.beaconrssi1st = bytes[16] - 256;
    decoded.adverrawdata1st = fourStr.substring(34,96);
    decoded.responserawdata1st =  fourStr.substring(96,158);
    decoded.timeyear2nd = bytes[79] * 256 + bytes[80];
    decoded.timemonth2nd = bytes[81];
    decoded.timeday2nd = bytes[82]; 
    decoded.timehour2nd = bytes[83];
    decoded.timeminute2nd = bytes[84];
    decoded.timesecond2nd = bytes[85]; 
    decoded.beaconlength2nd = bytes[86];
    decoded.beaconmac2nd  = fourStr.substring(174,186);
    decoded.beaconrssi2nd = bytes[93] - 256;
    decoded.adverrawdata2nd = fourStr.substring(188,250);
    decoded.responserawdata2nd =  fourStr.substring(250,312);
    decoded.timeyear3rd = bytes[156] * 256 + bytes[157];
    decoded.timemonth3rd = bytes[158];
    decoded.timeday3rd = bytes[159]; 
    decoded.timehour3rd = bytes[160];
    decoded.timeminute3rd = bytes[161];
    decoded.timesecond3rd = bytes[162]; 
    decoded.beaconlength3rd = bytes[163];
    decoded.beaconmac3rd  = fourStr.substring(328,340);
    decoded.beaconrssi3rd = bytes[170] - 256;
    decoded.adverrawdata3rd = fourStr.substring(342,404);
    decoded.responserawdata3rd =  fourStr.substring(404,466);
  }
  else
  {
    return {
      errors: ['unknown FPort'],
    };
  }

  return {
    data: decoded,
  };
}

