// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Fludia
// Device       : FM432p - Pulse Multifluid Tracker - 1 min
// fPort(s)     : non spécifié dans le profil
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/fludia/fm432p-1mn-decode.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
//   4. (downlink non fourni par ce vendor)
// ─────────────────────────────────────────────────────────────────────

const PAYLOAD_TYPE = {
  T1_1MN   :  {header: 0x5c, size: 44/*in bytes*/, name: "T1_1MN"},
  T2       :  {header: 0x29, size: 10/*in bytes*/, name: "T2"},
  START    :  {header: 0x01, size: 3/*in bytes*/,  name: "START"}
}

//Main function Decoder
function decodeUplink(input){
  var decoded = {
    data: {
      index : null,
      message_type : null,
      increments : [],
      time_step: 1,
      meter_type : "Pulse",
      firmware_version: null,
      step: null,
      values: null
    },
    warnings: [],
    errors: []
  }
  //Find message type
  decoded.data.message_type = find_message_type(input.bytes);
  if(decoded.data.message_type == null){
    decoded.errors.push("Invalid payload")
    return decoded
  }
  //Decode message
  if(decoded.data.message_type == PAYLOAD_TYPE.T1_1MN.name){
    var data = decode_T1(input.bytes);
    decoded.data.index = data.index;
    decoded.data.increments = data.increments;
  }else if(decoded.data.message_type == PAYLOAD_TYPE.T2.name){
    var data = decode_T2(input.bytes);
    decoded.data.index = data.index;
    decoded.data.firmware_version = data.firmware_version;
  }
  decoded.data.step = decoded.data.time_step;
  decoded.data.values = decoded.data.increments;
  return decoded
}

//Find message type - return null if nothing found
function find_message_type(payload){
  switch(payload[0]){
    case PAYLOAD_TYPE.T1_1MN.header:
      if(payload.length == PAYLOAD_TYPE.T1_1MN.size) return PAYLOAD_TYPE.T1_1MN.name
      break;
    case PAYLOAD_TYPE.T2.header:
      if(payload.length == PAYLOAD_TYPE.T2.size) return PAYLOAD_TYPE.T2.name
      break;
    case PAYLOAD_TYPE.START.header:
      if(payload.length == PAYLOAD_TYPE.START.size) return PAYLOAD_TYPE.START.name
      break;
  }
  return null
}

function decode_T1(payload,time_step){
  var data = {};
  data.index  = (payload[1] & 0xFF) << 16 | (payload[2] & 0xFF) << 8 | (payload[3] & 0xFF);
  data.increments = []
  for(i=0;i<20;i++){
    data.increments.push((payload[4+2*i] & 0xFF) << 8 | (payload[5+2*i] & 0xFF))
  }
  return data
}

function decode_T2(payload){
  var data = {};
  data.index = (payload[4] & 0xFF) << 24 | (payload[5] & 0xFF) << 16 | (payload[6] & 0xFF) << 8 | (payload[7] & 0xFF);
  data.firmware_version = String.fromCharCode(payload[1])+"."+String.fromCharCode(payload[2])+"."+String.fromCharCode(payload[3]);
  return data;
}
