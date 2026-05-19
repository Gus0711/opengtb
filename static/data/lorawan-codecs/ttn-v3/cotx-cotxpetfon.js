// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Beijing COTX Networks Technologies Co. Ltd.
// Device       : Petfon LoRa Tracker
// fPort(s)     : non spécifié dans le profil
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/cotx/cotxpetfon.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
//   4. (downlink non fourni par ce vendor)
// ─────────────────────────────────────────────────────────────────────

function decodeUplink(input) {

  let data = Bytes2HexString(input.bytes);
  let decoded = {};
  if(input.bytes[0] == 241){
    decoded.type = input.bytes[0];
    if(input.bytes[6] & 0x80){
      decoded.longitude = (parseInt(data.substr(12,8),16) - parseInt('100000000',16))/1000000;
    }else{
      decoded.longitude = parseInt(data.substr(12,8),16)/1000000;
    }
    if(input.bytes[10] & 0x80){
      decoded.latitude = (parseInt(data.substr(20,8),16) - parseInt('100000000',16))/1000000;
    }else{
      decoded.latitude = parseInt(data.substr(20,8),16)/1000000;
    }
    decoded.paws = parseInt(data.substr(32,8),16);
    let run_time_bit = parseInt(data.substr(40,8),16).toString(2);
    decoded.battery = parseInt(run_time_bit.slice(-21,-14),2);
    decoded.working = parseInt(run_time_bit.slice(-10),2);

  }else if(input.bytes[0] == 240){
    decoded.type = input.bytes[0];
    decoded.paws = parseInt(data.substr(12,8),16);
    let run_time_bit = parseInt(data.substr(40,8),16).toString(2);
    decoded.battery = parseInt(run_time_bit.slice(-21,-14),2);
    decoded.working = parseInt(run_time_bit.slice(-10),2);
  }else if(input.bytes[0] == 242){
    decoded.type = input.bytes[0];
    decoded.paws = parseInt(data.substr(70,8),16);
    let run_time_bit = parseInt(data.substr(40,8),16).toString(2);
    decoded.battery = parseInt(run_time_bit.slice(-21,-14),2);
    decoded.working = parseInt(run_time_bit.slice(-10),2);
  }

  return {
    data: {
      bytes: decoded
    },
    warnings: [],
    errors: []
  };
}

function Bytes2HexString(arrBytes) {
  var str = "";
  for (var i = 0; i < arrBytes.length; i++) {
    var tmp;
    var num=arrBytes[i];
    if (num < 0) {
      tmp =(255+num+1).toString(16);
    } else {
      tmp = num.toString(16);
    }
    if (tmp.length == 1) {
      tmp = "0" + tmp;
    }
    str += tmp;
  }
  return str;
}