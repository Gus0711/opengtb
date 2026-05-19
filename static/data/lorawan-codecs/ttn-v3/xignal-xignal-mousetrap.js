// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Xignal
// Device       : Mouse Trap
// fPort(s)     : 1
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/xignal/mousetrap.js
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
  var data = {};

  switch (input.fPort) {
    case 1:

     if (input.bytes[4] === 0x00){
       data.trapState = 'failed';
     } else if (input.bytes[4] === 0x01){
       data.trapState = 'normal';
     } else if (input.bytes[4] === 0x02){
      data.trapState = 'trapped';
    } else if (input.bytes[4] === 0x03){
      data.trapState = 'abnormal';
    } else if (input.bytes[4] === 0x04){
      data.trapState = 'moved';
    } else if (input.bytes[4] === 0x07){
      data.trapState = 'error';
    } else if (input.bytes[4] === 0x08){
      data.trapState = 'wakeup';
    }
    data.msgId = input.bytes[0];
    data.battVoltage = input.bytes[1]/10;
    data.temperature = (input.bytes[2] << 8 | input.bytes[3]) / 100;
    data.id = input.bytes[10] << 8 | input.bytes[5];
       
        
    
    
      return {
        data : data,
      };
  }
}