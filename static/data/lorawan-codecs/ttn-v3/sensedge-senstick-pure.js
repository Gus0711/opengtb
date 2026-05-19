// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Sensedge
// Device       : Senstick Pure - Air Quality & Microclimate Sensor
// fPort(s)     : non spécifié dans le profil
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/sensedge/senstick-pure.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
// ─────────────────────────────────────────────────────────────────────


function decodeUplink(input) {
  switch (input.fPort) {
    case 2:
      return {
        // Decoded data
        data: {
          Status: bytes[0],
          Temperature: sintToDec(bytes[1] << 8 | bytes[2]),
          Humidity: (bytes[3] << 8 | bytes[4]) / 100,
          AirPressure: bytes[5] + 845, 
          IAQ: bytes[6] << 8 | bytes[7],
          StaticIAQ: bytes[8] << 8 | bytes[9],
          eCO2: bytes[10] << 8 | bytes[11],
          BreathVOC: bytes[12] / 10,
          IAQAccuracy: bytes[13]
        },
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}

function sintToDec(T){
  if (T > 32767) {
    return ((T - 65536) / 100.0);
  }
  else {
    return (T / 100.0);
  }
}
