// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : TalkPool AB
// Device       : OY1110 LoRaWAN® temperature and humidity sensor
// fPort(s)     : 2, 3
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/talkpool/oy1110.js
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

function DecodeOy1110Payload(bytes, port) {
    if (port===2) {
        if (bytes.length % 3 !== 0) {
            return null;
        }

        var OY1110Data = {};
        OY1110Data.Temperature =  ( ( ( ((bytes[0])<<4) | ((bytes[2]&0xF0)>>4) )- 800) / 10.0)
        OY1110Data.RelativeHumidity = ( ( ( ((bytes[1])<<4) | (bytes[2]&0x0F) )- 250) / 10.0)
        return OY1110Data;
    }
    else if (port === 3) {
        if (bytes.length%3 != 1) {
            return null;
        }

        bytes = bytes.slice(1,bytes.length)

        var OY1110Data = {};
        OY1110Data.Temperature =  ( ( ( ((bytes[0])<<4) | ((bytes[2]&0xF0)>>4) )- 800) / 10.0)
        OY1110Data.RelativeHumidity = ( ( ( ((bytes[1])<<4) | (bytes[2]&0x0F) )- 250) / 10.0)
        return OY1110Data;
    }

    return null;
}


function decodeUplink(input) {
    return {
        "data": DecodeOy1110Payload(input.bytes, input.fPort)
    }
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

