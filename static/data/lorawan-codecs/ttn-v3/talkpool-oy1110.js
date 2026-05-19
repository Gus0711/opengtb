// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : TalkPool AB
// Device       : OY1110 LoRaWAN® temperature and humidity sensor
// fPort(s)     : 2, 3
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/talkpool/oy1110.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
//   4. (downlink non fourni par ce vendor)
// ─────────────────────────────────────────────────────────────────────


function DecodeOy1110Payload(bytes, port) {
    if (port===2) {
        if (bytes.length % 3 !== 0) {
            return null;
        }

        var OY1110Data = {};
        OY1110Data.Temperature =  ( ( ( ((bytes[0])<<4) | ((bytes[2]&0xF0)>>4) )- 800) / 10.0)
        OY1110Data.RelativeHumidity = ( ( ( ((bytes[1])<<4) | (bytes[2]&0x0F) )- 250) / 10.0)
        return OY1110Data;
    }
    else if (port === 3) {
        if (bytes.length%3 != 1) {
            return null;
        }

        bytes = bytes.slice(1,bytes.length)

        var OY1110Data = {};
        OY1110Data.Temperature =  ( ( ( ((bytes[0])<<4) | ((bytes[2]&0xF0)>>4) )- 800) / 10.0)
        OY1110Data.RelativeHumidity = ( ( ( ((bytes[1])<<4) | (bytes[2]&0x0F) )- 250) / 10.0)
        return OY1110Data;
    }

    return null;
}


function decodeUplink(input) {
    return {
        "data": DecodeOy1110Payload(input.bytes, input.fPort)
    }
}

