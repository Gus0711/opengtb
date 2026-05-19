// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : TalkPool AB
// Device       : OY1100 LoRaWAN® temperature and humidity sensor
// fPort(s)     : 1
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/talkpool/oy1100.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
//   4. (downlink non fourni par ce vendor)
// ─────────────────────────────────────────────────────────────────────


function DecodeOy1100Payload(bytes) {
    if(bytes.length % 3 !==0){
        return null;
    }

    var OY1100Data  = {}
    OY1100Data.Temperature = parseFloat((((bytes[0]<<4) | ((bytes[2]& 0xF0)>>4))*0.1).toFixed(1));
    OY1100Data.RelativeHumidity = parseFloat((((bytes[1]<<4) | (bytes[2]&0x0F) ) *0.1).toFixed(1));
    return OY1100Data;
}


function decodeUplink(input) {
    return {
        "data": DecodeOy1100Payload(input.bytes)
    }
}

