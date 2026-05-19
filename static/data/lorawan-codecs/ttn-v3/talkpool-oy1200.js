// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : TalkPool AB
// Device       : OY1200 LoRaWAN® CO2 meter
// fPort(s)     : 1
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/talkpool/oy1200.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
// ─────────────────────────────────────────────────────────────────────

function toHexString(byteArray) {
    return Array.prototype.map.call(byteArray, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}

function DecodeOy1200Payload(bytes, port) {
    if (port === 1) {
        if(bytes.length !== 12){
            return null
        }

        bytes = toHexString(bytes);

        var OY1200Data = { };
        OY1200Data.CO2Raw      =  parseInt(bytes.substring(4,8),16)
        OY1200Data.CO2Filtered =  parseInt(bytes.substring(8,12),16)
        OY1200Data.Temperature =  parseInt(bytes.substring(12,16),16)/100
        OY1200Data.Humidity    =  parseInt(bytes.substring(16,20),16)/100
        return OY1200Data;
    }

    return null;
}


function decodeUplink(input) {
    return {
        "data": DecodeOy1200Payload(input.bytes, input.fPort)
    }
}

