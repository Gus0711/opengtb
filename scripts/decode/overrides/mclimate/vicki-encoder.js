// MClimate Vicki — encoder downlink (override OpenGTB)
//
// TTN ne livre pas d'encoder pour la gamme MClimate. Cette implémentation
// vient directement de MClimate (fournie par l'utilisateur, équivalente à
// la lib publique MClimate/mclimate-payload-helper — Licence ISC).
//
// Style switch-on-key qu'opengtb sait extraire : chaque `case "X":` devient
// un champ du formulaire généré, le contenu du case sert à inférer le type
// (no-param vs scalaire vs objet vs string).

function encodeDownlink(input) {
	var bytes = [];
	for (var key of Object.keys(input.data)) {
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
			case "recalibrateMotor": {
				bytes.push(0x03);
				break;
			}
			case "getDeviceVersions": {
				bytes.push(0x04);
				break;
			}
			case "setOpenWindow": {
				var enabled = Number(input.data.setOpenWindow.enabled);
				var closeTime = parseInt(input.data.setOpenWindow.closeTime / 5);
				var delta = parseInt(input.data.setOpenWindow.delta, 8);
				var motorPosition = input.data.setOpenWindow.motorPosition;
				var motorPositionFirstPart = motorPosition & 0xff;
				var motorPositionSecondPart = (motorPosition >> 8) & 0xff;
				bytes.push(0x06);
				bytes.push(enabled);
				bytes.push(closeTime);
				bytes.push(motorPositionFirstPart);
				bytes.push((motorPositionSecondPart << 4) | delta);
				break;
			}
			case "getOpenWindowParams": {
				bytes.push(0x13);
				break;
			}
			case "setChildLock": {
				bytes.push(0x07);
				bytes.push(Number(input.data.setChildLock));
				break;
			}
			case "getChildLock": {
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
			case "forceClose": {
				bytes.push(0x0b);
				break;
			}
			case "setInternalAlgoParams": {
				bytes.push(0x0c);
				bytes.push(input.data.setInternalAlgoParams.pFirstLast);
				bytes.push(input.data.setInternalAlgoParams.pNext);
				break;
			}
			case "getInternalAlgoParams": {
				bytes.push(0x16);
				break;
			}
			case "setInternalAlgoTdiffParams": {
				bytes.push(0x1a);
				bytes.push(input.data.setInternalAlgoTdiffParams.cold);
				bytes.push(input.data.setInternalAlgoTdiffParams.warm);
				break;
			}
			case "getInternalAlgoTdiffParams": {
				bytes.push(0x17);
				break;
			}
			case "setOperationalMode": {
				bytes.push(0x0d);
				bytes.push(input.data.setOperationalMode);
				break;
			}
			case "getOperationalMode": {
				bytes.push(0x18);
				break;
			}
			case "setTargetTemperature": {
				bytes.push(0x0e);
				bytes.push(input.data.setTargetTemperature);
				break;
			}
			case "setExternalTemperature": {
				bytes.push(0x0f);
				bytes.push(input.data.setExternalTemperature);
				break;
			}
			case "setJoinRetryPeriod": {
				// period should be passed in minutes
				// NB : la version upstream utilise `int(...)` qui n'existe pas en JS
				// — corrigé en `Math.floor(...)` (intention claire d'arrondir vers le bas).
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
			case "setTargetTemperatureAndMotorPosition": {
				bytes.push(0x31);
				bytes.push(input.data.setTargetTemperatureAndMotorPosition.motorPosition);
				bytes.push(input.data.setTargetTemperatureAndMotorPosition.targetTemperature);
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
			case "setPrimaryOperationalMode": {
				bytes.push(0x1e);
				bytes.push(input.data.setPrimaryOperationalMode);
				break;
			}
			case "getPrimaryOperationalMode": {
				bytes.push(0x1f);
				break;
			}
			case "setProportionalAlgorithmParameters": {
				bytes.push(0x2a);
				bytes.push(input.data.setProportionalAlgorithmParameters.coefficient);
				bytes.push(input.data.setProportionalAlgorithmParameters.period);
				break;
			}
			case "getProportionalAlgorithmParameters": {
				bytes.push(0x29);
				break;
			}
			case "setTemperatureControlAlgorithm": {
				bytes.push(0x2c);
				bytes.push(input.data.setTemperatureControlAlgorithm);
				break;
			}
			case "getTemperatureControlAlgorithm": {
				bytes.push(0x2b);
				break;
			}
			case "setMotorPositionOnly": {
				var motorPositionOnly = input.data.setMotorPositionOnly;
				var motorPositionOnlyFirstPart = motorPositionOnly & 0xff;
				var motorPositionOnlySecondPart = (motorPositionOnly >> 8) & 0xff;
				bytes.push(0x2d);
				bytes.push(motorPositionOnlySecondPart);
				bytes.push(motorPositionOnlyFirstPart);
				break;
			}
			case "deviceReset": {
				bytes.push(0x30);
				break;
			}
			case "setChildLockBehavior": {
				bytes.push(0x35);
				bytes.push(input.data.setChildLockBehavior);
				break;
			}
			case "getChildLockBehavior": {
				bytes.push(0x34);
				break;
			}
			case "setProportionalGain": {
				var kp = Math.round(input.data.setProportionalGain * 131072);
				var kpFirstPart = kp & 0xff;
				var kpSecondPart = (kp >> 8) & 0xff;
				var kpThirdPart = (kp >> 16) & 0xff;
				bytes.push(0x37);
				bytes.push(kpThirdPart);
				bytes.push(kpSecondPart);
				bytes.push(kpFirstPart);
				break;
			}
			case "getProportionalGain": {
				bytes.push(0x36);
				break;
			}
			case "setExternalTemperatureFloat": {
				var extTemp = input.data.setExternalTemperatureFloat * 10;
				var extTempFirstPart = extTemp & 0xff;
				var extTempSecondPart = (extTemp >> 8) & 0xff;
				bytes.push(0x3c);
				bytes.push(extTempSecondPart);
				bytes.push(extTempFirstPart);
				break;
			}
			case "setIntegralGain": {
				var ki = Math.round(input.data.setIntegralGain * 131072);
				var kiFirstPart = ki & 0xff;
				var kiSecondPart = (ki >> 8) & 0xff;
				var kiThirdPart = (ki >> 16) & 0xff;
				bytes.push(0x3e);
				bytes.push(kiThirdPart);
				bytes.push(kiSecondPart);
				bytes.push(kiFirstPart);
				break;
			}
			case "getIntegralGain": {
				bytes.push(0x3d);
				break;
			}
			case "setPiRunPeriod": {
				bytes.push(0x41);
				bytes.push(input.data.setPiRunPeriod);
				break;
			}
			case "getPiRunPeriod": {
				bytes.push(0x40);
				break;
			}
			case "setTempHysteresis": {
				var tempHysteresis = input.data.setTempHysteresis * 10;
				bytes.push(0x43);
				bytes.push(tempHysteresis);
				break;
			}
			case "getTempHysteresis": {
				bytes.push(0x42);
				break;
			}
			case "setOpenWindowPrecisely": {
				var enabledPrec = input.data.setOpenWindowPrecisely.enabled ? 1 : 0;
				var durationPrec = parseInt(input.data.setOpenWindowPrecisely.duration) / 5;
				var deltaPrec = input.data.setOpenWindowPrecisely.delta * 10;
				bytes.push(0x45);
				bytes.push(enabledPrec);
				bytes.push(durationPrec);
				bytes.push(deltaPrec);
				break;
			}
			case "getOpenWindowPrecisely": {
				bytes.push(0x46);
				break;
			}
			case "setForceAttach": {
				bytes.push(0x47);
				bytes.push(input.data.setForceAttach);
				break;
			}
			case "setValveOpenness": {
				bytes.push(0x4e);
				bytes.push(input.data.setValveOpenness);
				break;
			}
			case "getForceAttach": {
				bytes.push(0x48);
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
