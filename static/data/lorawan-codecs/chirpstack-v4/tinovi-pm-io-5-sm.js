// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : tinovi
// Device       : LoRaWAN Soil Moisture, Temperature | Air temperature/humidity | boosted 12v output from battery
// fPort(s)     : 1
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/tinovi/pm-io-5-sm.js
// Adapté par   : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. ChirpStack → Device Profiles → <votre profil>
//   2. Onglet « Codec » → « JavaScript functions »
//   3. Coller ce fichier intégralement dans « Codec functions »
//
// Note : le codec TTN d'origine est conservé intact dans un IIFE ;
// decodeUplink est ré-exposé au top-level et
// normalisé au format TR013 attendu par v4.
// ─────────────────────────────────────────────────────────────────────

var __opengtb_ttn_decode;
(function () {
	// ─── Source TTN v3 (intact) ─────────────────────────────────────────

var bytesToInt = function (/*byte[]*/byteArray, dev) {
  var value = 0;
  for (var i = 0; i < byteArray.length; i++) {
    value = (value * 256) + byteArray[i];
  }
  return value / dev;
};
var bytesToSignedInt = function (bytes, dev) {
  var sign = bytes[0] & (1 << 7);
  var x = ((bytes[0] & 0xFF) << 8) | (bytes[1] & 0xFF);
  if (sign) {
    x = 0xFFFF0000 | x;
  }
  return x / dev;
};
function decodeUplink(input) {
  var bytes = input.bytes;
  var decoded = {};
  var pos = 1;
  decoded.valv = ((bytes[0] >> 7) & 1);
  decoded.leak = ((bytes[0] >> 6) & 1);
  decoded.bat = bytes[pos++];
  if (((bytes[0] >> 0) & 1) === 1) { //SOIL
    decoded.e25 = bytesToInt(bytes.slice(pos, pos + 2), 100);
    pos = pos + 2;
    decoded.ec = bytesToInt(bytes.slice(pos, pos + 2), 10);
    pos = pos + 2;
    decoded.temp = bytesToSignedInt(bytes.slice(pos, pos + 2), 100);
    pos = pos + 2;
    decoded.vwc = bytesToInt(bytes.slice(pos, pos + 2), 1);
    pos = pos + 2;
  }
  if (((bytes[0] >> 1) & 1) === 1) { //BME
    decoded.airTemp = bytesToSignedInt(bytes.slice(pos, pos + 2), 100);
    pos = pos + 2;
    decoded.airHum = bytesToInt(bytes.slice(pos, pos + 2), 100);
    pos = pos + 2;
    var airPressuse = bytesToInt(bytes.slice(pos, pos + 2), 1) + 50000;
    if (airPressuse !== 65536) {
      decoded.airPres = airPressuse;
    }
    pos = pos + 2;
  }
  if (((bytes[0] >> 2) & 1) === 1) { //OPT
    decoded.lux = bytesToInt(bytes.slice(pos, pos + 4), 100);
    pos = pos + 4;
  }
  if (((bytes[0] >> 4) & 1) === 1) { //PULSE
    decoded.pulse = bytesToInt(bytes.slice(pos, pos + 4), 1);
    pos = pos + 4;
  }
  if (((bytes[0] >> 3) & 1) === 1) { //SOIL
    decoded.e25_1 = bytesToInt(bytes.slice(pos, pos + 2), 100);
    pos = pos + 2;
    decoded.ec_1 = bytesToInt(bytes.slice(pos, pos + 2), 10);
    pos = pos + 2;
    decoded.temp_1 = bytesToSignedInt(bytes.slice(pos, pos + 2), 100);
    pos = pos + 2;
    decoded.vwc_1 = bytesToInt(bytes.slice(pos, pos + 2), 1);
    pos = pos + 2;
  }
  if (((bytes[0] >> 5) & 1) === 1) { //PRESSURE
    decoded.press = bytesToInt(bytes.slice(pos, pos + 2), 100);
    pos = pos + 2;
  }
  if (bytes.length > (pos + 1)) {
    var set1 = bytes[pos++];
    if (((set1 >> 1) & 1) === 1) { //LEAF
      decoded.leafHum = bytesToInt(bytes.slice(pos, pos + 2), 100);
      pos = pos + 2;
      decoded.leafTemp = bytesToSignedInt(bytes.slice(pos, pos + 2), 100);
      pos = pos + 2;
    }
  }
  return {
    data: decoded,
  };
}
	// ─── /Source TTN v3 ─────────────────────────────────────────────────

	__opengtb_ttn_decode = (typeof decodeUplink === 'function')
		? decodeUplink
		: (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function')
			? codec.decodeUplink
			: null;
})();

function decodeUplink(input) {
	if (typeof __opengtb_ttn_decode !== 'function') {
		return { data: {}, warnings: [], errors: ['decodeUplink TTN introuvable dans le codec source'] };
	}
	var r;
	try {
		r = __opengtb_ttn_decode(input) || {};
	} catch (e) {
		return { data: {}, warnings: [], errors: [(e && e.message) ? e.message : String(e)] };
	}
	var data = (r && r.data !== undefined) ? r.data : r;
	return {
		data: data,
		warnings: Array.isArray(r.warnings) ? r.warnings : [],
		errors: Array.isArray(r.errors) ? r.errors : []
	};
}

