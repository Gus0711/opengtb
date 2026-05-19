// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : TalkPool AB
// Device       : OY1320 LoRaWAN Water meter AMR
// fPort(s)     : 2
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/talkpool/oy1320.js
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

function DecodeOy1320Payload(bytes, port) {
    dst    = toHexString(bytes);
    first = dst.substring(4,dst.length);

    if(bytes.length % 6 === 0){
        var OY1320Data = {};
        OY1320Data.MeterReading = parseInt(first.substring(4,8),16);
        OY1320Data.Status       = "0";
        return OY1320Data;
    }
    else if(bytes.length % 9 === 0) {
        var OY1320Data = {};
        OY1320Data.MeterReading = parseInt(first.substring(4,8),16);
        OY1320Data.Status       = dst.substring(8,9);
        return OY1320Data;
    }

    return null
}


function decodeUplink(input) {
    return {
        "data": DecodeOy1320Payload(input.bytes, input.fPort)
    }
}

