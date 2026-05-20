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
