// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — ChirpStack v4
// ─────────────────────────────────────────────────────────────────────
// Vendor       : MClimate
// Device       : CO2 Sensor and Notifier
// fPort(s)     : 2
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/mclimate/co2-sensor.js
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
function decodeUplink(input) {
    try{
        var bytes = input.bytes;
        var data = {};
        var hexData = bytes.map(function (byte) {
            var number = parseInt(byte).toString(16);
            if( (number.length % 2) > 0) { number= "0" + number }
            return number;
        });
        hexData = String(hexData).split(",").join("")
        function handleKeepalive(hexData, data){
            var co2 =  parseInt(hexData.substr(2,4),16);
            var temperature = (parseInt(hexData.substr(6,4),16) - 400) / 10;
            var humidity = Number(((parseInt(hexData.substr(10,2),16) * 100) / 256).toFixed(2));
            var voltage = Number((((parseInt(hexData.substr(12,2),16) * 8) + 1600)/1000).toFixed(2));
            
            data.CO2 = co2
            data.sensorTemperature = temperature
            data.relativeHumidity = humidity
            data.batteryVoltage = voltage

            return data;
        }
    
        function handleResponse(bytes, data){
        var commands = bytes.map(function(byte){
            return ("0" + byte.toString(16)).substr(-2); 
        });
        commands = commands.slice(0,-7);
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
                case '12':
                    {
                        command_len = 1;
                        data.keepAliveTime = parseInt(commands[i + 1], 16);
                    }
                break;
                case '19':
                    {
                        command_len = 1;
                        var commandResponse = parseInt(commands[i + 1], 16);
                        var periodInMinutes = commandResponse * 5 / 60;
                        data.joinRetryPeriod =  periodInMinutes;
                    }
                break;
                case '1b':
                    {
                        command_len = 1;
                        data.uplinkType = parseInt(commands[i + 1], 16) ;
                    }
                break;
                case '1d':
                    {
                        command_len = 2;
                        var deviceKeepAlive = 5;
                        var wdpC = commands[i + 1] == '00' ? false : commands[i + 1] * deviceKeepAlive + 7;
                        var wdpUc = commands[i + 2] == '00' ? false : parseInt(commands[i + 2], 16);
                        data.watchDogParams= { wdpC: wdpC, wdpUc: wdpUc } ;
                    }
                break;
                case '1f':
                    {
                        command_len = 4;
                        var good_medium = parseInt(commands[i + 1] +'' + commands[i + 2], 16);
                        var medium_bad = parseInt(commands[i + 3] +'' + commands[i + 4], 16);
                        
                        data.boundaryLevels = { good_medium: Number(good_medium), medium_bad: Number(medium_bad) } ;
                    }
                break;
                case '21':
                    {
                        command_len = 2;
                        data.autoZeroValue = parseInt(commands[i + 1] +'' + commands[i + 2], 16);
                    }
                break;
                case '23':
                    {
                        command_len = 3;
                        var good_zone = parseInt(commands[i + 1], 16);
                        var medium_zone = parseInt(commands[i + 2], 16);
                        var bad_zone = parseInt(commands[i + 3], 16);
                        
                        data.notifyPeriod = { good_zone: Number(good_zone), medium_zone: Number(medium_zone), bad_zone: Number(bad_zone) };
                    }
                break;
                case '25':
                    {
                        
                        command_len = 3;
                        var good_zone = parseInt(commands[i + 1], 16);
                        var medium_zone = parseInt(commands[i + 2], 16);
                        var bad_zone = parseInt(commands[i + 3], 16);
                        
                        data.measurementPeriod = { good_zone: Number(good_zone), medium_zone: Number(medium_zone), bad_zone: Number(bad_zone) } ;
                    }
                break;
                case '27':
                    {
                        command_len = 9;
                        var duration_good_beeping = parseInt(commands[i + 1], 16);
                        var duration_good_loud = parseInt(commands[i + 2], 16) * 10;
                        var duration_good_silent = parseInt(commands[i + 3], 16) * 10;

                        var duration_medium_beeping = parseInt(commands[i + 4], 16);
                        var duration_medium_loud = parseInt(commands[i + 5], 16) * 10;
                        var duration_medium_silent = parseInt(commands[i + 6], 16) * 10;

                        var duration_bad_beeping = parseInt(commands[i + 7], 16);
                        var duration_bad_loud = parseInt(commands[i + 8], 16) * 10;
                        var duration_bad_silent = parseInt(commands[i + 9], 16) * 10;
                        
                        data.buzzerNotification = {
                        duration_good_beeping: Number(duration_good_beeping), duration_good_loud: Number(duration_good_loud), duration_good_silent: Number(duration_good_silent),
                        duration_medium_beeping: Number(duration_medium_beeping), duration_medium_loud: Number(duration_medium_loud), duration_medium_silent: Number(duration_medium_silent),
                        duration_bad_beeping: Number(duration_bad_beeping), duration_bad_loud: Number(duration_bad_loud), duration_bad_silent: Number(duration_bad_silent) };
                    }
                break;
                case '29':
                    {
                        command_len = 15;
                        var red_good = parseInt(commands[i + 1], 16);
                        var green_good = parseInt(commands[i + 2], 16);
                        var blue_good = parseInt(commands[i + 3], 16);
                        var duration_good =  parseInt(commands[i + 4] +'' + commands[i + 5], 16) * 10;

                        var red_medium = parseInt(commands[i + 6], 16);
                        var green_medium = parseInt(commands[i + 7], 16);
                        var blue_medium = parseInt(commands[i + 8], 16);
                        var duration_medium =  parseInt(commands[i + 9] +'' + commands[i + 10], 16) * 10;

                        var red_bad = parseInt(commands[i + 11], 16);
                        var green_bad = parseInt(commands[i + 12], 16);
                        var blue_bad = parseInt(commands[i + 13], 16);
                        var duration_bad =  parseInt(commands[i + 14] +'' + commands[i + 15], 16) * 10;
                        
                        data.ledNotification = {
                        red_good: Number(red_good), green_good: Number(green_good), blue_good: Number(blue_good), duration_good: Number(duration_good),
                        red_medium: Number(red_medium), green_medium: Number(green_medium), blue_medium: Number(blue_medium), duration_medium: Number(duration_medium),
                        red_bad: Number(red_bad), green_bad: Number(green_bad), blue_bad: Number(blue_bad), duration_bad: Number(duration_bad) } ;
                    }
                break;
                case '2b':
                    {
                        command_len = 1;
                        data.autoZeroPeriod = parseInt(commands[i + 1], 16);
                    }
                break;
                default:
                    throw new Error('Unhandled data');
            }
            commands.splice(i,command_len);
        });
        return data;
        }
        
        if (bytes[0] == 1) {
            data = handleKeepalive(hexData, data);
        }else{
            data = handleResponse(bytes,data);
            
            hexData = hexData.slice(-14);
            data = handleKeepalive(hexData, data);
        }
        return {
            data:data
        };
    } catch (e) {
        throw new Error('Unhandled data');
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
