// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : AgroSense
// Device       : None-Position Rope Type Water Leak
// fPort(s)     : non spécifié dans le profil
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/makerfabs/none-position-rope-water-leak.js
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

    //var num = input.bytes[0] * 256 + input.bytes[1]
    var bat = input.bytes[2] / 10.0
    var water_leak_flag = input.bytes[3]
    var water_leak_cnt = input.bytes[4] * 256 + input.bytes[5]
    var water_leak_time =  input.bytes[6] * 16777216 + input.bytes[7] * 65536 + input.bytes[8] * 256 + input.bytes[9]

    return {
        data: {
            field1: bat,
            field2: water_leak_flag, //Normal is 0,leakage is 1.
            field3: water_leak_cnt,
            field4: water_leak_time,
        },

    };
}