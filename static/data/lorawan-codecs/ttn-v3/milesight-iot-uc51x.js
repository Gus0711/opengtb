// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Milesight IoT Co., Ltd
// Device       : Milesight UC51x Series LoRaWAN® Solenoid Valve Controller
// fPort(s)     : 85
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/milesight-iot/uc51x.js
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/milesight-iot/uc51x-encoder.js
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
/**
 * Payload Decoder
 *
 * Copyright 2025 Milesight IoT
 *
 * @product UC511 / UC512
 */
var RAW_VALUE = 0x00;

/* eslint no-redeclare: "off" */
/* eslint-disable */
// Chirpstack v4
function decodeUplink(input) {
    var decoded = milesightDeviceDecode(input.bytes);
    return { data: decoded };
}

// Chirpstack v3
function Decode(fPort, bytes) {
    return milesightDeviceDecode(bytes);
}

// The Things Network
function Decoder(bytes, port) {
    return milesightDeviceDecode(bytes);
}
/* eslint-enable */

function milesightDeviceDecode(bytes) {
    var decoded = {};

    for (var i = 0; i < bytes.length; ) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];

        // IPSO VERSION
        if (channel_id === 0xff && channel_type === 0x01) {
            decoded.ipso_version = readProtocolVersion(bytes[i]);
            i += 1;
        }
        // HARDWARE VERSION
        else if (channel_id === 0xff && channel_type === 0x09) {
            decoded.hardware_version = readHardwareVersion(bytes.slice(i, i + 2));
            i += 2;
        }
        // FIRMWARE VERSION
        else if (channel_id === 0xff && channel_type === 0x0a) {
            decoded.firmware_version = readFirmwareVersion(bytes.slice(i, i + 2));
            i += 2;
        }
        // TSL VERSION
        else if (channel_id === 0xff && channel_type === 0xff) {
            decoded.tsl_version = readTslVersion(bytes.slice(i, i + 2));
            i += 2;
        }
        // SERIAL NUMBER
        else if (channel_id === 0xff && channel_type === 0x16) {
            decoded.sn = readSerialNumber(bytes.slice(i, i + 8));
            i += 8;
        }
        // LORAWAN CLASS TYPE
        else if (channel_id === 0xff && channel_type === 0x0f) {
            decoded.lorawan_class = readLoRaWANClass(bytes[i]);
            i += 1;
        }
        // RESET EVENT
        else if (channel_id === 0xff && channel_type === 0xfe) {
            decoded.reset_event = readResetEvent(1);
            i += 1;
        }
        // DEVICE STATUS
        else if (channel_id === 0xff && channel_type === 0x0b) {
            decoded.device_status = readDeviceStatus(1);
            i += 1;
        }
        // BATTERY
        else if (channel_id === 0x01 && channel_type === 0x75) {
            decoded.battery = readUInt8(bytes[i]);
            i += 1;
        }
        // VALVE 1
        else if (channel_id === 0x03 && channel_type == 0x01) {
            var valve_value = readUInt8(bytes[i]);
            if (valve_value === 0xff) {
                decoded.valve_1_result = readDelayControlResult(1);
            } else {
                decoded.valve_1 = readValveStatus(valve_value);
            }
            i += 1;
        }
        // VALVE 2
        else if (channel_id === 0x05 && channel_type == 0x01) {
            var valve_value = readUInt8(bytes[i]);
            if (valve_value === 0xff) {
                decoded.valve_2_result = readDelayControlResult(1);
            } else {
                decoded.valve_2 = readValveStatus(valve_value);
            }
            i += 1;
        }
        // VALVE 1 Pulse
        else if (channel_id === 0x04 && channel_type === 0xc8) {
            decoded.valve_1_pulse = readUInt32LE(bytes.slice(i, i + 4));
            i += 4;
        }
        // VALVE 2 Pulse
        else if (channel_id === 0x06 && channel_type === 0xc8) {
            decoded.valve_2_pulse = readUInt32LE(bytes.slice(i, i + 4));
            i += 4;
        }
        // GPIO 1 (hardware_version >= v2.0 and firmware_version >= v2.4)
        else if (channel_id === 0x07 && channel_type == 0x01) {
            decoded.gpio_1 = readGpioStatus(bytes[i]);
            i += 1;
        }
        // GPIO 2 (hardware_version >= v2.0 and firmware_version >= v2.4)
        else if (channel_id === 0x08 && channel_type == 0x01) {
            decoded.gpio_2 = readGpioStatus(bytes[i]);
            i += 1;
        }
        // PRESSURE (hardware_version >= v4.0 and firmware_version >= v1.2)
        else if (channel_id === 0x09 && channel_type === 0x7b) {
            decoded.pressure = readUInt16LE(bytes.slice(i, i + 2));
            i += 2;
        }
        // PRESSURE FAILED (hardware_version >= v4.0 and firmware_version >= v1.2)
        else if (channel_id === 0xb9 && channel_type === 0x7b) {
            decoded.pressure_sensor_status = readSensorStatus(bytes[i]);
            i += 1;
        }
        // CUSTOM MESSAGE (hardware_version >= v4.0 and firmware_version >= v1.1)
        else if (channel_id === 0xff && channel_type === 0x12) {
            decoded.custom_message = readAscii(bytes.slice(i, bytes.length));
            i = bytes.length;
        }
        // HISTORY (hardware_version >= v3.0 and firmware_version >= v3.1)
        else if (channel_id === 0x20 && channel_type === 0xce) {
            var timestamp = readUInt32LE(bytes.slice(i, i + 4));
            var value = bytes[i + 4];
            var status = readValveStatus(value & 0x01);
            var mode_value = (value >> 1) & 0x01;
            var mode = readValveMode(mode_value);
            var gpio = readGpioStatus((value >> 2) & 0x01);
            var index = ((value >> 4) & 0x01) === 0 ? 1 : 2;
            var pulse = readUInt32LE(bytes.slice(i + 5, i + 9));

            var data = { timestamp: timestamp, mode: mode };
            // GPIO mode
            if (mode_value === 0) {
                data["valve_" + index] = status;
                data["gpio_" + index] = gpio;
            }
            // Counter mode
            else if (mode_value === 1) {
                data["valve_" + index] = status;
                data["valve_" + index + "_pulse"] = pulse;
            }
            i += 9;
            decoded.history = decoded.history || [];
            decoded.history.push(data);
        }
        // HISTORY PIPE PRESSURE (hardware_version >= v4.0 & firmware_version >= v1.1)
        else if (channel_id === 0x21 && channel_type === 0xce) {
            var data = {};
            data.timestamp = readUInt32LE(bytes.slice(i, i + 4));
            data.pressure = readUInt16LE(bytes.slice(i + 4, i + 6));
            i += 6;
            decoded.history = decoded.history || [];
            decoded.history.push(data);
        }
        // DOWNLINK RESPONSE
        else if (channel_id === 0xfe || channel_id === 0xff) {
            var result = handle_downlink_response(channel_type, bytes, i);
            decoded = Object.assign(decoded, result.data);
            i = result.offset;
        } else {
            break;
        }
    }

    return decoded;
}

// 0xFE
function handle_downlink_response(channel_type, bytes, offset) {
    var decoded = {};

    switch (channel_type) {
        case 0x02:
            decoded.collection_interval = readUInt16LE(bytes.slice(offset, offset + 2));
            offset += 2;
            break;
        case 0x03:
            decoded.report_interval = readUInt16LE(bytes.slice(offset, offset + 2));
            offset += 2;
            break;
        case 0x17:
            decoded.time_zone = readTimeZone(readInt16LE(bytes.slice(offset, offset + 2)));
            offset += 2;
            break;
        case 0x1d:
            var data = readUInt8(bytes[offset]);
            var index = ((data >> 0) & 0x01) + 1;
            var valve_status_value = (data >> 5) & 0x01;
            var time_rule_enable_value = (data >> 7) & 0x01;
            var pulse_rule_enable_value = (data >> 6) & 0x01;
            var valve_name = "valve_" + index + "_task";

            decoded[valve_name] = {};
            decoded[valve_name].time_rule_enable = readEnableStatus(time_rule_enable_value);
            decoded[valve_name].pulse_rule_enable = readEnableStatus(pulse_rule_enable_value);
            decoded[valve_name].valve_status = readValveStatus(valve_status_value);
            decoded[valve_name].sequence_id = readUInt8(bytes[offset + 1]);
            offset += 2;

            if (time_rule_enable_value === 1) {
                decoded[valve_name].duration = readUInt24LE(bytes.slice(offset, offset + 4));
                offset += 3;
            }
            if (pulse_rule_enable_value === 1) {
                decoded[valve_name].valve_pulse = readUInt32LE(bytes.slice(offset, offset + 4));
                offset += 4;
            }
            break;
        case 0x1e:
            decoded.class_a_response_time = readUInt32LE(bytes.slice(offset, offset + 4));
            offset += 4;
            break;
        case 0x27:
            decoded.clear_history = readYesNoStatus(1);
            offset += 1;
            break;
        case 0x28:
            decoded.report_status = readYesNoStatus(1);
            offset += 1;
            break;
        case 0x35:
            decoded.d2d_key = bytesToHexString(bytes.slice(offset, offset + 8));
            offset += 8;
            break;
        case 0x3b:
            decoded.sync_time_type = readSyncTimeType(bytes[offset]);
            offset += 1;
            break;
        case 0x46:
            decoded.gpio_jitter_time = readUInt8(bytes[offset]);
            offset += 1;
            break;
        case 0x4a:
            decoded.sync_time = readYesNoStatus(1);
            offset += 1;
            break;
        case 0x4b: // batch_read_rules
            var type = readUInt8(bytes[offset]);
            var rule_bit_offset = { rule_1: 0, rule_2: 1, rule_3: 2, rule_4: 3, rule_5: 4, rule_6: 5, rule_7: 6, rule_8: 7, rule_9: 8, rule_10: 9, rule_11: 10, rule_12: 11, rule_13: 12, rule_14: 13, rule_15: 14, rule_16: 15 };
            // batch read rules
            if (type === 0) {
                decoded.batch_read_rules = {};
                var data = readUInt16LE(bytes.slice(offset + 1, offset + 3));
                for (var key in rule_bit_offset) {
                    decoded.batch_read_rules[key] = readYesNoStatus((data >>> rule_bit_offset[key]) & 0x01);
                }
            }
            // batch enable rules
            else if (type === 1) {
                decoded.batch_enable_rules = {};
                var data = readUInt16LE(bytes.slice(offset + 1, offset + 3));
                for (var key in rule_bit_offset) {
                    decoded.batch_enable_rules[key] = readEnableStatus((data >>> rule_bit_offset[key]) & 0x01);
                }
            }
            // batch remove rules
            else if (type === 2) {
                decoded.batch_remove_rules = {};
                var data = readUInt16LE(bytes.slice(offset + 1, offset + 3));
                for (var key in rule_bit_offset) {
                    decoded.batch_remove_rules[key] = readYesNoStatus((data >>> rule_bit_offset[key]) & 0x01);
                }
            }
            // enable single rule
            else if (type === 3) {
                var rule_index = readUInt8(bytes[offset + 1]);
                var rule_x_name = "rule_" + rule_index + "_enable";
                decoded[rule_x_name] = readEnableStatus(bytes[offset + 2]);
            }
            // remove single rule
            else if (type === 4) {
                var rule_index = readUInt8(bytes[offset + 1]);
                var rule_x_name = "rule_" + rule_index + "_remove";
                decoded[rule_x_name] = readYesNoStatus(bytes[offset + 2]);
            }
            offset += 3;
            break;
        case 0x4c:
            var rule_index = readUInt8(bytes[offset]);
            var rule_index_name = "rule_" + rule_index;
            decoded.query_rule_config = decoded.query_rule_config || {};
            decoded.query_rule_config[rule_index_name] = readYesNoStatus(1);
            offset += 1;
            break;
        case 0x4d:
            var rule_config = {};
            rule_config.id = readUInt8(bytes[offset]);
            var data = readUInt8(bytes[offset + 1]);
            rule_config.enable = readEnableStatus((data >> 7) & 0x01);
            rule_config.valve_status = readValveStatus((data >> 6) & 0x01);
            rule_config.valve_2_enable = readEnableStatus((data >> 1) & 0x01);
            rule_config.valve_1_enable = readEnableStatus((data >> 0) & 0x01);
            rule_config.start_hour = readUInt8(bytes[offset + 2]);
            rule_config.start_min = readUInt8(bytes[offset + 3]);
            rule_config.end_hour = readUInt8(bytes[offset + 4]);
            rule_config.end_min = readUInt8(bytes[offset + 5]);
            offset += 6;
            decoded.rules_config = decoded.rules_config || [];
            decoded.rules_config.push(rule_config);
            break;
        case 0x4e:
            var valve_index = readUInt8(bytes[offset]);
            var valve_index_name = "clear_valve_" + valve_index + "_pulse";
            // ignore the next byte
            decoded[valve_index_name] = readYesNoStatus(1);
            offset += 2;
            break;
        case 0x4f:
            decoded.valve_power_supply_config = {};
            decoded.valve_power_supply_config.counts = readUInt8(bytes[offset]);
            decoded.valve_power_supply_config.control_pulse_time = readUInt16LE(bytes.slice(offset + 1, offset + 3));
            decoded.valve_power_supply_config.power_time = readUInt16LE(bytes.slice(offset + 3, offset + 5));
            offset += 5;
            break;
        case 0x52:
            // ignore first byte
            decoded.pulse_filter_config = {};
            decoded.pulse_filter_config.mode = readPulseFilterMode(bytes[offset + 1]);
            decoded.pulse_filter_config.time = readUInt16LE(bytes.slice(offset + 2, offset + 4));
            offset += 4;
            break;
        case 0x53:
        case 0x55:
            var rule_config = {};
            rule_config.id = readUInt8(bytes[offset]);
            rule_config.enable = readEnableStatus(bytes[offset + 1]);
            rule_config.condition = readRuleCondition(bytes.slice(offset + 2, offset + 15));
            rule_config.action = readRuleAction(bytes.slice(offset + 15, offset + 28));
            offset += 29;

            decoded.rules_config = decoded.rules_config || [];
            decoded.rules_config.push(rule_config);
            break;
        case 0x68:
            decoded.history_enable = readEnableStatus(bytes[offset]);
            offset += 1;
            break;
        case 0x69:
            decoded.retransmit_enable = readEnableStatus(bytes[offset]);
            offset += 1;
            break;
        case 0x6a:
            var mode_value = readUInt8(bytes[offset]);
            if (mode_value === 0x00) {
                decoded.retransmit_interval = readUInt16LE(bytes.slice(offset + 1, offset + 3));
                offset += 3;
            } else if (mode_value === 0x01) {
                decoded.resend_interval = readUInt16LE(bytes.slice(offset + 1, offset + 3));
                offset += 3;
            }
            break;
        case 0x84:
            decoded.d2d_enable = readEnableStatus(bytes[offset]);
            offset += 1;
            break;
        case 0x92:
            var index = readUInt8(bytes[offset]);
            var valve_name = "valve_" + index + "_pulse";
            decoded[valve_name] = readUInt32LE(bytes.slice(offset + 1, offset + 5));
            offset += 5;
            break;
        case 0xab:
            decoded.pressure_calibration_settings = {};
            decoded.pressure_calibration_settings.enable = readEnableStatus(bytes[offset]);
            decoded.pressure_calibration_settings.calibration_value = readInt16LE(bytes.slice(offset + 1, offset + 3));
            offset += 3;
            break;
        case 0xf3:
            decoded.response_enable = readEnableStatus(bytes[offset]);
            offset += 1;
            break;
        default:
            throw new Error("unknown downlink response");
    }

    return { data: decoded, offset: offset };
}

function readProtocolVersion(bytes) {
    var major = (bytes & 0xf0) >> 4;
    var minor = bytes & 0x0f;
    return "v" + major + "." + minor;
}

function readHardwareVersion(bytes) {
    var major = (bytes[0] & 0xff).toString(16);
    var minor = (bytes[1] & 0xff) >> 4;
    return "v" + major + "." + minor;
}

function readFirmwareVersion(bytes) {
    var major = (bytes[0] & 0xff).toString(16);
    var minor = (bytes[1] & 0xff).toString(16);
    return "v" + major + "." + minor;
}

function readTslVersion(bytes) {
    var major = bytes[0] & 0xff;
    var minor = bytes[1] & 0xff;
    return "v" + major + "." + minor;
}

function readSerialNumber(bytes) {
    var temp = [];
    for (var idx = 0; idx < bytes.length; idx++) {
        temp.push(("0" + (bytes[idx] & 0xff).toString(16)).slice(-2));
    }
    return temp.join("");
}

function readLoRaWANClass(type) {
    var class_map = {
        0: "Class A",
        1: "Class B",
        2: "Class C",
        3: "Class CtoB",
    };
    return getValue(class_map, type);
}

function readResetEvent(status) {
    var status_map = { 0: "normal", 1: "reset" };
    return getValue(status_map, status);
}

function readDeviceStatus(status) {
    var status_map = { 0: "off", 1: "on" };
    return getValue(status_map, status);
}

function readValveStatus(status) {
    var status_map = { 0: "close", 1: "open" };
    return getValue(status_map, status);
}

function readDelayControlResult(value) {
    var result_map = { 0: "success", 1: "failed" };
    return getValue(result_map, value);
}

function readSensorStatus(value) {
    var status_map = { 1: "sensor error" };
    return getValue(status_map, value);
}

function readValveMode(value) {
    var mode_map = { 0: "counter", 1: "gpio" };
    return getValue(mode_map, value);
}

function readGpioStatus(status) {
    var status_map = { 0: "off", 1: "on" };
    return getValue(status_map, status);
}

function readEnableStatus(status) {
    var status_map = { 0: "disable", 1: "enable" };
    return getValue(status_map, status);
}

function readYesNoStatus(status) {
    var status_map = { 0: "no", 1: "yes" };
    return getValue(status_map, status);
}

function readTimeZone(time_zone) {
    var timezone_map = { "-120": "UTC-12", "-110": "UTC-11", "-100": "UTC-10", "-95": "UTC-9:30", "-90": "UTC-9", "-80": "UTC-8", "-70": "UTC-7", "-60": "UTC-6", "-50": "UTC-5", "-40": "UTC-4", "-35": "UTC-3:30", "-30": "UTC-3", "-20": "UTC-2", "-10": "UTC-1", 0: "UTC", 10: "UTC+1", 20: "UTC+2", 30: "UTC+3", 35: "UTC+3:30", 40: "UTC+4", 45: "UTC+4:30", 50: "UTC+5", 55: "UTC+5:30", 57: "UTC+5:45", 60: "UTC+6", 65: "UTC+6:30", 70: "UTC+7", 80: "UTC+8", 90: "UTC+9", 95: "UTC+9:30", 100: "UTC+10", 105: "UTC+10:30", 110: "UTC+11", 120: "UTC+12", 127: "UTC+12:45", 130: "UTC+13", 140: "UTC+14" };
    return getValue(timezone_map, time_zone);
}

function readSyncTimeType(type) {
    var type_map = { 1: "v1.0.2", 2: "v1.0.3", 3: "v1.1.0" };
    return getValue(type_map, type);
}

function readPulseFilterMode(mode) {
    var mode_map = { 1: "hardware", 2: "software" };
    return getValue(mode_map, mode);
}

function readRuleCondition(bytes) {
    var condition = {};

    var offset = 0;
    var condition_type_value = readUInt8(bytes[offset]);
    condition.type = readNewConditionType(condition_type_value);
    switch (condition_type_value) {
        case 0x00:
            break;
        case 0x01:
            condition.start_time = readUInt32LE(bytes.slice(offset + 1, offset + 5));
            condition.end_time = readUInt32LE(bytes.slice(offset + 5, offset + 9));
            condition.repeat_enable = readEnableStatus(bytes[offset + 9]);
            var repeat_mode_value = readUInt8(bytes[offset + 10]);
            condition.repeat_mode = getRepeatMode(repeat_mode_value);
            if (repeat_mode_value === 0x00 || repeat_mode_value === 0x01) {
                condition.repeat_step = readUInt16LE(bytes.slice(offset + 11, offset + 13));
            } else if (repeat_mode_value === 0x02) {
                condition.repeat_week = readWeekday(bytes[offset + 11]);
            }
            break;
        case 0x02:
            condition.d2d_command = readD2DCommand(bytes.slice(offset + 1, offset + 3));
            break;
        case 0x03:
            condition.valve_index = readUInt8(bytes[offset + 1]);
            condition.duration = readUInt16LE(bytes.slice(offset + 2, offset + 4));
            condition.pulse_threshold = readUInt32LE(bytes.slice(offset + 4, offset + 8));
            break;
        case 0x04:
            condition.valve_index = readUInt8(bytes[offset + 1]);
            condition.pulse_threshold = readUInt32LE(bytes.slice(offset + 2, offset + 6));
            break;
    }
    return condition;
}

function getRepeatMode(repeat_mode_value) {
    var repeat_mode_map = { 0: "monthly", 1: "daily", 2: "weekly" };
    return getValue(repeat_mode_map, repeat_mode_value);
}

function readWeekday(weekday_value) {
    var weekday_bit_offset = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };

    var weekday = {};
    for (var key in weekday_bit_offset) {
        weekday[key] = readEnableStatus((weekday_value >>> weekday_bit_offset[key]) & 0x01);
    }
    return weekday;
}

function readNewConditionType(condition_type_value) {
    var condition_type_map = { 0: "none", 1: "time", 2: "d2d", 3: "time_or_pulse_threshold", 4: "pulse_threshold", 5: "pressure_threshold" };
    return getValue(condition_type_map, condition_type_value);
}

function readRuleAction(bytes) {
    var action_type_map = { 0: "none", 1: "em_valve_control", 2: "valve_control", 3: "report" };

    var offset = 0;
    var action = {};

    var type_value = readUInt8(bytes[offset]);
    action.type = getValue(action_type_map, type_value);
    switch (type_value) {
        case 0x00:
            break;
        case 0x01:
            action.valve_index = readUInt8(bytes[offset + 1]);
            action.valve_opening = readUInt8(bytes[offset + 2]);
            action.time_enable = readEnableStatus(bytes[offset + 3]);
            action.duration = readUInt32LE(bytes.slice(offset + 4, offset + 8));
            action.pulse_enable = readEnableStatus(bytes[offset + 8]);
            action.pulse_threshold = readUInt32LE(bytes.slice(offset + 9, offset + 13));
            break;
        case 0x02:
            action.valve_index = readUInt8(bytes[offset + 1]);
            action.valve_opening = readUInt8(bytes[offset + 2]);
            action.time_enable = readEnableStatus(bytes[offset + 3]);
            action.duration = readUInt32LE(bytes.slice(offset + 4, offset + 8));
            action.pulse_enable = readEnableStatus(bytes[offset + 8]);
            action.pulse_threshold = readUInt32LE(bytes.slice(offset + 9, offset + 13));
            break;
        case 0x03:
            action.report_type = readReportType(readUInt8(bytes[offset + 1]));
            action.report_content = readAscii(bytes.slice(offset + 2, offset + 10));
            break;
    }
    return action;
}

function readReportType(report_type_value) {
    var report_type_map = { 1: "valve_1", 2: "valve_2", 3: "custom_message" };
    return getValue(report_type_map, report_type_value);
}

/* eslint-disable */
function readUInt8(bytes) {
    return bytes & 0xff;
}

function readInt8(bytes) {
    var ref = readUInt8(bytes);
    return ref > 0x7f ? ref - 0x100 : ref;
}

function readUInt16LE(bytes) {
    var value = (bytes[1] << 8) + bytes[0];
    return value & 0xffff;
}

function readInt16LE(bytes) {
    var ref = readUInt16LE(bytes);
    return ref > 0x7fff ? ref - 0x10000 : ref;
}

function readUInt24LE(bytes) {
    var value = (bytes[2] << 16) + (bytes[1] << 8) + bytes[0];
    return value & 0xffffff;
}

function readInt24LE(bytes) {
    var ref = readUInt24LE(bytes);
    return ref > 0x7fffff ? ref - 0x1000000 : ref;
}

function readUInt32LE(bytes) {
    var value = (bytes[3] << 24) + (bytes[2] << 16) + (bytes[1] << 8) + bytes[0];
    return (value & 0xffffffff) >>> 0;
}

function readInt32LE(bytes) {
    var ref = readUInt32LE(bytes);
    return ref > 0x7fffffff ? ref - 0x100000000 : ref;
}

function readAscii(bytes) {
    var str = "";
    for (var i = 0; i < bytes.length; i++) {
        if (bytes[i] === 0) {
            continue;
        }
        str += String.fromCharCode(bytes[i]);
    }
    return str;
}

function readD2DCommand(bytes) {
    return ("0" + (bytes[1] & 0xff).toString(16)).slice(-2) + ("0" + (bytes[0] & 0xff).toString(16)).slice(-2);
}

function bytesToHexString(bytes) {
    var temp = [];
    for (var i = 0; i < bytes.length; i++) {
        temp.push(("0" + (bytes[i] & 0xff).toString(16)).slice(-2));
    }
    return temp.join("");
}

function getValue(map, key) {
    if (RAW_VALUE) return key;

    var value = map[key];
    if (!value) value = "unknown";
    return value;
}

//if (!Object.assign) {
    Object.defineProperty(Object, "assign", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (target) {
            "use strict";
            if (target == null) {
                throw new TypeError("Cannot convert first argument to object");
            }

            var to = Object(target);
            for (var i = 1; i < arguments.length; i++) {
                var nextSource = arguments[i];
                if (nextSource == null) {
                    continue;
                }
                nextSource = Object(nextSource);

                var keysArray = Object.keys(Object(nextSource));
                for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
                    var nextKey = keysArray[nextIndex];
                    var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
                    if (desc !== undefined && desc.enumerable) {
                        // concat array
                        if (Array.isArray(to[nextKey]) && Array.isArray(nextSource[nextKey])) {
                            to[nextKey] = to[nextKey].concat(nextSource[nextKey]);
                        } else {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        },
    });
//}

	if (typeof decodeUplink === 'function') {
		__ogtb_decode_uplink = decodeUplink;
	} else if (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function') {
		__ogtb_decode_uplink = codec.decodeUplink;
	}
})();

// ─── Source encoder (TTN downlinkEncoder : uc51x-encoder.js) ─────────
(function () {
/**
 * Payload Encoder
 *
 * Copyright 2025 Milesight IoT
 *
 * @product UC511 / UC512
 */
var RAW_VALUE = 0x00;

/* eslint no-redeclare: "off" */
/* eslint-disable */
// Chirpstack v4
function encodeDownlink(input) {
    var encoded = milesightDeviceEncode(input.data);
    return { bytes: encoded };
}

// Chirpstack v3
function Encode(fPort, obj) {
    return milesightDeviceEncode(obj);
}

// The Things Network
function Encoder(obj, port) {
    return milesightDeviceEncode(obj);
}
/* eslint-enable */

function milesightDeviceEncode(payload) {
    var encoded = [];

    if ("reboot" in payload) {
        encoded = encoded.concat(reboot(payload.reboot));
    }
    if ("report_status" in payload) {
        encoded = encoded.concat(reportStatus(payload.report_status));
    }
    if ("sync_time" in payload) {
        encoded = encoded.concat(syncTime(payload.sync_time));
    }
    if ("collection_interval" in payload) {
        encoded = encoded.concat(setCollectionInterval(payload.collection_interval));
    }
    if ("report_interval" in payload) {
        encoded = encoded.concat(setReportInterval(payload.report_interval));
    }
    if ("retransmit_enable" in payload) {
        encoded = encoded.concat(setRetransmitEnable(payload.retransmit_enable));
    }
    if ("retransmit_interval" in payload) {
        encoded = encoded.concat(setRetransmitInterval(payload.retransmit_interval));
    }
    if ("resend_interval" in payload) {
        encoded = encoded.concat(setResendInterval(payload.resend_interval));
    }
    if ("time_zone" in payload) {
        encoded = encoded.concat(setTimeZone(payload.time_zone));
    }
    if ("sync_time_type" in payload) {
        encoded = encoded.concat(setSyncTimeType(payload.sync_time_type));
    }
    if ("d2d_key" in payload) {
        encoded = encoded.concat(setD2DKey(payload.d2d_key));
    }
    if ("d2d_enable" in payload) {
        encoded = encoded.concat(setD2DEnable(payload.d2d_enable));
    }
    if ("response_enable" in payload) {
        encoded = encoded.concat(setResponseEnable(payload.response_enable));
    }
    if ("class_a_response_time" in payload) {
        encoded = encoded.concat(setClassAResponseTime(payload.class_a_response_time));
    }
    if ("valve_1_pulse" in payload) {
        encoded = encoded.concat(setValvePulse1(payload.valve_1_pulse));
    }
    if ("valve_2_pulse" in payload) {
        encoded = encoded.concat(setValvePulse2(payload.valve_2_pulse));
    }
    if ("valve_1_task" in payload) {
        encoded = encoded.concat(setValveTask(1, payload.valve_1_task));
    }
    if ("valve_2_task" in payload) {
        encoded = encoded.concat(setValveTask(2, payload.valve_2_task));
    }
    if ("batch_read_rules" in payload) {
        encoded = encoded.concat(batchReadRules(payload.batch_read_rules));
    }
    if ("batch_enable_rules" in payload) {
        encoded = encoded.concat(batchEnableRules(payload.batch_enable_rules));
    }
    if ("batch_remove_rules" in payload) {
        encoded = encoded.concat(batchRemoveRules(payload.batch_remove_rules));
    }
    if ("query_rule_config" in payload) {
        encoded = encoded.concat(queryRuleConfig(payload.query_rule_config));
    }
    var rule_x_enable_map = { rule_1_enable: 1, rule_2_enable: 2, rule_3_enable: 3, rule_4_enable: 4, rule_5_enable: 5, rule_6_enable: 6, rule_7_enable: 7, rule_8_enable: 8, rule_9_enable: 9, rule_10_enable: 10, rule_11_enable: 11, rule_12_enable: 12, rule_13_enable: 13, rule_14_enable: 14, rule_15_enable: 15, rule_16_enable: 16 };
    for (var key in rule_x_enable_map) {
        if (key in payload) {
            encoded = encoded.concat(enableRule(rule_x_enable_map[key], payload[key]));
        }
    }
    var rule_x_remove_map = { rule_1_remove: 1, rule_2_remove: 2, rule_3_remove: 3, rule_4_remove: 4, rule_5_remove: 5, rule_6_remove: 6, rule_7_remove: 7, rule_8_remove: 8, rule_9_remove: 9, rule_10_remove: 10, rule_11_remove: 11, rule_12_remove: 12, rule_13_remove: 13, rule_14_remove: 14, rule_15_remove: 15, rule_16_remove: 16 };
    for (var key in rule_x_remove_map) {
        if (key in payload) {
            encoded = encoded.concat(removeRule(rule_x_remove_map[key], payload[key]));
        }
    }
    // hardware_version>=v2.0, firmware_version>=v2.1
    if ("rule_config" in payload) {
        for (var i = 0; i < payload.rule_config.length; i++) {
            encoded = encoded.concat(setRuleConfig(payload.rule_config[i]));
        }
    }
    // hardware_version>=v4.0, firmware_version>=v1.1
    if ("rules_config" in payload) {
        for (var i = 0; i < payload.rules_config.length; i++) {
            encoded = encoded.concat(setNewRuleConfig(payload.rules_config[i]));
        }
    }
    if ("clear_valve_1_pulse" in payload) {
        encoded = encoded.concat(clearValvePulse(1, payload.clear_valve_1_pulse));
    }
    if ("clear_valve_2_pulse" in payload) {
        encoded = encoded.concat(clearValvePulse(2, payload.clear_valve_2_pulse));
    }
    if ("pulse_filter_config" in payload) {
        encoded = encoded.concat(setPulseFilterConfig(payload.pulse_filter_config));
    }
    if ("gpio_jitter_time" in payload) {
        encoded = encoded.concat(setGpioJitterTime(payload.gpio_jitter_time));
    }
    if ("valve_power_supply_config" in payload) {
        encoded = encoded.concat(setValvePowerSupplyConfig(payload.valve_power_supply_config));
    }
    if ("pressure_calibration_settings" in payload) {
        encoded = encoded.concat(setPressureCalibration(payload.pressure_calibration_settings));
    }
    if ("history_enable" in payload) {
        encoded = encoded.concat(setHistoryEnable(payload.history_enable));
    }
    if ("clear_history" in payload) {
        encoded = encoded.concat(clearHistory(payload.clear_history));
    }
    if ("fetch_history" in payload) {
        encoded = encoded.concat(fetchHistory(payload.fetch_history));
    }
    if ("stop_transmit" in payload) {
        encoded = encoded.concat(stopTransmit(payload.stop_transmit));
    }

    return encoded;
}

/**
 * Reboot
 * @since hardware_version>=v2.0, firmware_version>=v2.2
 * @param {number} reboot values:(0: no, 1: yes)
 * @example { "reboot": 1 }
 */
function reboot(reboot) {
    var yes_no_map = { 0: "no", 1: "yes" };
    var reboot_values = getValues(yes_no_map);
    if (reboot_values.indexOf(reboot) === -1) {
        throw new Error("reboot must be one of " + reboot_values.join(", "));
    }

    if (getValue(yes_no_map, reboot) === 0) {
        return [];
    }
    return [0xff, 0x10, 0xff];
}

/**
 * report status
 * @since hardware_version>=v3.0, firmware_version>=v3.1
 * @param {number} report_status values:(0: no, 1: yes)
 * @example { "report_status": 1 }
 */
function reportStatus(report_status) {
    var yes_no_map = { 0: "no", 1: "yes" };
    var yes_no_values = getValues(yes_no_map);
    if (yes_no_values.indexOf(report_status) === -1) {
        throw new Error("report_status must be one of " + yes_no_values.join(", "));
    }

    if (getValue(yes_no_map, report_status) === 0) {
        return [];
    }
    return [0xff, 0x28, 0xff];
}

/**
 * Sync time
 * @since hardware_version>=v2.0, firmware_version>=v2.1
 * @param {number} sync_time values: (0: no, 1: yes)
 * @example { "sync_time": 1 }
 */
function syncTime(sync_time) {
    var yes_no_map = { 0: "no", 1: "yes" };
    var yes_no_values = getValues(yes_no_map);
    if (yes_no_values.indexOf(sync_time) === -1) {
        throw new Error("sync_time must be one of " + yes_no_values.join(", "));
    }

    if (getValue(yes_no_map, sync_time) === 0) {
        return [];
    }
    return [0xff, 0x4a, 0x00];
}
/**
 * Set collection interval
 * @param {number} collection_interval unit: second, range: [10, 64800]
 * @example { "collection_interval": 10 }
 */
function setCollectionInterval(collection_interval) {
    if (collection_interval < 10 || collection_interval > 64800) {
        throw new Error("collection_interval must be in the range of 10 to 64800");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x02);
    buffer.writeUInt16LE(collection_interval);
    return buffer.toBytes();
}

/**
 * Set report interval
 * @param {number} report_interval unit: second, range: [10, 64800]
 * @example { "report_interval": 10 }
 */
function setReportInterval(report_interval) {
    if (report_interval < 10 || report_interval > 64800) {
        throw new Error("report_interval must be in the range of 10 to 64800");
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x03);
    buffer.writeUInt16LE(report_interval);
    return buffer.toBytes();
}

/**
 * retransmit enable
 * @since hardware_version>=v3.0, firmware_version>=v3.1
 * @param {number} retransmit_enable values: (0: disable, 1: enable)
 * @example { "retransmit_enable": 1 }
 */
function setRetransmitEnable(retransmit_enable) {
    var enable_map = { 0: "disable", 1: "enable" };
    var enable_values = getValues(enable_map);
    if (enable_values.indexOf(retransmit_enable) === -1) {
        throw new Error("retransmit_enable must be one of " + enable_values.join(", "));
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x69);
    buffer.writeUInt8(getValue(enable_map, retransmit_enable));
    return buffer.toBytes();
}

/**
 * retransmit interval
 * @since hardware_version>=v3.0, firmware_version>=v3.1
 * @param {number} retransmit_interval unit: second, range: [30, 1200]
 * @example { "retransmit_interval": 60 }
 */
function setRetransmitInterval(retransmit_interval) {
    if (retransmit_interval < 30 || retransmit_interval > 1200) {
        throw new Error("retransmit_interval must be in the range of 30 to 1200");
    }

    var buffer = new Buffer(5);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x6a);
    buffer.writeUInt8(0x00);
    buffer.writeUInt16LE(retransmit_interval);
    return buffer.toBytes();
}

/**
 * resend interval
 * @since hardware_version>=v3.0, firmware_version>=v3.1
 * @param {number} resend_interval unit: second, range: [30, 1200]
 * @example { "resend_interval": 60 }
 */
function setResendInterval(resend_interval) {
    if (resend_interval < 30 || resend_interval > 1200) {
        throw new Error("resend_interval must be in the range of 30 to 1200");
    }

    var buffer = new Buffer(5);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x6a);
    buffer.writeUInt8(0x01);
    buffer.writeUInt16LE(resend_interval);
    return buffer.toBytes();
}

/**
 * set time zone
 * @param {number} time_zone unit: minute, UTC+8 -> 8 * 10 = 80
 * @example { "time_zone": 80 }
 */
function setTimeZone(time_zone) {
    var timezone_map = { "-120": "UTC-12", "-110": "UTC-11", "-100": "UTC-10", "-95": "UTC-9:30", "-90": "UTC-9", "-80": "UTC-8", "-70": "UTC-7", "-60": "UTC-6", "-50": "UTC-5", "-40": "UTC-4", "-35": "UTC-3:30", "-30": "UTC-3", "-20": "UTC-2", "-10": "UTC-1", 0: "UTC", 10: "UTC+1", 20: "UTC+2", 30: "UTC+3", 35: "UTC+3:30", 40: "UTC+4", 45: "UTC+4:30", 50: "UTC+5", 55: "UTC+5:30", 57: "UTC+5:45", 60: "UTC+6", 65: "UTC+6:30", 70: "UTC+7", 80: "UTC+8", 90: "UTC+9", 95: "UTC+9:30", 100: "UTC+10", 105: "UTC+10:30", 110: "UTC+11", 120: "UTC+12", 127: "UTC+12:45", 130: "UTC+13", 140: "UTC+14" };
    var timezone_values = getValues(timezone_map);
    if (timezone_values.indexOf(time_zone) === -1) {
        throw new Error("time_zone must be one of " + timezone_values.join(", "));
    }

    var buffer = new Buffer(4);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x17);
    buffer.writeInt16LE(getValue(timezone_map, time_zone));
    return buffer.toBytes();
}

/**
 * Set sync time type
 * @since hardware_version>=v4.0, firmware_version>=v1.1
 * @param {number} sync_time_type values: (1: v1.0.2, 2: v1.0.3, 3: v1.1.0)
 * @example { "sync_time_type": 2 }
 */
function setSyncTimeType(sync_time_type) {
    var sync_time_type_map = { 1: "v1.0.2", 2: "v1.0.3", 3: "v1.1.0" };
    var sync_time_type_values = getValues(sync_time_type_map);
    if (sync_time_type_values.indexOf(sync_time_type) === -1) {
        throw new Error("sync_time_type must be one of " + sync_time_type_values.join(", "));
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x3b);
    buffer.writeUInt8(getValue(sync_time_type_map, sync_time_type));
    return buffer.toBytes();
}

/**
 * set d2d key
 * @since hardware_version>=v4.0, firmware_version>=v1.1
 * @param {string} d2d_key
 * @example { "d2d_key": "0000000000000000" }
 */
function setD2DKey(d2d_key) {
    if (typeof d2d_key !== "string") {
        throw new Error("d2d_key must be a string");
    }
    if (d2d_key.length !== 16) {
        throw new Error("d2d_key must be 16 characters");
    }
    if (!/^[0-9a-fA-F]+$/.test(d2d_key)) {
        throw new Error("d2d_key must be hex string [0-9a-fA-F]");
    }

    var data = hexStringToBytes(d2d_key);
    var buffer = new Buffer(10);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x35);
    buffer.writeBytes(data);
    return buffer.toBytes();
}

/**
 * set d2d enable
 * @since hardware_version>=v4.0, firmware_version>=v1.1
 * @param {number} d2d_enable values: (0: "disable", 1: "enable")
 * @example { "d2d_enable": 1 }
 */
function setD2DEnable(d2d_enable) {
    var enable_map = { 0: "disable", 1: "enable" };
    var enable_values = getValues(enable_map);
    if (enable_values.indexOf(d2d_enable) === -1) {
        throw new Error("d2d_enable must be one of " + enable_values.join(", "));
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x84);
    buffer.writeUInt8(getValue(enable_map, d2d_enable));
    return buffer.toBytes();
}

/**
 * set response enable
 * @since hardware_version>=v3.0, firmware_version>=v3.3
 * @param {number} response_enable values: (0: disable, 1: enable)
 * @example { "response_enable": 1 }
 */
function setResponseEnable(response_enable) {
    var enable_map = { 0: "disable", 1: "enable" };
    var enable_values = getValues(enable_map);
    if (enable_values.indexOf(response_enable) === -1) {
        throw new Error("response_enable must be one of " + enable_values.join(", "));
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xf3);
    buffer.writeUInt8(getValue(enable_map, response_enable));
    return buffer.toBytes();
}

/**
 * set class a response time
 * @since hardware_version>=v4.0, firmware_version>=v1.1
 * @param {number} class_a_response_time unit: s, range: [0, 64800]
 * @example { "class_a_response_time": 10 }
 */
function setClassAResponseTime(class_a_response_time) {
    if (class_a_response_time < 0 || class_a_response_time > 64800) {
        throw new Error("class_a_response_time must be in the range of 0 to 64800");
    }

    var buffer = new Buffer(6);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x1e);
    buffer.writeUInt32LE(class_a_response_time);
    return buffer.toBytes();
}

/**
 * set valve pulse 1
 * @since hardware_version>=v4.0, firmware_version>=v1.1
 * @param {number} valve_1_pulse
 * @example { "valve_1_pulse": 100 }
 */
function setValvePulse1(valve_1_pulse) {
    if (typeof valve_1_pulse !== "number") {
        throw new Error("valve_1_pulse must be a number");
    }

    var buffer = new Buffer(7);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x92);
    buffer.writeUInt8(0x01);
    buffer.writeUInt32LE(valve_1_pulse);
    return buffer.toBytes();
}

/**
 * set valve pulse 2
 * @since hardware_version>=v4.0, firmware_version>=v1.1
 * @param {number} valve_2_pulse unit: pulse
 * @example { "valve_2_pulse": 100 }
 */
function setValvePulse2(valve_2_pulse) {
    if (typeof valve_2_pulse !== "number") {
        throw new Error("valve_2_pulse must be a number");
    }

    var buffer = new Buffer(7);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x92);
    buffer.writeUInt8(0x02);
    buffer.writeUInt32LE(valve_2_pulse);
    return buffer.toBytes();
}

/**
 * set valve task
 * @since hardware_version>=v4.0, firmware_version>=v1.1
 * @param {number} index
 * @param {object} valve_task
 * @param {number} valve_task.time_rule_enable values: (0: disable, 1: enable)
 * @param {number} valve_task.pulse_rule_enable values: (0: disable, 1: enable)
 * @param {number} valve_task.sequence_id values: (0: force execute, 1-255: sequence execute)
 * @param {number} valve_task.valve_status values: (0: close, 1: open)
 * @param {number} valve_task.duration
 * @param {number} valve_task.valve_pulse
 * @example { "valve_1_task": { "time_rule_enable": 1, "pulse_rule_enable": 1, "sequence_id": 0, "valve_status": 0, "duration": 100, "pulse": 100 } }
 */
function setValveTask(index, valve_task) {
    var time_rule_enable = valve_task.time_rule_enable;
    var pulse_rule_enable = valve_task.pulse_rule_enable;
    var sequence_id = valve_task.sequence_id;
    var valve_status = valve_task.valve_status;
    var duration = valve_task.duration;
    var valve_pulse = valve_task.valve_pulse;

    var enable_map = { 0: "disable", 1: "enable" };
    var enable_values = getValues(enable_map);
    var status_map = { 0: "close", 1: "open" };
    var status_values = getValues(status_map);
    if (sequence_id === undefined) {
        sequence_id = 0x00;
    }
    if (enable_values.indexOf(time_rule_enable) === -1) {
        throw new Error("valve_" + index + "_task.time_rule_enable must be one of " + enable_values.join(", "));
    }
    if (enable_values.indexOf(pulse_rule_enable) === -1) {
        throw new Error("valve_" + index + "_task.pulse_rule_enable must be one of " + enable_values.join(", "));
    }
    if (status_values.indexOf(valve_status) === -1) {
        throw new Error("valve_" + index + "_task.valve_status must be one of " + status_values.join(", "));
    }

    var time_rule_enable_value = getValue(enable_map, time_rule_enable);
    var pulse_rule_enable_value = getValue(enable_map, pulse_rule_enable);
    var valve_status_value = getValue(status_map, valve_status);

    var data = 0x00;
    data |= time_rule_enable_value << 7;
    data |= pulse_rule_enable_value << 6;
    data |= valve_status_value << 5;
    data |= (index - 1) << 0;

    var length = 4;
    if (time_rule_enable_value === 1) {
        length += 3;
    }
    if (pulse_rule_enable_value === 1) {
        length += 4;
    }

    var buffer = new Buffer(length);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x1d);
    buffer.writeUInt8(data);
    buffer.writeUInt8(sequence_id);
    if (time_rule_enable_value === 1) {
        buffer.writeUInt24LE(duration);
    }
    if (pulse_rule_enable_value === 1) {
        buffer.writeUInt32LE(valve_pulse);
    }
    return buffer.toBytes();
}

/**
 * read rules
 * @since hardware_version>=v2.0, firmware_version>=v2.1
 * @deprecated hardware_version>=v4.0, firmware_version>=v1.1
 * @param {object} batch_read_rules
 * @param {number} batch_read_rules.rule_1
 * @param {number} batch_read_rules.rule_2
 * @param {number} batch_read_rules.rule_x
 * @param {number} batch_read_rules.rule_16
 * @example { "batch_read_rules": { "rules_id": 1 } }
 */
function batchReadRules(batch_read_rules) {
    var enable_map = { 0: "no", 1: "yes" };
    var enable_values = getValues(enable_map);

    var data = 0;
    var rule_bit_offset = { rule_1: 0, rule_2: 1, rule_3: 2, rule_4: 3, rule_5: 4, rule_6: 5, rule_7: 6, rule_8: 7, rule_9: 8, rule_10: 9, rule_11: 10, rule_12: 11, rule_13: 12, rule_14: 13, rule_15: 14, rule_16: 15 };
    for (var key in rule_bit_offset) {
        if (key in batch_read_rules) {
            if (enable_values.indexOf(batch_read_rules[key]) === -1) {
                throw new Error("batch_read_rules." + key + " must be one of " + enable_values.join(", "));
            }
            data |= getValue(enable_map, batch_read_rules[key]) << rule_bit_offset[key];
        }
    }

    var buffer = new Buffer(5);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x4b);
    buffer.writeUInt8(0x00); // read rules
    buffer.writeUInt16LE(data);
    return buffer.toBytes();
}

/**
 * batch enable rules
 * @since hardware_version>=v2.0, firmware_version>=v2.1
 * @deprecated hardware_version>=v4.0, firmware_version>=v1.1
 * @param {object} batch_enable_rules
 * @param {number} batch_enable_rules.rule_1
 * @param {number} batch_enable_rules.rule_2
 * @param {number} batch_enable_rules.rule_x
 * @param {number} batch_enable_rules.rule_16
 * @example { "batch_enable_rules": { "rule_1": 1, "rule_2": 1, "rule_3": 1, "rule_4": 1 } }
 */
function batchEnableRules(batch_enable_rules) {
    var enable_map = { 0: "disable", 1: "enable" };
    var enable_values = getValues(enable_map);

    var data = 0;
    var rule_bit_offset = { rule_1: 0, rule_2: 1, rule_3: 2, rule_4: 3, rule_5: 4, rule_6: 5, rule_7: 6, rule_8: 7, rule_9: 8, rule_10: 9, rule_11: 10, rule_12: 11, rule_13: 12, rule_14: 13, rule_15: 14, rule_16: 15 };
    for (var key in rule_bit_offset) {
        if (key in batch_enable_rules) {
            if (enable_values.indexOf(batch_enable_rules[key]) === -1) {
                throw new Error("batch_enable_rules." + key + " must be one of " + enable_values.join(", "));
            }
            data |= getValue(enable_map, batch_enable_rules[key]) << rule_bit_offset[key];
        }
    }

    var buffer = new Buffer(5);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x4b);
    buffer.writeUInt8(0x01); // enable rules
    buffer.writeUInt16LE(data);
    return buffer.toBytes();
}

/**
 * batch remove rules
 * @since hardware_version>=v2.0, firmware_version>=v2.1
 * @deprecated hardware_version>=v4.0, firmware_version>=v1.1
 * @param {object} batch_remove_rules
 * @param {number} batch_remove_rules.rule_1
 * @param {number} batch_remove_rules.rule_2
 * @param {number} batch_remove_rules.rule_x
 * @param {number} batch_remove_rules.rule_16
 * @example { "batch_remove_rules": { "rule_1": 1, "rule_2": 1, "rule_3": 1, "rule_4": 1 } }
 */
function batchRemoveRules(batch_remove_rules) {
    var yes_no_map = { 0: "no", 1: "yes" };
    var yes_no_values = getValues(yes_no_map);

    var data = 0;
    var rule_bit_offset = { rule_1: 0, rule_2: 1, rule_3: 2, rule_4: 3, rule_5: 4, rule_6: 5, rule_7: 6, rule_8: 7, rule_9: 8, rule_10: 9, rule_11: 10, rule_12: 11, rule_13: 12, rule_14: 13, rule_15: 14, rule_16: 15 };
    for (var key in rule_bit_offset) {
        if (key in batch_remove_rules) {
            if (yes_no_values.indexOf(batch_remove_rules[key]) === -1) {
                throw new Error("batch_remove_rules." + key + " must be one of " + yes_no_values.join(", "));
            }
            data |= getValue(yes_no_map, batch_remove_rules[key]) << rule_bit_offset[key];
        }
    }

    var buffer = new Buffer(5);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x4b);
    buffer.writeUInt8(0x02); // remove rules
    buffer.writeUInt16LE(data);
    return buffer.toBytes();
}

/**
 * enable rule
 * @since hardware_version>=v2.0, firmware_version>=v2.1
 * @deprecated hardware_version>=v4.0, firmware_version>=v1.1
 * @param {number} rule_index range: [1, 16]
 * @param {number} enable values: (0: disable, 1: enable)
 * @example { "rule_1_enable": 1 }
 * @example { "rule_2_enable": 1 }
 */
function enableRule(rule_index, enable) {
    var enable_map = { 0: "disable", 1: "enable" };
    var enable_values = getValues(enable_map);

    if (enable_values.indexOf(enable) === -1) {
        throw new Error("rule_" + rule_index + "_enable must be one of " + enable_values.join(", "));
    }

    var buffer = new Buffer(5);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x4b);
    buffer.writeUInt8(0x03); // enable single rule
    buffer.writeUInt8(rule_index);
    buffer.writeUInt8(getValue(enable_map, enable));
    return buffer.toBytes();
}

/**
 * remove rule
 * @since hardware_version>=v2.0, firmware_version>=v2.1
 * @deprecated hardware_version>=v4.0, firmware_version>=v1.1
 * @param {number} rule_index range: [1, 16]
 * @example { "remove_rule": 1 }
 */
function removeRule(rule_index) {
    var buffer = new Buffer(5);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x4b);
    buffer.writeUInt8(0x04); // remove single rule
    buffer.writeUInt8(rule_index);
    buffer.writeUInt8(0x00);
    return buffer.toBytes();
}

/**
 * query rule config
 * @since hardware_version>=v2.0, firmware_version>=v2.1
 * @deprecated hardware_version>=v4.0, firmware_version>=v1.1
 * @param {object} query_rule_config
 * @param {number} query_rule_config.rule_1 values: (0: no, 1: yes)
 * @param {number} query_rule_config.rule_2 values: (0: no, 1: yes)
 * @param {number} query_rule_config.rule_x values: (0: no, 1: yes)
 * @param {number} query_rule_config.rule_16 values: (0: no, 1: yes)
 */
function queryRuleConfig(query_rule_config) {
    var yes_no_map = { 0: "no", 1: "yes" };
    var yes_no_values = getValues(yes_no_map);

    var data = [];
    var rule_offset = { rule_1: 1, rule_2: 2, rule_3: 3, rule_4: 4, rule_5: 5, rule_6: 6, rule_7: 7, rule_8: 8, rule_9: 9, rule_10: 10, rule_11: 11, rule_12: 12, rule_13: 13, rule_14: 14, rule_15: 15, rule_16: 16 };
    for (var key in rule_offset) {
        if (key in query_rule_config) {
            if (yes_no_values.indexOf(query_rule_config[key]) === -1) {
                throw new Error("query_rule_config." + key + " must be one of " + yes_no_values.join(", "));
            }
            if (getValue(yes_no_map, query_rule_config[key]) === 0) {
                continue;
            }
            data = data.concat([0xff, 0x4c, rule_offset[key]]);
        }
    }

    return data;
}

/**
 * set rule config
 * @since hardware_version>=v2.0, firmware_version>=v2.1
 * @deprecated hardware_version>=v4.0, firmware_version>=v1.1
 * @param {object} rule_config
 * @param {number} rule_config.id
 * @param {number} rule_config.enable values: (0: disable, 1: enable)
 * @param {number} rule_config.valve_status values: (0: open, 1: close)
 * @param {number} rule_config.valve_1_enable values: (0: disable, 1: enable)
 * @param {number} rule_config.valve_2_enable values: (0: disable, 1: enable)
 * @param {object} rule_config.week_cycle
 * @param {number} rule_config.week_cycle.monday values: (0: disable, 1: enable)
 * @param {number} rule_config.week_cycle.tuesday values: (0: disable, 1: enable)
 * @param {number} rule_config.week_cycle.wednesday values: (0: disable, 1: enable)
 * @param {number} rule_config.week_cycle.thursday values: (0: disable, 1: enable)
 * @param {number} rule_config.week_cycle.friday values: (0: disable, 1: enable)
 * @param {number} rule_config.week_cycle.saturday values: (0: disable, 1: enable)
 * @param {number} rule_config.week_cycle.sunday values: (0: disable, 1: enable)
 * @param {number} rule_config.start_hour range: [0, 24]
 * @param {number} rule_config.start_min range: [0, 59]
 * @param {number} rule_config.end_hour range: [0, 24]
 * @param {number} rule_config.end_min range: [0, 59]
 * @param {number} rule_config.valve_pulse range: [0, 65535]
 * @example { "rule_config": { "id": 1, "enable": 1, "valve_status": 0, "valve_1_enable": 1, "valve_2_enable": 1, "week_cycle": { "monday": 1, "tuesday": 1, "wednesday": 1, "thursday": 1, "friday": 1, "saturday": 1, "sunday": 1 }, "start_hour": 10, "start_min": 0, "end_hour": 18, "end_min": 0, "valve_pulse": 100 } }
 */
function setRuleConfig(rule_config) {
    var id = rule_config.id;
    var enable = rule_config.enable;
    var valve_status = rule_config.valve_status;
    var valve_1_enable = rule_config.valve_1_enable;
    var valve_2_enable = rule_config.valve_2_enable;
    var week_cycle = rule_config.week_cycle;
    var start_hour = rule_config.start_hour;
    var start_min = rule_config.start_min;
    var end_hour = rule_config.end_hour;
    var end_min = rule_config.end_min;
    var valve_pulse = rule_config.valve_pulse;

    var enable_map = { 0: "disable", 1: "enable" };
    var enable_values = getValues(enable_map);
    var status_map = { 0: "open", 1: "close" };
    var status_values = getValues(status_map);
    if (id < 1 || id > 16) {
        throw new Error("rules_config._item.id must be in the range of 1 to 16");
    }
    if (enable_values.indexOf(enable) === -1) {
        throw new Error("rules_config._item.enable must be one of " + enable_values.join(", "));
    }
    if (status_values.indexOf(valve_status) === -1) {
        throw new Error("rules_config._item.valve_status must be one of " + status_values.join(", "));
    }
    if (enable_values.indexOf(valve_1_enable) === -1) {
        throw new Error("rules_config._item.valve_1_enable must be one of " + enable_values.join(", "));
    }
    if (enable_values.indexOf(valve_2_enable) === -1) {
        throw new Error("rules_config._item.valve_2_enable must be one of " + enable_values.join(", "));
    }
    if (start_hour < 0 || start_hour > 24) {
        throw new Error("rules_config._item.start_hour must be in the range of 0 to 24");
    }
    if (start_min < 0 || start_min > 59) {
        throw new Error("rules_config._item.start_min must be in the range of 0 to 59");
    }
    if (end_hour < 0 || end_hour > 24) {
        throw new Error("rules_config._item.end_hour must be in the range of 0 to 24");
    }
    if (end_min < 0 || end_min > 59) {
        throw new Error("rules_config._item.end_min must be in the range of 0 to 59");
    }

    var data = 0x00;
    data |= getValue(enable_map, enable) << 7;
    data |= getValue(status_map, valve_status) << 6;
    data |= getValue(enable_map, valve_2_enable) << 1;
    data |= getValue(enable_map, valve_1_enable) << 0;

    var week_cycle_value = 0x00;
    var week_offset = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
    for (var key in week_offset) {
        if (key in week_cycle) {
            week_cycle_value |= getValue(enable_map, week_cycle[key]) << week_offset[key];
        }
    }

    var buffer = new Buffer(11);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x4d);
    buffer.writeUInt8(id);
    buffer.writeUInt8(data);
    buffer.writeUInt8(week_cycle_value);
    buffer.writeUInt8(start_hour);
    buffer.writeUInt8(start_min);
    buffer.writeUInt8(end_hour);
    buffer.writeUInt8(end_min);
    buffer.writeUInt16LE(valve_pulse);
    return buffer.toBytes();
}

/**
 * set rule config
 * @since hardware_version>=v4.0, firmware_version>=v1.1
 * @param {object} rule_config
 * @param {number} rule_config.id range: [1, 16]
 * @param {number} rule_config.enable values: (0: disable, 1: enable)
 * @param {object} rule_config.condition
 * @param {object} rule_config.action
 */
function setNewRuleConfig(rule_config) {
    var id = rule_config.id;
    var enable = rule_config.enable;
    var condition = rule_config.condition;
    var action = rule_config.action;

    var enable_map = { 0: "disable", 1: "enable" };
    var enable_values = getValues(enable_map);
    if (enable_values.indexOf(enable) === -1) {
        throw new Error("rules_config._item.enable must be one of " + enable_values.join(", "));
    }

    var buffer = new Buffer(30);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x55);
    buffer.writeUInt8(id); // set rule config
    buffer.writeUInt8(getValue(enable_map, enable));
    buffer.writeBytes(encodedRuleCondition(condition));
    buffer.writeBytes(encodedAction(action));
    return buffer.toBytes();
}

/**
 * rule config condition
 * @param {object} condition
 * @param {number} condition.type values: (0: none, 1: time, 2: d2d, 3: time_or_pulse_threshold, 4: pulse_threshold)
 * @param {number} condition.start_time unit: second
 * @param {number} condition.end_time unit: second
 * @param {number} condition.repeat_enable values: (0: disable, 1: enable)
 * @param {number} condition.repeat_mode values: (0: monthly, 1: daily, 2: weekly)
 * @param {number} condition.repeat_step
 * @param {object} condition.repeat_week
 * @param {number} condition.repeat_week.monday values: (0: disable, 1: enable)
 * @param {number} condition.repeat_week.tuesday values: (0: disable, 1: enable)
 * @param {number} condition.repeat_week.wednesday values: (0: disable, 1: enable)
 * @param {number} condition.repeat_week.thursday values: (0: disable, 1: enable)
 * @param {number} condition.repeat_week.friday values: (0: disable, 1: enable)
 * @param {number} condition.repeat_week.saturday values: (0: disable, 1: enable)
 * @param {number} condition.repeat_week.sunday values: (0: disable, 1: enable)
 * @param {number} condition.d2d_command
 * @param {number} condition.valve_index values: (1: valve_1, 2: valve_2)
 * @param {number} condition.duration unit: min
 * @param {number} condition.pulse_threshold
 */
function encodedRuleCondition(condition) {
    var enable_map = { 0: "disable", 1: "enable" };
    var enable_values = getValues(enable_map);
    var condition_type_map = { 0: "none", 1: "time", 2: "d2d", 3: "time_or_pulse_threshold", 4: "pulse_threshold" };
    var condition_type_values = getValues(condition_type_map);
    var repeat_mode_map = { 0: "monthly", 1: "daily", 2: "weekly" };
    var repeat_mode_values = getValues(repeat_mode_map);
    var weekday_bit_offset = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };

    if (condition_type_values.indexOf(condition.type) === -1) {
        throw new Error("rules_config._item.condition.type must be one of " + condition_type_values.join(", "));
    }
    var buffer = new Buffer(13);
    var condition_type_value = getValue(condition_type_map, condition.type);
    buffer.writeUInt8(condition_type_value);
    switch (condition_type_value) {
        case 0x00: // none
            break;
        case 0x01: // time condition (start_time, end_time, repeat_enable, repeat_mode, [repeat_step], [repeat_week])
            if (enable_values.indexOf(condition.repeat_enable) === -1) {
                throw new Error("rules_config._item.condition.repeat_enable must be one of " + enable_values.join(", "));
            }
            if (repeat_mode_values.indexOf(condition.repeat_mode) === -1) {
                throw new Error("rules_config._item.condition.repeat_mode must be one of " + repeat_mode_values.join(", "));
            }
            buffer.writeUInt32LE(condition.start_time);
            buffer.writeUInt32LE(condition.end_time);
            buffer.writeUInt8(getValue(enable_map, condition.repeat_enable));
            var repeat_mode_value = getValue(repeat_mode_map, condition.repeat_mode);
            buffer.writeUInt8(repeat_mode_value);
            // repeat mode: monthly or daily
            if (repeat_mode_value === 0x00 || repeat_mode_value === 0x01) {
                buffer.writeUInt16LE(condition.repeat_step);
            }
            // repeat mode: weekly
            else if (repeat_mode_value === 0x02) {
                var weekday_value = 0;
                for (var key in weekday_bit_offset) {
                    if (key in condition.repeat_week) {
                        if (enable_values.indexOf(condition.repeat_week[key]) === -1) {
                            throw new Error("rules_config._item.repeat_week." + key + " must be one of " + enable_values.join(", "));
                        }
                        weekday_value |= getValue(enable_map, condition.repeat_week[key]) << weekday_bit_offset[key];
                    }
                }
                buffer.writeUInt16LE(weekday_value);
            }
            break;
        case 0x02: // d2d condition (d2d_command)
            buffer.writeD2DCommand(condition.d2d_command, "0000");
            break;
        case 0x03: // time or pulse threshold condition (valve_index, duration, pulse_threshold)
            buffer.writeUInt8(condition.valve_index);
            buffer.writeUInt16LE(condition.duration);
            buffer.writeUInt32LE(condition.pulse_threshold);
            break;
        case 0x04: // pulse threshold condition (valve_index, pulse_threshold)
            buffer.writeUInt8(condition.valve_index);
            buffer.writeUInt32LE(condition.pulse_threshold);
            break;
    }

    return buffer.toBytes();
}

/**
 * rule config action
 * @param {object} action
 * @param {number} action.type values: (0: none, 1: em_valve_control, 2: valve_control, 3: report)
 * @param {number} action.valve_index values: (1: valve_1, 2: valve_2)
 * @param {number} action.valve_opening
 * @param {number} action.time_enable values: (0: disable, 1: enable)
 * @param {number} action.duration unit: min
 * @param {number} action.pulse_enable values: (0: disable, 1: enable)
 * @param {number} action.pulse_threshold
 * @param {number} action.report_type values: (1: valve_1, 2: valve_2, 3: custom_message)
 * @param {string} action.report_content
 * @param {number} action.report_counts
 * @param {number} action.threshold_release_enable values: (0: disable, 1: enable)
 * @example { "rules_config": [ { "index": 1, "enable": 1, "condition": { "type": 0 }, "action": { "type": 1, "valve_index": 1, "valve_opening": 1, "time_enable": 1, "duration": 1, "pulse_enable": 1, "pulse_threshold": 1 } }]}
 */
function encodedAction(action) {
    var enable_map = { 0: "disable", 1: "enable" };
    var enable_values = getValues(enable_map);
    var action_type_map = { 0: "none", 1: "em_valve_control", 2: "valve_control", 3: "report" };
    var action_type_values = getValues(action_type_map);
    var report_type_map = { 1: "valve_1", 2: "valve_2", 3: "custom_message" };
    var report_type_values = getValues(report_type_map);

    var buffer = new Buffer(13);
    if (action_type_values.indexOf(action.type) === -1) {
        throw new Error("rules_config._item.action.type must be one of " + action_type_values.join(", "));
    }
    var action_type_value = getValue(action_type_map, action.type);
    buffer.writeUInt8(action_type_value);
    switch (action_type_value) {
        case 0x00: // none
            break;
        case 0x01: // em valve control (interrupt current execution task)
            if (enable_values.indexOf(action.time_enable) === -1) {
                throw new Error("rules_config._item.action.time_enable must be one of " + enable_values.join(", "));
            }
            if (enable_values.indexOf(action.pulse_enable) === -1) {
                throw new Error("rules_config._item.action.pulse_enable must be one of " + enable_values.join(", "));
            }
            buffer.writeUInt8(action.valve_index);
            buffer.writeUInt8(action.valve_opening);
            buffer.writeUInt8(getValue(enable_map, action.time_enable));
            buffer.writeUInt32LE(action.duration);
            buffer.writeUInt8(getValue(enable_map, action.pulse_enable));
            buffer.writeUInt32LE(action.pulse_threshold);
            break;
        case 0x02: // general valve control
            if (enable_values.indexOf(action.time_enable) === -1) {
                throw new Error("rules_config._item.action.time_enable must be one of " + enable_values.join(", "));
            }
            if (enable_values.indexOf(action.pulse_enable) === -1) {
                throw new Error("rules_config._item.action.pulse_enable must be one of " + enable_values.join(", "));
            }
            buffer.writeUInt8(action.valve_index);
            buffer.writeUInt8(action.valve_opening);
            buffer.writeUInt8(getValue(enable_map, action.time_enable));
            buffer.writeUInt32LE(action.duration);
            buffer.writeUInt8(getValue(enable_map, action.pulse_enable));
            buffer.writeUInt32LE(action.pulse_threshold);
            break;
        case 0x03: // report
            if (report_type_values.indexOf(action.report_type) === -1) {
                throw new Error("rules_config._item.action.report_type must be one of " + report_type_values.join(", "));
            }
            buffer.writeUInt8(getValue(report_type_map, action.report_type));
            buffer.writeAscii(action.report_content, 8);
            break;
    }
    return buffer.toBytes();
}

/**
 * clear valve pulse
 * @param {number} valve_index values: (1: valve 1, 2: valve 2)
 * @param {number} clear_valve_pulse values: (0: no, 1: yes)
 * @example { "clear_valve_1_pulse": 1 }
 * @example { "clear_valve_2_pulse": 1 }
 */
function clearValvePulse(valve_index, clear_valve_pulse) {
    var yes_no_map = { 0: "no", 1: "yes" };
    var yes_no_values = getValues(yes_no_map);
    if (yes_no_values.indexOf(clear_valve_pulse) === -1) {
        throw new Error("clear_valve_pulse must be one of " + yes_no_values.join(", "));
    }

    if (getValue(yes_no_map, clear_valve_pulse) === 0) {
        return [];
    }
    return [0xff, 0x4e, valve_index, 0x00];
}

/**
 * set pulse filter config
 * @since hardware_version>=v4.0, firmware_version>=v1.1
 * @param {object} pulse_filter_config
 * @param {number} pulse_filter_config.mode values: (1: hardware, 2: software)
 * @param {number} pulse_filter_config.time hardware: unit: us, software: unit: ms
 * @example { "pulse_filter_config": { "mode": 1, "time": 40 } }
 */
function setPulseFilterConfig(pulse_filter_config) {
    var mode = pulse_filter_config.mode;
    var time = pulse_filter_config.time;

    var mode_map = { 1: "hardware", 2: "software" };
    var mode_values = getValues(mode_map);
    if (mode_values.indexOf(mode) === -1) {
        throw new Error("pulse_filter_config.mode must be one of " + mode_values.join(", "));
    }

    var buffer = new Buffer(6);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x52);
    buffer.writeUInt8(0x00);
    buffer.writeUInt8(getValue(mode_map, mode));
    buffer.writeUInt16LE(time);
    return buffer.toBytes();
}

/**
 * set gpio jitter time
 * @since hardware_version>=v4.0, firmware_version>=v1.1
 * @param {number} gpio_jitter_time unit: s
 * @example { "gpio_jitter_time": 40 }
 */
function setGpioJitterTime(gpio_jitter_time) {
    if (typeof gpio_jitter_time !== "number") {
        throw new Error("gpio_jitter_time must be a number");
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x46);
    buffer.writeUInt8(gpio_jitter_time);
    return buffer.toBytes();
}

/**
 * set valve power supply config
 * @since hardware_version>=v2.0, firmware_version>=v2.3
 * @param {object} valve_power_supply_config
 * @param {number} valve_power_supply_config.counts range: [1, 5]
 * @param {number} valve_power_supply_config.control_pulse_time unit: ms, range: [20, 1000]
 * @param {number} valve_power_supply_config.power_time unit: ms, range: [500, 10000]
 * @example { "valve_power_supply_config": { "counts": 1, "control_pulse_time": 100, "power_time": 1000 } }
 */
function setValvePowerSupplyConfig(valve_power_supply_config) {
    var counts = valve_power_supply_config.counts;
    var control_pulse_time = valve_power_supply_config.control_pulse_time;
    var power_time = valve_power_supply_config.power_time;

    if (counts < 1 || counts > 5) {
        throw new Error("valve_power_supply_config.counts must be in the range of 1 to 5");
    }
    if (control_pulse_time < 20 || control_pulse_time > 1000) {
        throw new Error("valve_power_supply_config.control_pulse_time must be in the range of 20 to 1000");
    }
    if (power_time < 500 || power_time > 10000) {
        throw new Error("valve_power_supply_config.power_time must be in the range of 500 to 10000");
    }

    var buffer = new Buffer(7);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x4f);
    buffer.writeUInt8(counts);
    buffer.writeUInt16LE(control_pulse_time);
    buffer.writeUInt16LE(power_time);
    return buffer.toBytes();
}

/**
 * set pressure calibration
 * @since hardware_version>=v4.0, firmware_version>=v1.1
 * @param {object} pressure_calibration_settings
 * @param {number} pressure_calibration_settings.enable values: (0: disable, 1: enable)
 * @param {number} pressure_calibration_settings.calibration_value unit: kPa
 * @example { "pressure_calibration_settings": { "enable": 1, "calibration_value": 1 } }
 */
function setPressureCalibration(pressure_calibration_settings) {
    var enable = pressure_calibration_settings.enable;
    var calibration_value = pressure_calibration_settings.calibration_value;

    var enable_map = { 0: "disable", 1: "enable" };
    var enable_values = getValues(enable_map);
    if (enable_values.indexOf(enable) === -1) {
        throw new Error("pressure_calibration_settings.enable must be one of " + enable_values.join(", "));
    }

    var buffer = new Buffer(5);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0xab);
    buffer.writeUInt8(getValue(enable_map, enable));
    buffer.writeInt16LE(calibration_value);
    return buffer.toBytes();
}

/**
 * history enable
 * @since hardware_version>=v3.0, firmware_version>=v3.1
 * @param {number} history_enable values: (0: disable, 1: enable)
 * @example { "history_enable": 1 }
 */
function setHistoryEnable(history_enable) {
    var enable_map = { 0: "disable", 1: "enable" };
    var enable_values = getValues(enable_map);
    if (enable_values.indexOf(history_enable) === -1) {
        throw new Error("history_enable must be one of " + enable_values.join(", "));
    }

    var buffer = new Buffer(3);
    buffer.writeUInt8(0xff);
    buffer.writeUInt8(0x68);
    buffer.writeUInt8(getValue(enable_map, history_enable));
    return buffer.toBytes();
}

/**
 * clear history
 * @since hardware_version>=v3.0, firmware_version>=v3.1
 * @param {number} clear_history values:(0: no, 1: yes)
 * @example { "clear_history": 1 }
 */
function clearHistory(clear_history) {
    var yes_no_map = { 0: "no", 1: "yes" };
    var yes_no_values = getValues(yes_no_map);
    if (yes_no_values.indexOf(clear_history) === -1) {
        throw new Error("clear_history must be one of " + yes_no_values.join(", "));
    }

    if (getValue(yes_no_map, clear_history) === 0) {
        return [];
    }
    return [0xff, 0x27, 0xff];
}

/**
 * fetch history
 * @param {object} fetch_history
 * @param {number} fetch_history.start_time
 * @param {number} fetch_history.end_time
 * @example { "fetch_history": { "start_time": 1609459200, "end_time": 1609545600 } }
 */
function fetchHistory(fetch_history) {
    var start_time = fetch_history.start_time;
    var end_time = fetch_history.end_time;

    if (typeof start_time !== "number") {
        throw new Error("start_time must be a number");
    }
    if (end_time && typeof end_time !== "number") {
        throw new Error("end_time must be a number");
    }
    if (end_time && start_time > end_time) {
        throw new Error("start_time must be less than end_time");
    }

    var buffer;
    if (end_time === 0) {
        buffer = new Buffer(6);
        buffer.writeUInt8(0xfd);
        buffer.writeUInt8(0x6b);
        buffer.writeUInt32LE(start_time);
    } else {
        buffer = new Buffer(10);
        buffer.writeUInt8(0xfd);
        buffer.writeUInt8(0x6c);
        buffer.writeUInt32LE(start_time);
        buffer.writeUInt32LE(end_time);
    }

    return buffer.toBytes();
}

/**
 * history stop transmit
 * @param {number} stop_transmit values: (0: no, 1: yes)
 * @example { "stop_transmit": 1 }
 */
function stopTransmit(stop_transmit) {
    var yes_no_map = { 0: "no", 1: "yes" };
    var yes_no_values = getValues(yes_no_map);
    if (yes_no_values.indexOf(stop_transmit) === -1) {
        throw new Error("stop_transmit must be one of " + yes_no_values.join(", "));
    }

    if (getValue(yes_no_map, stop_transmit) === 0) {
        return [];
    }
    return [0xfd, 0x6d, 0xff];
}

function getValues(map) {
    var values = [];
    for (var key in map) {
        values.push(RAW_VALUE ? parseInt(key) : map[key]);
    }
    return values;
}

function getValue(map, value) {
    if (RAW_VALUE) return value;

    for (var key in map) {
        if (map[key] === value) {
            return parseInt(key);
        }
    }

    throw new Error("not match in " + JSON.stringify(map));
}

function Buffer(size) {
    this.buffer = new Array(size);
    this.offset = 0;

    for (var i = 0; i < size; i++) {
        this.buffer[i] = 0;
    }
}

Buffer.prototype._write = function (value, byteLength, isLittleEndian) {
    var offset = 0;
    for (var index = 0; index < byteLength; index++) {
        offset = isLittleEndian ? index << 3 : (byteLength - 1 - index) << 3;
        this.buffer[this.offset + index] = (value >> offset) & 0xff;
    }
};

Buffer.prototype.writeUInt8 = function (value) {
    this._write(value, 1, true);
    this.offset += 1;
};

Buffer.prototype.writeInt8 = function (value) {
    this._write(value < 0 ? value + 0x100 : value, 1, true);
    this.offset += 1;
};

Buffer.prototype.writeUInt16LE = function (value) {
    this._write(value, 2, true);
    this.offset += 2;
};

Buffer.prototype.writeInt16LE = function (value) {
    this._write(value < 0 ? value + 0x10000 : value, 2, true);
    this.offset += 2;
};

Buffer.prototype.writeUInt24LE = function (value) {
    this._write(value, 3, true);
    this.offset += 3;
};

Buffer.prototype.writeInt24LE = function (value) {
    this._write(value < 0 ? value + 0x1000000 : value, 3, true);
    this.offset += 3;
};

Buffer.prototype.writeUInt32LE = function (value) {
    this._write(value, 4, true);
    this.offset += 4;
};

Buffer.prototype.writeInt32LE = function (value) {
    this._write(value < 0 ? value + 0x100000000 : value, 4, true);
    this.offset += 4;
};

Buffer.prototype.writeBytes = function (bytes) {
    for (var i = 0; i < bytes.length; i++) {
        this.buffer[this.offset + i] = bytes[i];
    }
    this.offset += bytes.length;
};

Buffer.prototype.writeAscii = function (value, maxLength) {
    for (let i = 0; i < maxLength; i++) {
        if (i < value.length) {
            this.buffer[this.offset + i] = value.charCodeAt(i);
        } else {
            this.buffer[this.offset + i] = 0;
        }
    }
    this.offset += maxLength;
};

Buffer.prototype.writeD2DCommand = function (value, defaultValue) {
    if (typeof value !== "string") {
        value = defaultValue;
    }
    if (value.length !== 4) {
        throw new Error("d2d_cmd length must be 4");
    }
    this.buffer[this.offset] = parseInt(value.substr(2, 2), 16);
    this.buffer[this.offset + 1] = parseInt(value.substr(0, 2), 16);
    this.offset += 2;
};

Buffer.prototype.toBytes = function () {
    return this.buffer;
};

function hexStringToBytes(hex) {
    var bytes = [];
    for (var c = 0; c < hex.length; c += 2) {
        bytes.push(parseInt(hex.substr(c, 2), 16));
    }
    return bytes;
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
