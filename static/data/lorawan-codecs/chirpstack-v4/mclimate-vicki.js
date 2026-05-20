// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : MClimate
// Device       : Vicki - Smart Radiator Thermostat
// fPort(s)     : 1
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/mclimate/vicki.js
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/scripts/decode/overrides/mclimate/vicki-encoder.js
// Adapté par   : OpenGTB — https://opengtb.fr/outils/decode
// Licence      : Apache-2.0 (per upstream repo)
//
// Installation :
//   1. ChirpStack → Device Profiles → <votre profil>
//   2. Onglet « Codec » → « JavaScript functions »
//   3. Coller ce fichier intégralement dans « Codec functions »
//
// Note : le codec TTN d'origine est conservé intact dans un IIFE ;
// decodeUplink et encodeDownlink sont ré-exposés au top-level et
// normalisés au format TR013 attendu par v4.
// ─────────────────────────────────────────────────────────────────────

var __opengtb_ttn_decode;
var __opengtb_ttn_encode;
(function () {
	// ─── Source TTN v3 (intact) ─────────────────────────────────────────
// Codec OpenGTB — combinaison decoder + encoder (fichiers TTN distincts).
// Chaque source TTN est encapsulé dans son propre IIFE pour éviter les
// collisions quand chaque fichier déclare sa propre `decodeUplink`.
var __ogtb_decode_uplink;
var __ogtb_encode_downlink;

// ─── Source decoder (TTN uplinkDecoder) ────────────────────────────
(function () {
function decodeUplink(input) {
    var bytes = input.bytes;
    var data = {};
    var resultToPass = {};
    toBool = function (value) { return value == '1' };

    function merge_obj(obj1, obj2) {
        var obj3 = {};
        for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
        for (var attrname2 in obj2) { obj3[attrname2] = obj2[attrname2]; }
        return obj3;
    }

    function handleKeepalive(bytes, data){
        tmp = ("0" + bytes[6].toString(16)).substr(-2);
        motorRange1 = tmp[1];
        motorRange2 = ("0" + bytes[5].toString(16)).substr(-2);
        motorRange = parseInt("0x" + motorRange1 + motorRange2, 16);

        motorPos2 = ("0" + bytes[4].toString(16)).substr(-2);
        motorPos1 = tmp[0];
        motorPosition = parseInt("0x" + motorPos1 + motorPos2, 16);

        batteryTmp = ("0" + bytes[7].toString(16)).substr(-2)[0];
        batteryVoltageCalculated = 2 + parseInt("0x" + batteryTmp, 16) * 0.1;

        let decbin = (number) => {
            if (number < 0) {
                number = 0xFFFFFFFF + number + 1
            }
            number = number.toString(2);
            return "00000000".substr(number.length) + number;
        }
        byte7Bin = decbin(bytes[7]);
        openWindow = byte7Bin[4];
        highMotorConsumption = byte7Bin[5];
        lowMotorConsumption = byte7Bin[6];
        brokenSensor = byte7Bin[7];
        byte8Bin = decbin(bytes[8]);
        childLock = byte8Bin[0];
        calibrationFailed = byte8Bin[1];
        attachedBackplate = byte8Bin[2];
        perceiveAsOnline = byte8Bin[3];
        antiFreezeProtection = byte8Bin[4];

        var sensorTemp = 0;
        if (Number(bytes[0].toString(16))  == 1) {
            sensorTemp = (bytes[2] * 165) / 256 - 40;
        }

        if (Number(bytes[0].toString(16)) == 81) {
            sensorTemp = (bytes[2] - 28.33333) / 5.66666;
        }
        data.reason = Number(bytes[0].toString(16));
        data.targetTemperature = Number(bytes[1]);
        data.sensorTemperature = Number(sensorTemp.toFixed(2));
        data.relativeHumidity = Number(((bytes[3] * 100) / 256).toFixed(2));
        data.motorRange = motorRange;
        data.motorPosition = motorPosition;
        data.batteryVoltage = Number(batteryVoltageCalculated.toFixed(2));
        data.openWindow = toBool(openWindow);
        data.highMotorConsumption = toBool(highMotorConsumption);
        data.lowMotorConsumption = toBool(lowMotorConsumption);
        data.brokenSensor = toBool(brokenSensor);
        data.childLock = toBool(childLock);
        data.calibrationFailed = toBool(calibrationFailed);
        data.attachedBackplate = toBool(attachedBackplate);
        data.perceiveAsOnline = toBool(perceiveAsOnline);
        data.antiFreezeProtection = toBool(antiFreezeProtection);
        data.valveOpenness = motorRange != 0 ? Math.round((1-(motorPosition/motorRange))*100) : 0;
        if(!data.hasOwnProperty('targetTemperatureFloat')){
            data.targetTemperatureFloat = parseFloat(bytes[1])
        }
        return data;
    }
   
    function handleResponse(bytes, data){
        var commands = bytes.map(function(byte, i){
        	return ("0" + byte.toString(16)).substr(-2); 
        });
        commands = commands.slice(0,-9);
        var command_len = 0;

        commands.map(function (command, i) {
            switch (command) {
                case '04':
                    {
                        command_len = 2;
                        var hardwareVersion = commands[i + 1];
                        var softwareVersion = commands[i + 2];
                        var dataK = { deviceVersions: { hardware: Number(hardwareVersion), software: Number(softwareVersion) } };
                        resultToPass = merge_obj(resultToPass, dataK);
                    }
                break;
                case '12':
                    {
                        command_len = 1;
                        var dataC = { keepAliveTime: parseInt(commands[i + 1], 16) };
                        resultToPass = merge_obj(resultToPass, dataC);
                    }
                break;
                case '13':
                    {
                        command_len = 4;
                        var enabled = toBool(parseInt(commands[i + 1], 16));
                        var duration = parseInt(commands[i + 2], 16) * 5;
                        var tmp = ("0" + commands[i + 4].toString(16)).substr(-2);
                        var motorPos2 = ("0" + commands[i + 3].toString(16)).substr(-2);
                        var motorPos1 = tmp[0];
                        var motorPosition = parseInt('0x' + motorPos1 + motorPos2, 16);
                        var delta = Number(tmp[1]);

                        var dataD = { openWindowParams: { enabled: enabled, duration: duration, motorPosition: motorPosition, delta: delta } };
                        resultToPass = merge_obj(resultToPass, dataD);
                    }
                break;
                case '14':
                    {
                        command_len = 1;
                        var dataB = { childLock: toBool(parseInt(commands[i + 1], 16)) };
                        resultToPass = merge_obj(resultToPass, dataB);
                    }
                break;
                case '15':
                    {
                        command_len = 2;
                        var dataA = { temperatureRangeSettings: { min: parseInt(commands[i + 1], 16), max: parseInt(commands[i + 2], 16) } };
                        resultToPass = merge_obj(resultToPass, dataA);
                    }
                break;
                case '16':
                    {
                        command_len = 2;
                        var data = { internalAlgoParams: { period: parseInt(commands[i + 1], 16), pFirstLast: parseInt(commands[i + 2], 16), pNext: parseInt(commands[i + 3], 16) } };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '17':
                    {
                        command_len = 2;
                        var dataF = { internalAlgoTdiffParams: { warm: parseInt(commands[i + 1], 16), cold: parseInt(commands[i + 2], 16) } };
                        resultToPass = merge_obj(resultToPass, dataF);
                    }
                break;
                case '18':
                    {
                        command_len = 1;
                        var dataE = { operationalMode: parseInt(commands[i + 1], 16) };
                        resultToPass = merge_obj(resultToPass, dataE);
                    }
                break;
                case '19':
                    {
                        command_len = 1;
                        var commandResponse = parseInt(commands[i + 1], 16);
                        var periodInMinutes = commandResponse * 5 / 60;
                        var dataH = { joinRetryPeriod: periodInMinutes };
                        resultToPass = merge_obj(resultToPass, dataH);
                    }
                break;
                case '1b':
                    {
                        command_len = 1;
                        var dataG = { uplinkType: parseInt(commands[i + 1], 16) };
                        resultToPass = merge_obj(resultToPass, dataG);
                    }
                break;
                case '1d':
                    {
                        // get default keepalive if it is not available in data
                        command_len = 2;
                        var wdpC = commands[i + 1] == '00' ? false : parseInt(commands[i + 1], 16);
                        var wdpUc = commands[i + 2] == '00' ? false : parseInt(commands[i + 2], 16);
                        var dataJ = { watchDogParams: { wdpC: wdpC, wdpUc: wdpUc } };
                        resultToPass = merge_obj(resultToPass, dataJ);
                    }
                break;
                case '1f':
                    {
                        command_len = 1;
                        var data = {  primaryOperationalMode: commands[i + 1] };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '21':
                    {
                        command_len = 6;
                        var data = {batteryRangesBoundaries:{ 
                            Boundary1: parseInt(commands[i + 1] + commands[i + 2], 16), 
                            Boundary2: parseInt(commands[i + 3] + commands[i + 4], 16), 
                            Boundary3: parseInt(commands[i + 5] + commands[i + 6], 16), 
                        }};
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '23':
                    {
                        command_len = 4;
                        var data = {batteryRangesOverVoltage:{ 
                            Range1: parseInt(commands[i + 2], 16), 
                            Range2: parseInt(commands[i + 3], 16), 
                            Range3: parseInt(commands[i + 4], 16), 
                        }};
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '27':
                    {
                        command_len = 1;
                        var data = {OVAC: parseInt(commands[i + 1], 16)};
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '28':
                    {
                        command_len = 1;
                        var data = { manualTargetTemperatureUpdate: parseInt(commands[i + 1], 16) };
                        resultToPass = merge_obj(resultToPass, data);

                    }
                break;
                case '29':
                    {
                        command_len = 2;
                        var data = { proportionalAlgoParams: { coefficient: parseInt(commands[i + 1], 16), period: parseInt(commands[i + 2], 16) } };
                        resultToPass = merge_obj(resultToPass, data);

                    }
                break;
                case '2b':
                    {
                        command_len = 1;
                        var data = { algoType: commands[i + 1] };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '36':
                    {
                        command_len = 3;
                        var kp = parseInt(`${commands[i + 1]}${commands[i + 2]}${commands[i + 3]}`, 16) / 131072;
                        var data = { proportionalGain: Number(kp).toFixed(5) };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '3d':
                    {
                        command_len = 3;
                        var ki = parseInt(`${commands[i + 1]}${commands[i + 2]}${commands[i + 3]}`, 16) / 131072;
                        var data = { integralGain: Number(ki).toFixed(5) };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '3f':
                    {
                        command_len = 2;
                        var data = { integralValue : (parseInt(`${commands[i + 1]}${commands[i + 2]}`, 16))/10 };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '40':
                    {
                        command_len = 1;
                        var data = { piRunPeriod : parseInt(commands[i + 1], 16) };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '42':
                    {
                        command_len = 1;
                        var data = { tempHysteresis : parseInt(commands[i + 1], 16) };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '44':
                    {
                        command_len = 2;
                        var data = { extSensorTemperature : (parseInt(`${commands[i + 1]}${commands[i + 2]}`, 16))/10 };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '46':
                    {
                        command_len = 3;
                        var enabled = toBool(parseInt(commands[i + 1], 16));
                        var duration = parseInt(commands[i + 2], 16) * 5;
                        var delta = parseInt(commands[i + 3], 16) /10;

                        var data = { openWindowParams: { enabled: enabled, duration: duration, delta: delta } };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '48':
                    {
                        command_len = 1;
                        var data = { forceAttach : parseInt(commands[i + 1], 16) };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '4a':
                    {
                        command_len = 3;
                        var activatedTemperature = parseInt(commands[i + 1], 16)/10;
                        var deactivatedTemperature = parseInt(commands[i + 2], 16)/10;
                        var targetTemperature = parseInt(commands[i + 3], 16);

                        var data = { antiFreezeParams: { activatedTemperature, deactivatedTemperature, targetTemperature } };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '4d':
                    {
                        command_len = 2;
                        var data = { piMaxIntegratedError : (parseInt(`${commands[i + 1]}${commands[i + 2]}`, 16))/10 };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '50':
                    {
                        command_len = 2;
                        var data = { effectiveMotorRange: { minValveOpenness: 100 - parseInt(commands[i + 2], 16), maxValveOpenness: 100 - parseInt(commands[i + 1], 16) } };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '52':
                    {
                        command_len = 2;
                        var data = { targetTemperatureFloat : (parseInt(`${commands[i + 1]}${commands[i + 2]}`, 16))/10 };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                case '54':
                    {
                        command_len = 1;
                        var offset =  (parseInt(commands[i + 1], 16) - 28) * 0.176
                        var data = { temperatureOffset : offset };
                        resultToPass = merge_obj(resultToPass, data);
                    }
                break;
                default:
                    break;
            }
            commands.splice(i,command_len);
        });
        return resultToPass;
    }
    
    if (bytes[0].toString(16) == 1 || bytes[0].toString(16) == 129) {
        data = merge_obj(data, handleKeepalive(bytes, data));
    }else{
        data = merge_obj(data, handleResponse(bytes, data));
        bytes = bytes.slice(-9);
        data = merge_obj(data, handleKeepalive(bytes, data));
    }

    return {
        data: data
    };
}

function normalizeUplink(input) {
  const warnings = [];

  if (input.data.openWindow) {
    warnings.push("openWindow: true");
  }

  if (input.data.highMotorConsumption) {
    warnings.push("highMotorConsumption: true");
  }

  if (input.data.lowMotorConsumption) {
    warnings.push("lowMotorConsumption: true");
  }

  if (input.data.brokenSensor) {
    warnings.push("brokenSensor: true");
  }

  if (input.data.childLock) {
    warnings.push("childLock: true");
  }

  if (input.data.calibrationFailed) {
    warnings.push("calibrationFailed: true");
  }

  if (input.data.attachedBackplate) {
    warnings.push("attachedBackplate: true");
  }

  if (input.data.perceiveAsOnline) {
    warnings.push("perceiveAsOnline: true");
  }

  if (input.data.antiFreezeProtection) {
    warnings.push("antiFreezeProtection: true");
  }

  return {
    data: {
        air: {
            temperature: input.data.sensorTemperature,
            relativeHumidity: input.data.relativeHumidity,
        },
        battery: input.data.batteryVoltage,
    },
    warnings: warnings
  };
}

	if (typeof decodeUplink === 'function') {
		__ogtb_decode_uplink = decodeUplink;
	} else if (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function') {
		__ogtb_decode_uplink = codec.decodeUplink;
	}
})();

// ─── Source encoder (TTN downlinkEncoder : null) ─────────
(function () {
// MClimate Vicki — encoder downlink (override OpenGTB)
//
// TTN ne livre pas d'encoder pour la gamme MClimate. Cette implémentation
// est portée à la main depuis le package public MClimate :
//   https://github.com/MClimate/mclimate-payload-helper (Licence ISC).
//
// Style Milesight-flat pour que l'extracteur de schéma d'opengtb génère
// automatiquement le formulaire (chaque commande = `if ("X" in payload)` +
// setter typé `throw new Error("X must be …")`).
//
// Commandes couvertes (les plus utilisées en intégration GTB) :
//   - recalibrate_motor            : recalibre la course du moteur
//   - force_close                  : ferme la vanne en force (purge)
//   - device_reset                 : reboot du device
//   - set_target_temperature       : consigne de température (5–30 °C, 0.1 °C si float)
//   - set_child_lock               : verrou enfant on/off
//   - set_keep_alive               : période d'envoi périodique (mn, 0–255)
//   - set_open_window              : détection fenêtre ouverte (objet)
//
// Pour étendre, ajouter un `if ("nouvelle_commande" in payload)` + le setter
// correspondant. Le schéma sera ré-extrait au prochain `npm run fetch-codecs`.

function encodeDownlink(input) {
	var payload = (input && input.data) || {};
	var bytes = [];

	if ("recalibrate_motor" in payload) {
		bytes = bytes.concat(recalibrateMotor(payload.recalibrate_motor));
	}
	if ("force_close" in payload) {
		bytes = bytes.concat(forceClose(payload.force_close));
	}
	if ("device_reset" in payload) {
		bytes = bytes.concat(deviceReset(payload.device_reset));
	}
	if ("set_target_temperature" in payload) {
		bytes = bytes.concat(setTargetTemperature(payload.set_target_temperature));
	}
	if ("set_child_lock" in payload) {
		bytes = bytes.concat(setChildLock(payload.set_child_lock));
	}
	if ("set_keep_alive" in payload) {
		bytes = bytes.concat(setKeepAlive(payload.set_keep_alive));
	}
	if ("set_open_window" in payload) {
		bytes = bytes.concat(setOpenWindow(payload.set_open_window));
	}

	return { fPort: 1, bytes: bytes, warnings: [], errors: [] };
}

function recalibrateMotor(flag) {
	if (typeof flag !== "boolean") {
		throw new Error("recalibrate_motor must be a boolean");
	}
	return flag ? [0x03] : [];
}

function forceClose(flag) {
	if (typeof flag !== "boolean") {
		throw new Error("force_close must be a boolean");
	}
	return flag ? [0x0b] : [];
}

function deviceReset(flag) {
	if (typeof flag !== "boolean") {
		throw new Error("device_reset must be a boolean");
	}
	return flag ? [0x30] : [];
}

function setTargetTemperature(t) {
	if (typeof t !== "number") {
		throw new Error("set_target_temperature must be a number");
	}
	if (t < 5 || t > 30) {
		throw new Error("set_target_temperature must be between 5 and 30");
	}
	// Entier → commande 0x0e sur 1 octet ; sinon 0x51 sur 2 octets (×10) pour
	// la précision 0.1 °C, exactement comme la lib MClimate.
	if (t % 1 === 0) {
		return [0x0e, t & 0xff];
	}
	var v = Math.round(t * 10);
	return [0x51, (v >> 8) & 0xff, v & 0xff];
}

function setChildLock(state) {
	var on_off_map = { 0: "off", 1: "on" };
	if (state !== "off" && state !== "on") {
		throw new Error("set_child_lock must be one of off, on");
	}
	return [0x07, state === "on" ? 1 : 0];
}

function setKeepAlive(time) {
	if (typeof time !== "number") {
		throw new Error("set_keep_alive must be a number");
	}
	if (time < 0 || time > 255) {
		throw new Error("set_keep_alive must be between 0 and 255");
	}
	return [0x02, time & 0xff];
}

function setOpenWindow(p) {
	if (typeof p !== "object" || p === null) {
		throw new Error("set_open_window must be an object");
	}
	var enabled = (p.enabled === true || p.enabled === 1) ? 1 : 0;
	var delta = (typeof p.delta === "number" ? p.delta : 0) & 0x0f;
	var closeTimeSeconds = typeof p.closeTime === "number" ? p.closeTime : 0;
	if (closeTimeSeconds < 0 || closeTimeSeconds > 51) {
		throw new Error("set_open_window.closeTime must be between 0 and 51 (seconds)");
	}
	var closeTime = Math.floor(closeTimeSeconds / 5);
	var motorPosition = typeof p.motorPosition === "number" ? p.motorPosition : 0;
	if (motorPosition < 0 || motorPosition > 800) {
		throw new Error("set_open_window.motorPosition must be between 0 and 800");
	}
	var motorPosLow = motorPosition & 0xff;
	var motorPosHigh = (motorPosition >> 8) & 0x0f;
	return [0x06, enabled, closeTime, motorPosLow, (motorPosHigh << 4) | delta, delta];
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
	// ─── /Source TTN v3 ─────────────────────────────────────────────────

	__opengtb_ttn_decode = (typeof decodeUplink === 'function')
		? decodeUplink
		: (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function')
			? codec.decodeUplink
			: null;
	__opengtb_ttn_encode = (typeof encodeDownlink === 'function')
		? encodeDownlink
		: (typeof codec !== 'undefined' && codec && typeof codec.encodeDownlink === 'function')
			? codec.encodeDownlink
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

function encodeDownlink(input) {
	if (typeof __opengtb_ttn_encode !== 'function') {
		return { bytes: [], fPort: input && input.fPort, warnings: [], errors: ['encodeDownlink TTN introuvable dans le codec source'] };
	}
	var r;
	try {
		r = __opengtb_ttn_encode(input) || {};
	} catch (e) {
		return { bytes: [], fPort: input && input.fPort, warnings: [], errors: [(e && e.message) ? e.message : String(e)] };
	}
	return {
		bytes: Array.isArray(r.bytes) ? r.bytes : [],
		fPort: typeof r.fPort === 'number' ? r.fPort : (input && input.fPort),
		warnings: Array.isArray(r.warnings) ? r.warnings : [],
		errors: Array.isArray(r.errors) ? r.errors : []
	};
}

