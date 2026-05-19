// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Teneo IoT
// Device       : Soil Moisture Sensor
// fPort(s)     : 1
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/teneo-iot/soil-moisture-sensor.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
// ─────────────────────────────────────────────────────────────────────

function decodeUplink(input){
	var data = {};
	data.sensorType = 'moisture';

	if (input.bytes.length === 0){
		data.valid = false;
		return{
			data: data
		}
	}

	data.settingsAllowed = true;
	data.moisture = 0;
	data.charging = false;
	data.battery = 2 + (input.bytes[0] / 10);

	if (input.fPort === 1){
		if (input.bytes.length === 2){
			data.valid = true;
			data.moisture = input.bytes[1];
		}
		else if (input.bytes.length === 6){
			data.valid = true;
			data.moisture = input.bytes[1];

			var temp = input.bytes[2]<<24>>16 | input.bytes[3];
			data.temperature = temp / 100;
		} else{
			data.valid = false;
			data.errorcode = -1;
		}
	} else if (input.fPort === 3){
		data.valid = false;
		data.charging = true;
	}

	return{
		data: data
	}
}