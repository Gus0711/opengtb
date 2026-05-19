// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Dragino Technology Co., Limited
// Device       : LSE01 - Soil Moisture & EC Sensor
// fPort(s)     : 2, 42
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/dragino/lse01.js
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
function decodeUplink(input) {
  var port = input.fPort;
  var bytes = input.bytes;
  var value = ((bytes[0] << 8) | bytes[1]) & 0x3fff;
  var batV = value / 1000; //Battery,units:V
  value = (bytes[2] << 8) | bytes[3];
  var data = {};
  switch (input.fPort) {
    case 2:
      if (bytes[2] & 0x80) {
        value |= 0xffff0000;
      }
      data.Bat = batV;
      data.TempC_DS18B20 = (value / 10).toFixed(1); //DS18B20,temperature,units:℃

      value = (bytes[4] << 8) | bytes[5];
      data.water_SOIL = (value / 100).toFixed(2); //water_SOIL,Humidity,units:%

      value = (bytes[6] << 8) | bytes[7];
      if ((value & 0x8000) >> 15 === 0)
        data.temp_SOIL = (value / 100).toFixed(2); //temp_SOIL,temperature,units:°C
      else if ((value & 0x8000) >> 15 === 1) data.temp_SOIL = ((value - 0xffff) / 100).toFixed(2); //temp_SOIL,temperature,units:°C

      value = (bytes[8] << 8) | bytes[9];
      data.conduct_SOIL = value; //conduct_SOIL,conductivity,units:uS/cm

      return {
        data: data,
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}

function normalizeUplink(input) {
  var data = {};
  var air = {};
  var soil = {};

  if (input.data.TempC_DS18B20) {
    air.temperature = Number(input.data.TempC_DS18B20);
  }

  if (input.data.temp_SOIL) {
    soil.temperature = Number(input.data.temp_SOIL);
  }

  if (input.data.water_SOIL) {
    soil.moisture = Number(input.data.water_SOIL);
  }

  if (input.data.conduct_SOIL) {
    soil.ec = input.data.conduct_SOIL / 1000;
  }

  if (Object.keys(air).length > 0) {
    data.air = air;
  }

  if (Object.keys(soil).length > 0) {
    data.soil = soil;
  }

  if (input.data.Bat) {
    data.battery = input.data.Bat;
  }

  return { data: data };
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

