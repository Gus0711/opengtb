// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Arduino SA
// Device       : Portenta Vision Shield LoRa®
// fPort(s)     : 1
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/arduino/loravisionshield.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
// ─────────────────────────────────────────────────────────────────────

// This is used with the LoRa LED/ON off basic sketch
// Please refer to https://create.arduino.cc/editor/FT-CONTENT/043f42fb-2b04-4cfb-a277-b1a3dd5366c2/preview

var LED_STATES = ['off', 'on']

function decodeUplink(input) {
  var data = {};
  data.ledState = LED_STATES[input.bytes[0]];
  return {
    data: data,
  };
}

function encodeDownlink(input) {
  var i = LED_STATES.indexOf(input.data.ledState);
  if (i === -1) {
    return {
      errors: ['unknown led state'],
    };
  }
  return {
    bytes: [i],
    fPort: 1,
  };
}

function decodeDownlink(input) {
  return {
    data: {
      ledState: LED_STATES[input.bytes[0]]
    }
  }
}
