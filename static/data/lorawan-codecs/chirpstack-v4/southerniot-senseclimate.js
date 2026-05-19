// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Southern IoT
// Device       : senseclimate
// fPort(s)     : 1
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/southerniot/senseclimate.js
// Adapté par   : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. ChirpStack → Device Profiles → <votre profil>
//   2. Onglet « Codec » → « JavaScript functions »
//   3. Coller ce fichier intégralement dans « Codec functions »
//
// Note : le codec TTN d'origine est conservé intact dans un IIFE ;
// la fonction decodeUplink exposée à ChirpStack le réinvoque et normalise
// la sortie au format { data, warnings, errors } attendu par v4 (TR013).
// ─────────────────────────────────────────────────────────────────────

var __opengtb_ttn_decode;
(function () {
	// ─── Source TTN v3 (intact) ─────────────────────────────────────────
// var directions = ['N', 'E', 'S', 'W'];
// var colors = ['red', 'green'];
// var degrees = {
//   N: 0,
//   E: 90,
//   S: 180,
//   W: 270,
// };

function decodeUplink(input) {
  switch (input.fPort) {
    case 1:
      return {
        // Decoded data
        data: {
          temperature : input.bytes[0],
          humidity : input.bytes[1]
        },
      };
    default:
      return {
        errors: ['unknown FPort'],
      };
  }
}

// function normalizeUplink(input) {
//   return {
//     // Normalized data
//     data: {
//       wind: {
//         direction: degrees[input.data.direction], // letter to degrees
//         speed: input.data.speed * 0.5144, // knots to m/s
//       },
//     },
//   };
// }

// function encodeDownlink(input) {
//   var i = colors.indexOf(input.data.led);
//   if (i === -1) {
//     return {
//       errors: ['invalid LED color'],
//     };
//   }
//   return {
//     // LoRaWAN FPort used for the downlink message
//     fPort: 2,
//     // Encoded bytes
//     bytes: [i],
//   };
// }

// function decodeDownlink(input) {
//   switch (input.fPort) {
//     case 2:
//       return {
//         // Decoded downlink (must be symmetric with encodeDownlink)
//         data: {
//           led: colors[input.bytes[0]],
//         },
//       };
//     default:
//       return {
//         errors: ['invalid FPort'],
//       };
//   }
// }
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
