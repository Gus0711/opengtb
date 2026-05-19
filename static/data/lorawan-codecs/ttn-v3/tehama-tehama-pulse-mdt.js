// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Tehama Wireless Design Group
// Device       : Single Pulse Sensor
// fPort(s)     : non spécifié dans le profil
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/tehama/tehama-pulse-mdt.js
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
  let hexString = input.bytes.map(byte => byte.toString(16).padStart(2, '0')).join(' ');
  let readingStr = input.bytes[12].toString(16).padStart(2, "0")+ input.bytes[11].toString(16).padStart(2, "0")+ input.bytes[10].toString(16).padStart(2, "0")+ input.bytes[9].toString(16).padStart(2, "0");
  var theReading = parseInt(readingStr, 16);
  
  let secondsSince2000 = input.bytes[6].toString(16).padStart(2, "0") + input.bytes[5].toString(16).padStart(2, "0") + input.bytes[4].toString(16).padStart(2, "0") + input.bytes[3].toString(16).padStart(2, "0");
  let startDate = new Date('1970-01-01T00:00:00Z');  
  const milliseconds = parseInt(secondsSince2000, 16) * 1000;  
  let date = new Date(startDate.getTime() + milliseconds);  
  
  var now = new Date();
  
  return {
    data: {
     // msg: hexString,
    //  msgType: input.bytes[0].toString(16).padStart(2, "0"),
    //  subMsgLen: input.bytes[1].toString(16).padStart(2, "0"),
     // subMsgType: input.bytes[2].toString(16).padStart(2, "0"),
      rxTimeStamp: now.toString(),
      readTimeStamp: date.toString(),
      reading: theReading
    },
    warnings: [],
    errors: []
  };
}

