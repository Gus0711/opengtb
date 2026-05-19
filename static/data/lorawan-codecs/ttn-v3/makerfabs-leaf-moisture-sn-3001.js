// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : AgroSense
// Device       : Leaf Moisture SN-3001
// fPort(s)     : non spécifié dans le profil
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/makerfabs/leaf-moisture-sn-3001.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
// ─────────────────────────────────────────────────────────────────────

// This file contains the uplink and downlink for ttn

// Uplink
function decodeUplink(input) {

    // var num = input.bytes[0] * 256 + input.bytes[1]
    var bat = input.bytes[2] / 10.0
    var Significant = input.bytes[3]
    var humi = (input.bytes[4] * 256 + input.bytes[5]) / 10.0

    var temp = input.bytes[6] * 256 + input.bytes[7]
    if (temp >= 0x8000) {
        temp -= 0x10000;
    }
    temp = temp / 10.0
    var interval = (input.bytes[8] * 16777216 + input.bytes[9] * 65536 + input.bytes[10] * 256 + input.bytes[11]) / 1000

    
        if (Significant) {
          return {
            data: {
            field1: bat,
            field2: humi,
            field3: temp,
            field4: interval,
            },
          };
        }
        else {
          return {
            data: {
            Significant: "data invalid",
            },
          };
        }
}

// .................................................................................................
// .................................................................................................
// .................................................................................................

// Downlink

// Encoder function to be used in the TTN console for downlink payload
function Encoder(input) {
    var minutes = input.minutes;

    // Converting minutes to seconds
    var seconds = minutes * 60;

    // If the number of seconds is less than 300 seconds, set it to 300 seconds
    if (seconds < 300) {
        seconds = 300;
    }

    var payload = [
        (seconds >> 24) & 0xFF,
        (seconds >> 16) & 0xFF,
        (seconds >> 8) & 0xFF,
        seconds & 0xFF
    ];

    return payload;
}