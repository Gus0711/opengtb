// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : MClimate
// Device       : Fan Coil Thermostat
// fPort(s)     : 2
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/mclimate/fan-coil-thermostat.js
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/scripts/decode/overrides/mclimate/fan-coil-thermostat-encoder.js
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
function decodeUplink(input) {
    try {
        var bytes = input.bytes;
        var data = {};
        const toBool = value => value == '1';
        var calculateTemperature = function (rawData) { return (rawData - 400) / 10 };
        var calculateHumidity = function (rawData) { return (rawData * 100) / 256 };
        var decbin = function (number) {
            if (number < 0) {
                number = 0xFFFFFFFF + number + 1
            }
            number = number.toString(2);
            return "00000000".substr(number.length) + number;
        }
        function handleKeepalive(bytes, data) {
            var tempDec = parseInt(`${decbin(bytes[1])}${decbin(bytes[2])}`, 2);
            var temperatureValue = calculateTemperature(tempDec);
            var humidityValue = calculateHumidity(bytes[3]);
            var targetTemperature = parseInt(`${decbin(bytes[4])}${decbin(bytes[5])}`, 2) / 10;
            var operationalMode = bytes[6];
            var displayedFanSpeed = bytes[7];
            var actualFanSpeed = bytes[8];
            var valveStatus = bytes[9];
            var deviceStatus = bytes[10];

            data.sensorTemperature = Number(temperatureValue.toFixed(2));
            data.relativeHumidity = Number(humidityValue.toFixed(2));
            data.targetTemperature = targetTemperature;
            data.operationalMode = operationalMode;
            data.displayedFanSpeed = displayedFanSpeed;
            data.actualFanSpeed = actualFanSpeed;
            data.valveStatus = valveStatus;
            data.deviceStatus = deviceStatus;
            return data;
        }

        function handleResponse(bytes, data) {
            var commands = bytes.map(function (byte) {
                return ("0" + byte.toString(16)).substr(-2);
            });
            commands = commands.slice(0, -11);
            var command_len = 0;

            commands.map(function (command, i) {
                switch (command) {
                    case '04':
                        {
                            command_len = 2;
                            var hardwareVersion = commands[i + 1];
                            var softwareVersion = commands[i + 2];
                            data.deviceVersions = { hardware: Number(hardwareVersion), software: Number(softwareVersion) };
                        }
                        break;
                    case '05':
                        {
                            command_len = 1;
                            data.targetTemperatureStep = parseInt(commands[i + 1], 16) / 10
                        }
                        break;
                    case '12':
                        {
                            command_len = 1;
                            data.keepAliveTime = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '14':
                        {
                            command_len = 1;
                            data.keysLock = toBool(parseInt(commands[i + 1], 16));
                        }
                        break;
                    case '15':
                        {
                            command_len = 2;
                            data.temperatureRangeSettings = { min: parseInt(commands[i + 1], 16), max: parseInt(commands[i + 2], 16) };
                        }
                        break;
                    case '19':
                        {
                            command_len = 1;
                            var commandResponse = parseInt(commands[i + 1], 16);
                            var periodInMinutes = commandResponse * 5 / 60;
                            data.joinRetryPeriod = periodInMinutes;
                        }
                        break;
                    case '1b':
                        {
                            command_len = 1;
                            data.uplinkType = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '1d':
                        {
                            command_len = 2;
                            var deviceKeepAlive = 5;
                            var wdpC = commands[i + 1] == '00' ? false : commands[i + 1] * deviceKeepAlive + 7;
                            var wdpUc = commands[i + 2] == '00' ? false : parseInt(commands[i + 2], 16);
                            data.watchDogParams = { wdpC: wdpC, wdpUc: wdpUc };
                        }
                        break;
                    case '2f':
                        {
                            command_len = 1;
                            data.targetTemperature = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '30':
                        {
                            command_len = 1;
                            data.manualTargetTemperatureUpdate = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '32':
                        {
                            command_len = 1;
                            data.valveOpenCloseTime = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '34':
                        {
                            command_len = 1;
                            data.displayRefreshPeriod = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '36':
                        {
                            command_len = 1;
                            data.extAutomaticTemperatureControl = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '3e':
                        {
                            command_len = 2;
                            data.extSensorTemperature = parseInt(`${commands[i + 1]}${commands[i + 2]}`, 16);
                        }
                        break;
                    case '41':
                        {
                            command_len = 1;
                            data.currentTemperatureVisibility = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '43':
                        {
                            command_len = 1;
                            data.humidityVisibility = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '45':
                        {
                            command_len = 1;
                            data.fanSpeed = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '47':
                        {
                            command_len = 1;
                            data.fanSpeedLimit = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '49':
                        {
                            command_len = 2;
                            data.ecmVoltageRange = { min: parseInt(commands[i + 1], 16) / 10, max: parseInt(commands[i + 2], 16) / 10 };
                        }
                        break;
                    case '4b':
                        {
                            command_len = 1;
                            data.ecmStartUpTime = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '4d':
                        {
                            command_len = 1;
                            data.ecmRelay = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '4f':
                        {
                            command_len = 1;
                            data.frostProtection = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '51':
                        {
                            command_len = 2;
                            data.frostProtectionSettings = { threshold: parseInt(commands[i + 1], 16), setpoint: parseInt(commands[i + 2], 16) };
                        }
                        break;
                    case '55':
                        {
                            command_len = 1;
                            data.allowedOperationalModes = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '57':
                        {
                            command_len = 1;
                            data.coolingSetpointNotOccupied = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '59':
                        {
                            command_len = 1;
                            data.heatingSetpointNotOccupied = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '5b':
                        {
                            command_len = 2;
                            data.tempSensorCompensation = { compensation: parseInt(commands[i + 1], 16), temperature: parseInt(commands[i + 2], 16) };
                        }
                        break;
                    case '5d':
                        {
                            command_len = 1;
                            data.fanSpeedNotOccupied = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '5f':
                        {
                            command_len = 1;
                            data.automaticChangeover = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '61':
                        {
                            command_len = 1;
                            data.wiringDiagram = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '63':
                        {
                            command_len = 1;
                            data.occFunction = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '65':
                        {
                            command_len = 2;
                            data.automaticChangeoverThreshold = { coolingThreshold: parseInt(commands[i + 1], 16), heatingThreshold: parseInt(commands[i + 2], 16) };
                        }
                        break;
                    case '69':
                        {
                            command_len = 1;
                            data.returnOfPowerOperation = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '6b':
                        {
                            command_len = 1;
                            data.deltaTemperature1 = parseInt(commands[i + 1], 16) / 10;
                        }
                        break;
                    case '6d':
                        {
                            command_len = 2;
                            data.deltaTemperature2and3 = { deltaTemperature2: parseInt(commands[i + 1], 16) * 10, deltaTemperature3: parseInt(commands[i + 2], 16) * 10 };
                        }
                        break;
                    case '6e':
                        {
                            command_len = 1;
                            data.frostProtectionStatus = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '70':
                        {
                            command_len = 1;
                            data.occupancySensorStatusSetPoint = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '71':
                        {
                            command_len = 1;
                            data.occupancySensorStatus = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '72':
                        {
                            command_len = 1;
                            data.dewPointSensorStatus = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '73':
                        {
                            command_len = 1;
                            data.filterAlarm = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '74':
                        {
                            command_len = 2;
                            data.automaticChangeoverMode = { ntcTemperature: parseInt(commands[i + 1], 16), automaticChangeover: parseInt(commands[i + 2], 16) };
                        }
                        break;
                    case '75':
                        {
                            command_len = 1;
                            data.powerModuleStatus = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case 'a0':
                        {
                            command_len = 4;
                            let fuota_address = parseInt(`${commands[i + 1]}${commands[i + 2]}${commands[i + 3]}${commands[i + 4]}`, 16)
                            let fuota_address_raw = `${commands[i + 1]}${commands[i + 2]}${commands[i + 3]}${commands[i + 4]}`
                            data.fuota = { fuota_address, fuota_address_raw };
                        }
                        break;
                    default:
                        break;
                }
                commands.splice(i, command_len);
            });
            return data;
        }
        if (bytes[0] == 1) {
            data = handleKeepalive(bytes, data);
        } else {
            data = handleResponse(bytes, data);
            bytes = bytes.slice(-11);
            data = handleKeepalive(bytes, data);
        }
        return { data: data };
    } catch (e) {
        throw new Error('Unhandled data');
    }
}

	if (typeof decodeUplink === 'function') {
		__ogtb_decode_uplink = decodeUplink;
	} else if (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function') {
		__ogtb_decode_uplink = codec.decodeUplink;
	}
})();

// ─── Source encoder (TTN downlinkEncoder : null) ─────────
(function () {
// MClimate Fan Coil Thermostat — encoder downlink (override OpenGTB)
//
// Source : fournie par l'utilisateur, équivalente à la version publique
// MClimate/mclimate-payload-helper (Licence ISC).
//
// Bugs upstream corrigés (sans changer le contrat de bytes) :
//   - `int(periodToPass)`            → `Math.floor(...)` (int n'existe pas en JS).
//   - `for (key in input.data)`      → `for (var key in input.data)` (sinon
//                                       leak global, casse en strict mode et
//                                       dans l'IIFE de wrap ChirpStack).
//   - `input.data.SetWatchDogParams` → `input.data.setWatchDogParams` (la
//                                       casse divergeait du `case` label,
//                                       la commande aurait planté).
//   - second `case "setEcmVoltageRange"` → renommé `getEcmVoltageRange`
//                                          (cmdId 0x49, doublon avec setter
//                                          sinon le getter était inatteignable).
//   - second `case "setEcmStartUpTime"`  → renommé `getEcmStartUpTime`
//                                          (cmdId 0x4B, idem).
//   - cases dupliqués `getDewPointSensorStatus` (0x72) et `getFilterAlarm`
//     (0x73) : conservés une seule fois.
//
// À noter : `getFrostProtection` et `getEcmRelay` retournent tous deux
// cmdId 0x4D dans l'upstream — collision laissée telle quelle, à vérifier
// contre la datasheet MClimate si tu rencontres un comportement bizarre.

function Encode(port, obj) {
	return encodeDownlink({ fPort: port, data: obj }).bytes;
}

function Encoder(port, obj) {
	return encodeDownlink({ fPort: port, data: obj }).bytes;
}

function encodeDownlink(input) {
	var bytes = [];
	for (var key in input.data) {
		switch (key) {
			case "setKeepAlive": {
				bytes.push(0x02);
				bytes.push(input.data.setKeepAlive);
				break;
			}
			case "getKeepAliveTime": {
				bytes.push(0x12);
				break;
			}
			case "getDeviceVersions": {
				bytes.push(0x04);
				break;
			}
			case "setTargetTemperature": {
				var temp = input.data.setTargetTemperature * 10;
				var tempFirstPart = temp & 0xff;
				var tempSecondPart = (temp >> 8) & 0xff;
				bytes.push(0x2e);
				bytes.push(tempSecondPart);
				bytes.push(tempFirstPart);
				break;
			}
			case "setTargetTemperatureStep": {
				bytes.push(0x03);
				bytes.push(input.data.setTargetTemperatureStep);
				break;
			}
			case "getTargetTemperatureStep": {
				bytes.push(0x05);
				break;
			}
			case "setKeysLock": {
				bytes.push(0x07);
				bytes.push(input.data.setKeysLock);
				break;
			}
			case "getKeysLock": {
				bytes.push(0x14);
				break;
			}
			case "setTemperatureRange": {
				bytes.push(0x08);
				bytes.push(input.data.setTemperatureRange.min);
				bytes.push(input.data.setTemperatureRange.max);
				break;
			}
			case "getTemperatureRange": {
				bytes.push(0x15);
				break;
			}
			case "setJoinRetryPeriod": {
				// period should be passed in minutes
				var periodToPass = (input.data.setJoinRetryPeriod * 60) / 5;
				periodToPass = Math.floor(periodToPass);
				bytes.push(0x10);
				bytes.push(periodToPass);
				break;
			}
			case "getJoinRetryPeriod": {
				bytes.push(0x19);
				break;
			}
			case "setUplinkType": {
				bytes.push(0x11);
				bytes.push(input.data.setUplinkType);
				break;
			}
			case "getUplinkType": {
				bytes.push(0x1b);
				break;
			}
			case "setWatchDogParams": {
				bytes.push(0x1c);
				bytes.push(input.data.setWatchDogParams.confirmedUplinks);
				bytes.push(input.data.setWatchDogParams.unconfirmedUplinks);
				break;
			}
			case "getWatchDogParams": {
				bytes.push(0x1d);
				break;
			}
			case "SetValveOpenCloseTime": {
				bytes.push(0x31);
				bytes.push(input.data.SetValveOpenCloseTime);
				break;
			}
			case "GetValveOpenCloseTime": {
				bytes.push(0x32);
				break;
			}
			case "SetDisplayRefreshPeriod": {
				bytes.push(0x33);
				bytes.push(input.data.SetDisplayRefreshPeriod);
				break;
			}
			case "GetDisplayRefreshPeriod": {
				bytes.push(0x34);
				break;
			}
			case "SetCurrentTemperatureVisibility": {
				bytes.push(0x40);
				bytes.push(input.data.SetCurrentTemperatureVisibility);
				break;
			}
			case "GetCurrentTemperatureVisibility": {
				bytes.push(0x41);
				break;
			}
			case "SetHumidityVisibility": {
				bytes.push(0x42);
				bytes.push(input.data.SetHumidityVisibility);
				break;
			}
			case "GetHumidityVisibility": {
				bytes.push(0x43);
				break;
			}
			case "SetFanSpeed": {
				bytes.push(0x44);
				bytes.push(input.data.SetFanSpeed);
				break;
			}
			case "GetFanSpeed": {
				bytes.push(0x45);
				break;
			}
			case "SetFanSpeedLimit": {
				bytes.push(0x46);
				bytes.push(input.data.SetFanSpeedLimit);
				break;
			}
			case "GetFanSpeedLimit": {
				bytes.push(0x47);
				break;
			}
			case "setEcmVoltageRange": {
				bytes.push(0x48);
				bytes.push(input.data.setEcmVoltageRange.min * 10);
				bytes.push(input.data.setEcmVoltageRange.max * 10);
				break;
			}
			case "getEcmVoltageRange": {
				bytes.push(0x49);
				break;
			}
			case "setEcmStartUpTime": {
				bytes.push(0x4a);
				bytes.push(input.data.setEcmStartUpTime);
				break;
			}
			case "getEcmStartUpTime": {
				bytes.push(0x4b);
				break;
			}
			case "setEcmRelay": {
				bytes.push(0x4c);
				bytes.push(input.data.setEcmRelay);
				break;
			}
			case "getEcmRelay": {
				bytes.push(0x4d);
				break;
			}
			case "setFrostProtection": {
				bytes.push(0x4f);
				bytes.push(input.data.setFrostProtection);
				break;
			}
			case "getFrostProtection": {
				// NB : collision cmdId avec getEcmRelay dans l'upstream, conservée tel quel
				bytes.push(0x4d);
				break;
			}
			case "setFrostProtectionSettings": {
				bytes.push(0x50);
				bytes.push(input.data.setFrostProtectionSettings.threshold);
				bytes.push(input.data.setFrostProtectionSettings.setpoint);
				break;
			}
			case "getFrostProtectionSettings": {
				bytes.push(0x51);
				break;
			}
			case "setFctOperationalMode": {
				bytes.push(0x52);
				bytes.push(input.data.setFctOperationalMode);
				break;
			}
			case "getFctOperationalMode": {
				bytes.push(0x53);
				break;
			}
			case "setAllowedOperationalModes": {
				bytes.push(0x54);
				bytes.push(input.data.setAllowedOperationalModes);
				break;
			}
			case "getAllowedOperationalModes": {
				bytes.push(0x55);
				break;
			}
			case "setCoolingSetpointNotOccupied": {
				bytes.push(0x56);
				bytes.push(input.data.setCoolingSetpointNotOccupied);
				break;
			}
			case "getCoolingSetpointNotOccupied": {
				bytes.push(0x57);
				break;
			}
			case "setHeatingSetpointNotOccupied": {
				bytes.push(0x58);
				bytes.push(input.data.setHeatingSetpointNotOccupied);
				break;
			}
			case "getHeatingSetpointNotOccupied": {
				bytes.push(0x59);
				break;
			}
			case "setTempSensorCompensation": {
				bytes.push(0x5a);
				bytes.push(input.data.setTempSensorCompensation.compensation);
				bytes.push(input.data.setTempSensorCompensation.temperature * 10);
				break;
			}
			case "getTempSensorCompensation": {
				bytes.push(0x5b);
				break;
			}
			case "setFanSpeedNotOccupied": {
				bytes.push(0x5c);
				bytes.push(input.data.setFanSpeedNotOccupied);
				break;
			}
			case "getFanSpeedNotOccupied": {
				bytes.push(0x5d);
				break;
			}
			case "setAutomaticChangeover": {
				bytes.push(0x5e);
				bytes.push(input.data.setAutomaticChangeover);
				break;
			}
			case "getAutomaticChangeover": {
				bytes.push(0x5f);
				break;
			}
			case "setWiringDiagram": {
				bytes.push(0x60);
				bytes.push(input.data.setWiringDiagram);
				break;
			}
			case "getWiringDiagram": {
				bytes.push(0x61);
				break;
			}
			case "setOccFunction": {
				bytes.push(0x62);
				bytes.push(input.data.setOccFunction);
				break;
			}
			case "getOccFunction": {
				bytes.push(0x63);
				break;
			}
			case "setAutomaticChangeoverThreshold": {
				bytes.push(0x64);
				bytes.push(input.data.setAutomaticChangeoverThreshold.coolingThreshold);
				bytes.push(input.data.setAutomaticChangeoverThreshold.heatingThreshold);
				break;
			}
			case "getAutomaticChangeoverThreshold": {
				bytes.push(0x65);
				break;
			}
			case "setDeviceStatus": {
				bytes.push(0x66);
				bytes.push(input.data.setDeviceStatus);
				break;
			}
			case "getDeviceStatus": {
				bytes.push(0x67);
				break;
			}
			case "setReturnOfPowerOperation": {
				bytes.push(0x68);
				bytes.push(input.data.setReturnOfPowerOperation);
				break;
			}
			case "getReturnOfPowerOperation": {
				bytes.push(0x69);
				break;
			}
			case "setDeltaTemperature1": {
				bytes.push(0x6a);
				bytes.push(input.data.setDeltaTemperature1);
				break;
			}
			case "getDeltaTemperature1": {
				bytes.push(0x6b);
				break;
			}
			case "setDeltaTemperature2and3": {
				bytes.push(0x6c);
				bytes.push(input.data.setDeltaTemperature2and3.deltaTemperature2 * 10);
				bytes.push(input.data.setDeltaTemperature2and3.deltaTemperature3 * 10);
				break;
			}
			case "getDeltaTemperature2and3": {
				bytes.push(0x6d);
				break;
			}
			case "getFrostProtectionStatus": {
				bytes.push(0x6e);
				break;
			}
			case "getOccupancySensorStatusSetPoint": {
				bytes.push(0x70);
				break;
			}
			case "getOccupancySensorStatus": {
				bytes.push(0x71);
				break;
			}
			case "getDewPointSensorStatus": {
				bytes.push(0x72);
				break;
			}
			case "getFilterAlarm": {
				bytes.push(0x73);
				break;
			}
			case "sendCustomHexCommand": {
				var sendCustomHexCommand = input.data.sendCustomHexCommand;
				for (var i = 0; i < sendCustomHexCommand.length; i += 2) {
					var b = parseInt(sendCustomHexCommand.substr(i, 2), 16);
					bytes.push(b);
				}
				break;
			}
			default: {
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
