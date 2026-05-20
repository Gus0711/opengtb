// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : MClimate
// Device       : 16A Dry Switch (16ADS)
// fPort(s)     : 2
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/mclimate/16ads.js
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/scripts/decode/overrides/mclimate/16ads-encoder.js
// Préparé par  : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. Console TTN → Application → Payload formatters
//   2. Type : « Custom JavaScript formatter »
//   3. Onglet « Uplink » → coller ce fichier intégralement
//   4. (optionnel) Onglet « Downlink » → encodeDownlink est dans le même fichier
// ─────────────────────────────────────────────────────────────────────

// Codec OpenGTB — combinaison decoder + encoder (fichiers TTN distincts).
// Chaque source TTN est encapsulé dans son propre IIFE pour éviter les
// collisions quand chaque fichier déclare sa propre `decodeUplink`.
var __ogtb_decode_uplink;
var __ogtb_encode_downlink;

// ─── Source decoder (TTN uplinkDecoder) ────────────────────────────
(function () {
const decodeUplink = (input) => {
    try {
        let { bytes } = input;
        let data = {};

        const handleKeepalive = (bytes, data) => {
            // Temperature sign and internal temperature
            const isNegative = (bytes[1] & 0x80) !== 0; // Check the 7th bit for the sign

            let temperature = bytes[1] & 0x7F; // Mask out the 7th bit to get the temperature value
            data.internalTemperature = isNegative ? -temperature : temperature;

            // Relay state
            data.relayState = bytes[2] === 0x01 ? "ON" : "OFF";

            return data;
        };

        const handleResponse = (bytes, data) => {
            let commands = bytes.map(byte => (`0${byte.toString(16)}`).slice(-2)).slice(0, -3);
            let command_len = 0;

            commands.forEach((command, i) => {
                switch (command) {
                    case '04': {
                        command_len = 2;
                        const hardwareVersion = commands[i + 1];
                        const softwareVersion = commands[i + 2];
                        data.deviceVersions = {
                            hardware: Number(hardwareVersion),
                            software: Number(softwareVersion),
                        };
                        break;
                    }
                    case '12': {
                        command_len = 1;
                        data.keepAliveTime = parseInt(commands[i + 1], 16);
                        break;
                    }
                    case '19': {
                        command_len = 1;
                        const commandResponse = parseInt(commands[i + 1], 16);
                        const periodInMinutes = (commandResponse * 5) / 60;
                        data.joinRetryPeriod = periodInMinutes;
                        break;
                    }
                    case '1b': {
                        command_len = 1;
                        data.uplinkType = parseInt(commands[i + 1], 16);
                        break;
                    }
                    case '1d': {
                        command_len = 2;
                        const wdpC = commands[i + 1] === '00' ? false : parseInt(commands[i + 1], 16);
                        const wdpUc = commands[i + 2] === '00' ? false : parseInt(commands[i + 2], 16);
                        data.watchDogParams = { wdpC, wdpUc };
                        break;
                    }
                    case '1f': {
                        command_len = 2;
                        data.overheatingThresholds = {
                            trigger: parseInt(commands[i + 1], 16),
                            recovery: parseInt(commands[i + 2], 16),
                        };
                        break;
                    }
                    case '5a': {
                        command_len = 1;
                        data.afterOverheatingProtectionRecovery = parseInt(commands[i + 1], 16);
                        break;
                    }
                    case '5c': {
                        command_len = 1;
                        data.ledIndicationMode = parseInt(commands[i + 1], 16);
                        break;
                    }
                    case '5d': {
                        command_len = 1;
                        data.manualChangeRelayState = parseInt(commands[i + 1], 16) === 0x01;
                        break;
                    }
                    case '5f': {
                        command_len = 1;
                        data.relayRecoveryState = parseInt(commands[i + 1], 16);
                        break;
                    }
                    case '60': {
                        command_len = 2;
                        data.overheatingEvents = {
                            events: parseInt(commands[i + 1], 16),
                            temperature: parseInt(commands[i + 2], 16),
                        };
                        break;
                    }
                    case '70': {
                        command_len = 2;
                        data.overheatingRecoveryTime = (parseInt(commands[i + 1], 16) << 8) | parseInt(commands[i + 2], 16);
                        break;
                    }
                    case 'b1': {
                        command_len = 1;
                        data.relayState = parseInt(commands[i + 1], 16) === 0x01;
                        break;
                    }
                    case 'a0': {
                        command_len = 4;
                        const fuota_address = parseInt(
                            `${commands[i + 1]}${commands[i + 2]}${commands[i + 3]}${commands[i + 4]}`,
                            16
                        );
                        const fuota_address_raw = `${commands[i + 1]}${commands[i + 2]}${commands[i + 3]}${commands[i + 4]}`;
                        data.fuota = { fuota_address, fuota_address_raw };
                        break;
                    }
                    case 'a4': {
                        command_len = 1;
                        data.region = parseInt(commands[i + 1], 16);
                        break;
                    }
                    default:
                        break;
                }
                commands.splice(i, command_len);
            });

            return data;
        };

        if (bytes[0] === 1) {
            data = handleKeepalive(bytes, data);
        } else {
            data = handleResponse(bytes, data);
            bytes = bytes.slice(-3);
            data = handleKeepalive(bytes, data);
        }

        return { data };
    } catch (e) {
        console.log(e);
        throw new Error('Unhandled data');
    }
};

	if (typeof decodeUplink === 'function') {
		__ogtb_decode_uplink = decodeUplink;
	} else if (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function') {
		__ogtb_decode_uplink = codec.decodeUplink;
	}
})();

// ─── Source encoder (TTN downlinkEncoder : null) ─────────
(function () {
// MClimate 16A Dry Switch (16ADS) — encoder downlink (override OpenGTB)
//
// Source : fournie par l'utilisateur, équivalente à la version publique
// MClimate/mclimate-payload-helper (Licence ISC).
//
// Aucun bug upstream à corriger sur cette version : `var key, i;` est
// déclaré, `hasOwnProperty` guard en place, `Math.floor` utilisé pour
// la conversion period. Sauvegarde quasi verbatim.

function encodeDownlink(input) {
	var bytes = [];
	var key, i;
	for (key in input.data) {
		if (input.data.hasOwnProperty(key)) {
			switch (key) {
				case "setKeepAlive":
					bytes.push(0x02);
					bytes.push(input.data.setKeepAlive);
					break;
				case "getKeepAliveTime":
					bytes.push(0x12);
					break;
				case "getDeviceVersions":
					bytes.push(0x04);
					break;
				case "setJoinRetryPeriod":
					var periodToPass = Math.floor((input.data.setJoinRetryPeriod * 60) / 5);
					bytes.push(0x10);
					bytes.push(periodToPass);
					break;
				case "getJoinRetryPeriod":
					bytes.push(0x19);
					break;
				case "setUplinkType":
					bytes.push(0x11);
					bytes.push(input.data.setUplinkType);
					break;
				case "getUplinkType":
					bytes.push(0x1b);
					break;
				case "setWatchDogParams":
					bytes.push(0x1c);
					bytes.push(input.data.setWatchDogParams.confirmedUplinks);
					bytes.push(input.data.setWatchDogParams.unconfirmedUplinks);
					break;
				case "getWatchDogParams":
					bytes.push(0x1d);
					break;
				case "setOverheatingThresholds":
					bytes.push(0x1e);
					bytes.push(input.data.setOverheatingThresholds.trigger);
					bytes.push(input.data.setOverheatingThresholds.recovery);
					break;
				case "getOverheatingThresholds":
					bytes.push(0x1f);
					break;
				case "getRelayStateChangeReason":
					bytes.push(0x54);
					break;
				case "setRelayTimerMiliseconds": {
					var stateMs = input.data.setRelayTimerMiliseconds.state;
					var timeMs = input.data.setRelayTimerMiliseconds.time;
					var timeMsLow = timeMs & 0xff;
					var timeMsHigh = (timeMs >> 8) & 0xff;
					bytes.push(0x55);
					bytes.push(stateMs);
					bytes.push(timeMsHigh);
					bytes.push(timeMsLow);
					break;
				}
				case "getRelayTimerMiliseconds":
					bytes.push(0x56);
					break;
				case "setRelayTimerSeconds": {
					var stateSec = input.data.setRelayTimerSeconds.state;
					var timeSec = input.data.setRelayTimerSeconds.time;
					var timeSecLow = timeSec & 0xff;
					var timeSecHigh = (timeSec >> 8) & 0xff;
					bytes.push(0x57);
					bytes.push(stateSec);
					bytes.push(timeSecHigh);
					bytes.push(timeSecLow);
					break;
				}
				case "getRelayTimerSeconds":
					bytes.push(0x58);
					break;
				case "setAfterOverheatingProtectionRecovery":
					bytes.push(0x59);
					bytes.push(input.data.setAfterOverheatingProtectionRecovery);
					break;
				case "getAfterOverheatingProtectionRecovery":
					bytes.push(0x5a);
					break;
				case "setLedIndicationMode":
					bytes.push(0x5b);
					bytes.push(input.data.setLedIndicationMode);
					break;
				case "getLedIndicationMode":
					bytes.push(0x5c);
					break;
				case "setRelayRecoveryState":
					bytes.push(0x5e);
					bytes.push(input.data.setRelayRecoveryState);
					break;
				case "getRelayRecoveryState":
					bytes.push(0x5f);
					break;
				case "setRelayState":
					bytes.push(0xc1);
					bytes.push(input.data.setRelayState);
					break;
				case "getRelayState":
					bytes.push(0xb1);
					break;
				case "getOverheatingEvents":
					bytes.push(0x60);
					break;
				case "getOverheatingRecoveryTime":
					bytes.push(0x70);
					break;
				case "sendCustomHexCommand":
					var sendCustomHexCommand = input.data.sendCustomHexCommand;
					for (i = 0; i < sendCustomHexCommand.length; i += 2) {
						var b = parseInt(sendCustomHexCommand.substr(i, 2), 16);
						bytes.push(b);
					}
					break;
				default:
					break;
			}
		}
	}
	return {
		bytes: bytes,
		fPort: 1,
		warnings: [],
		errors: []
	};
}

function decodeDownlink(input) {
	return {
		data: {
			bytes: input.bytes
		},
		warnings: [],
		errors: []
	};
}

	if (typeof encodeDownlink === 'function') {
		__ogtb_encode_downlink = encodeDownlink;
	} else if (typeof codec !== 'undefined' && codec && typeof codec.encodeDownlink === 'function') {
		__ogtb_encode_downlink = codec.encodeDownlink;
	}
})();

function decodeUplink(input) {
	if (typeof __ogtb_decode_uplink !== 'function') {
		return { data: {}, warnings: [], errors: ['decodeUplink TTN introuvable dans le codec source'] };
	}
	return __ogtb_decode_uplink(input);
}

function encodeDownlink(input) {
	if (typeof __ogtb_encode_downlink !== 'function') {
		return { bytes: [], fPort: input && input.fPort, warnings: [], errors: ['encodeDownlink TTN introuvable dans le codec source'] };
	}
	return __ogtb_encode_downlink(input);
}
