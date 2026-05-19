// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Milesight IoT Co., Ltd
// Device       : Milesight WS202 PIR & Light Sensor
// fPort(s)     : 85
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/milesight-iot/ws202.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
// ─────────────────────────────────────────────────────────────────────

function decodeUplink(input) {
    var res = Decoder(input.bytes, input.fPort);
    if (res.error) {
        return {
            errors: [res.error],
        };
    }
    return {
        data: res,
    };
}
/**
 * Payload Decoder for The Things Network
 *
 * Copyright 2021 Milesight IoT
 *
 * @product WS101
 */
function Decoder(bytes, port) {
    var decoded = {};

    for (var i = 0; i < bytes.length;) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];
        // BATTERY
        if (channel_id === 0x01 && channel_type === 0x75) {
            decoded.battery = bytes[i];
            i += 1;
        }
        // PIR
        else if (channel_id === 0x03 && channel_type === 0x00) {
            decoded.pir = bytes[i] === 0 ? "normal" : "trigger";
            i += 1;
        }
        // LIGHT
        else if (channel_id === 0x04 && channel_type === 0x00) {
            decoded.light = bytes[i] === 0 ? "dark" : "light";
            i += 1;
        } else {
            break;
        }
    }

    return decoded;
}