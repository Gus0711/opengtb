// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : JENG IoT
// Device       : Buzzon Button
// fPort(s)     : non spécifié dans le profil
// Fonctions    : decodeUplink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/jeng-iot/buzzon.js
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
let shortPressTot = 0;
let longPressTot = 0;
let voltage = 0.00;

function sflt162f(rawSflt16) {
    // rawSflt16 is the 2-byte number decoded from wherever;
    // it's in range 0..0xFFFF
    // bit 15 is the sign bit
    // bits 14..11 are the exponent
    // bits 10..0 are the the mantissa. Unlike IEEE format, 
    //        the msb is transmitted; this means that numbers
    //        might not be normalized, but makes coding for
    //        underflow easier.
    // As with IEEE format, negative zero is possible, so
    // we special-case that in hopes that JavaScript will
    // also cooperate.
    //
    // The result is a number in the open interval (-1.0, 1.0);
    // 

    // throw away high bits for repeatability.

    rawSflt16 &= 0xFFFF;

    // special case minus zero:
    if (rawSflt16 == 0x8000)
        return -0.0;

    // extract the sign.
    var sSign = ((rawSflt16 & 0x8000) != 0) ? -1 : 1;

    // extract the exponent
    var exp1 = (rawSflt16 >> 11) & 0xF;

    // extract the "mantissa" (the fractional part)
    var mant1 = (rawSflt16 & 0x7FF) / 2048.0;

    // convert back to a floating point number. We hope 
    // that Math.pow(2, k) is handled efficiently by
    // the JS interpreter! If this is time critical code,
    // you can replace by a suitable shift and divide.
    var f_unscaled = sSign * mant1 * Math.pow(2, exp1 - 15);

    return f_unscaled;
}
function decodeUplink(input) {
    switch (input.fPort) {
        case 1:
		//fPort 1 is normal message
            shortPressTot = input.bytes[0] + (input.bytes[1] * 256);		//The total shortpresses (2bytes)
            longPressTot = input.bytes[2] + (input.bytes[3] * 256);			//The total longpresses (2bytes)
			/*reserved bytes */												//2 bytes reserved for future use
            voltage = sflt162f(input.bytes[6]+(input.bytes[7]*256)) * 10;	//voltage is saved as 2byte float. Multiply by 10 to get node votlage.
            return {
                data: {
                    shortPressTot,
                    longPressTot,
                    voltage
                },
                warnings: [],
                errors: []
            };
        case 2:
		//fPort 2 is heartbeat. This is decoded the same as a normal message
            shortPressTot = input.bytes[0] + (input.bytes[1] * 256);		//The total shortpresses (2bytes)
            longPressTot = input.bytes[2] + (input.bytes[3] * 256);			//The total longpresses (2bytes)
			/*reserved bytes */												//2 bytes reserved for future use
            voltage = sflt162f(input.bytes[6]+(input.bytes[7]*256)) * 10;	//voltage is saved as 2byte float. Multiply by 10 to get node votlage.
            return {
                data: {
                    shortPressTot,
                    longPressTot,
                    voltage
                },
                warnings: [],
                errors: []
            };
        default:
            return {
                data: {
                },
                warnings: ["usupported fPort"],
                errors: []
            };

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

