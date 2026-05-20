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
