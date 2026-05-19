// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Tektelic Communications Inc.
// Device       : COMFORT - Smart Room Sensor - Base
// fPort(s)     : 10
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/tektelic/decoder_smart_room_sensor_pir_base.js
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/tektelic/encoder_smart_room_sensor_pir_base.js
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

    function slice(a, f, t) {
        var res = [];
        for (var i = 0; i < t - f; i++) {
            res[i] = a[f + i];
        }
        return res;
    }

    function extract_bytes(chunk, start_bit, end_bit) {
        var total_bits = end_bit - start_bit + 1;
        var total_bytes = total_bits % 8 === 0 ? to_uint(total_bits / 8) : to_uint(total_bits / 8) + 1;
        var offset_in_byte = start_bit % 8;
        var end_bit_chunk = total_bits % 8;
        var arr = new Array(total_bytes);
        for (byte = 0; byte < total_bytes; ++byte) {
            var chunk_idx = to_uint(start_bit / 8) + byte;
            var lo = chunk[chunk_idx] >> offset_in_byte;
            var hi = 0;
            if (byte < total_bytes - 1) {
                hi = (chunk[chunk_idx + 1] & ((1 << offset_in_byte) - 1)) << (8 - offset_in_byte);
            } else if (end_bit_chunk !== 0) {
                // Truncate last bits
                lo = lo & ((1 << end_bit_chunk) - 1);
            }
            arr[byte] = hi | lo;
        }
        return arr;
    }

    function apply_data_type(bytes, data_type) {
        output = 0;
        if (data_type === "unsigned") {
            for (var i = 0; i < bytes.length; ++i) {
                output = (to_uint(output << 8)) | bytes[i];
            }
            return output;
        }
        if (data_type === "signed") {
            for (var i = 0; i < bytes.length; ++i) {
                output = (output << 8) | bytes[i];
            }
            // Convert to signed, based on value size
            if (output > Math.pow(2, 8 * bytes.length - 1)) {
                output -= Math.pow(2, 8 * bytes.length);
            }
            return output;
        }
        if (data_type === "bool") {
            return !(bytes[0] === 0);
        }
        if (data_type === "hexstring") {
            return toHexString(bytes);
        }
        // Incorrect data type
        return null;
    }

    function decode_field(chunk, start_bit, end_bit, data_type) {
        chunk_size = chunk.length;
        if (end_bit >= chunk_size * 8) {
            return null; // Error: exceeding boundaries of the chunk
        }
        if (end_bit < start_bit) {
            return null; // Error: invalid input
        }
        arr = extract_bytes(chunk, start_bit, end_bit);
        return apply_data_type(arr, data_type);
    }

    var decoded_data = {};
    var decoder = [];

    if (input.fPort === 10) {
        decoder = [
            {
                key: [0x00, 0xFF],
                fn: function (arg) {
                    decoded_data.battery_voltage = decode_field(arg, 0, 15, "signed") * 0.01;
                    return 2;
                }
            },
            {
                key: [0x01, 0x00],
                fn: function (arg) {
                    decoded_data.reed_state = decode_field(arg, 0, 7, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x02, 0x00],
                fn: function (arg) {
                    decoded_data.light_detected = decode_field(arg, 0, 7, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x03, 0x67],
                fn: function (arg) {
                    decoded_data.ambient_temperature = decode_field(arg, 0, 15, "signed") * 0.1;
                    return 2;
                }
            },
            {
                key: [0x04, 0x68],
                fn: function (arg) {
                    decoded_data.relative_humidity = decode_field(arg, 0, 7, "unsigned") * 0.5;
                    return 1;
                }
            },
            {
                key: [0x05, 0x02],
                fn: function (arg) {
                    decoded_data.impact_magnitude = decode_field(arg, 0, 15, "unsigned") * 0.001;
                    return 2;
                }
            },
            {
                key: [0x07, 0x71],
                fn: function (arg) {
                    decoded_data['acceleration.xaxis'] = decode_field(arg, 0, 15, "signed") * 0.001;
                    decoded_data['acceleration.yaxis'] = decode_field(arg, 16, 31, "signed") * 0.001;
                    decoded_data['acceleration.zaxis'] = decode_field(arg, 32, 47, "signed") * 0.001;
                    return 6;
                }
            },
            {
                key: [0x08, 0x04],
                fn: function (arg) {
                    decoded_data.reed_count = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x09, 0x00],
                fn: function (arg) {
                    decoded_data.moisture = decode_field(arg, 0, 7, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x0A, 0x00],
                fn: function (arg) {
                    decoded_data.motion_event_state = decode_field(arg, 0, 7, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x0B, 0x67],
                fn: function (arg) {
                    decoded_data.mcu_temperature = decode_field(arg, 0, 15, "signed") * 0.1;
                    return 2;
                }
            },
            {
                key: [0x0C, 0x00],
                fn: function (arg) {
                    decoded_data.impact_alarm = decode_field(arg, 0, 7, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x0D, 0x04],
                fn: function (arg) {
                    decoded_data.motion_event_count = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x0E, 0x00],
                fn: function (arg) {
                    decoded_data.extconnector_state = decode_field(arg, 0, 7, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x0F, 0x04],
                fn: function (arg) {
                    decoded_data.extconnector_count = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x10, 0x02],
                fn: function (arg) {
                    decoded_data.light_intensity = decode_field(arg, 0, 7, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x11, 0x02],
                fn: function (arg) {
                    decoded_data.extconnector_analog = decode_field(arg, 0, 15, "unsigned") * 0.001;
                    return 2;
                }
            }
        ]
    }
    if (input.fPort === 100) {
        decoder = [
            {
                key: [0x00],
                fn: function (arg) {
                    decoded_data.device_eui = decode_field(arg, 0, 63, "hexstring");
                    return 8;
                }
            },
            {
                key: [0x01],
                fn: function (arg) {
                    decoded_data.app_eui = decode_field(arg, 0, 63, "hexstring");
                    return 8;
                }
            },
            {
                key: [0x02],
                fn: function (arg) {
                    decoded_data.app_key = decode_field(arg, 0, 127, "hexstring");
                    return 16;
                }
            },
            {
                key: [0x03],
                fn: function (arg) {
                    decoded_data.device_address = decode_field(arg, 0, 31, "hexstring");
                    return 4;
                }
            },
            {
                key: [0x04],
                fn: function (arg) {
                    decoded_data.network_session_key = decode_field(arg, 0, 127, "hexstring");
                    return 16;
                }
            },
            {
                key: [0x05],
                fn: function (arg) {
                    decoded_data.app_session_key = decode_field(arg, 0, 127, "hexstring");
                    return 16;
                }
            },
            {
                key: [0x10],
                fn: function (arg) {
                    decoded_data.loramac_join_mode = decode_field(arg, 7, 7, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x11],
                fn: function (arg) {
                    decoded_data['loramac_opts.confirm_mode'] = decode_field(arg, 8, 8, "unsigned");
                    decoded_data['loramac_opts.sync_word'] = decode_field(arg, 9, 9, "unsigned");
                    decoded_data['loramac_opts.duty_cycle'] = decode_field(arg, 10, 10, "unsigned");
                    decoded_data['loramac_opts.adr'] = decode_field(arg, 11, 11, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x12],
                fn: function (arg) {
                    decoded_data['loramac_dr_tx.dr_number'] = decode_field(arg, 0, 3, "unsigned");
                    decoded_data['loramac_dr_tx.tx_power_number'] = decode_field(arg, 8, 11, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x13],
                fn: function (arg) {
                    decoded_data['loramac_rx2.frequency'] = decode_field(arg, 0, 31, "unsigned");
                    decoded_data['loramac_rx2.dr_number'] = decode_field(arg, 32, 39, "unsigned");
                    return 5;
                }
            },
            {
                key: [0x20],
                fn: function (arg) {
                    decoded_data.seconds_per_core_tick = decode_field(arg, 0, 31, "unsigned");
                    return 4;
                }
            },
            {
                key: [0x21],
                fn: function (arg) {
                    decoded_data.tick_per_battery = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x22],
                fn: function (arg) {
                    decoded_data.tick_per_ambient_temperature = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x23],
                fn: function (arg) {
                    decoded_data.tick_per_relative_humidity = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x24],
                fn: function (arg) {
                    decoded_data.tick_per_reed_switch = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x25],
                fn: function (arg) {
                    decoded_data.tick_per_light = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x26],
                fn: function (arg) {
                    decoded_data.tick_per_accelerometer = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x27],
                fn: function (arg) {
                    decoded_data.tick_per_mcu_temperature = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x28],
                fn: function (arg) {
                    decoded_data.tick_per_pir = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x29],
                fn: function (arg) {
                    decoded_data.tick_per_external_connector = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x2A],
                fn: function (arg) {
                    decoded_data['reed_mode.rising_edge_enabled'] = decode_field(arg, 0, 0, "unsigned");
                    decoded_data['reed_mode.falling_edge_enabled'] = decode_field(arg, 1, 1, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x2B],
                fn: function (arg) {
                    decoded_data.reed_switch_count_threshold = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x2C],
                fn: function (arg) {
                    decoded_data['reed_tx.report_state_enabled'] = decode_field(arg, 0, 0, "unsigned");
                    decoded_data['reed_tx.report_count_enabled'] = decode_field(arg, 1, 1, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x2D],
                fn: function (arg) {
                    decoded_data['external_connector.rising_edge_enabled'] = decode_field(arg, 0, 0, "unsigned");
                    decoded_data['external_connector.falling_edge_enabled'] = decode_field(arg, 1, 1, "unsigned");
                    decoded_data['external_connector.mode'] = decode_field(arg, 7, 7, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x2E],
                fn: function (arg) {
                    decoded_data.external_connector_count_threshold = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x2F],
                fn: function (arg) {
                    decoded_data['external_connector_tx.report_state_enabled'] = decode_field(arg, 0, 0, "unsigned");
                    decoded_data['external_connector_tx.report_count_enabled'] = decode_field(arg, 1, 1, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x30],
                fn: function (arg) {
                    decoded_data.impact_event_threshold = decode_field(arg, 0, 15, "unsigned") * 0.001;
                    return 2;
                }
            },
            {
                key: [0x31],
                fn: function (arg) {
                    decoded_data.acceleration_event_threshold = decode_field(arg, 0, 15, "unsigned") * 0.001;
                    return 2;
                }
            },
            {
                key: [0x32],
                fn: function (arg) {
                    decoded_data['accelerometer_tx.report_alarm_enabled'] = decode_field(arg, 0, 0, "unsigned");
                    decoded_data['accelerometer_tx.report_magnitude_enabled'] = decode_field(arg, 4, 4, "unsigned");
                    decoded_data['accelerometer_tx.report_vector_enabled'] = decode_field(arg, 5, 5, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x33],
                fn: function (arg) {
                    decoded_data.acceleration_impact_grace_period = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x34],
                fn: function (arg) {
                    decoded_data['accelerometer.impact_threshold_enabled'] = decode_field(arg, 0, 0, "unsigned");
                    decoded_data['accelerometer.acceleration_threshold_enabled'] = decode_field(arg, 1, 1, "unsigned");
                    decoded_data['accelerometer.xaxis_enabled'] = decode_field(arg, 4, 4, "unsigned");
                    decoded_data['accelerometer.yaxis_enabled'] = decode_field(arg, 5, 5, "unsigned");
                    decoded_data['accelerometer.zaxis_enabled'] = decode_field(arg, 6, 6, "unsigned");
                    decoded_data['accelerometer.poweron'] = decode_field(arg, 7, 7, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x35],
                fn: function (arg) {
                    //}
                    decoded_data['sensitivity.accelerometer_sample_rate'] = decode_field(arg, 0, 2, "unsigned");
                    switch (decoded_data['sensitivity.accelerometer_sample_rate']) {
                        case 1:
                            decoded_data['sensitivity.accelerometer_sample_rate'] = 1;
                            break;
                        case 2:
                            decoded_data['sensitivity.accelerometer_sample_rate'] = 10;
                            break;
                        case 3:
                            decoded_data['sensitivity.accelerometer_sample_rate'] = 25;
                            break;
                        case 4:
                            decoded_data['sensitivity.accelerometer_sample_rate'] = 50;
                            break;
                        case 5:
                            decoded_data['sensitivity.accelerometer_sample_rate'] = 100;
                            break;
                        case 6:
                            decoded_data['sensitivity.accelerometer_sample_rate'] = 200;
                            break;
                        case 7:
                            decoded_data['sensitivity.accelerometer_sample_rate'] = 400;
                            break;
                        default: // invalid value
                            decoded_data['sensitivity.accelerometer_sample_rate'] = 0;
                            break;
                    }

                    decoded_data['sensitivity.accelerometer_measurement_range'] = decode_field(arg, 4, 5, "unsigned");
                    switch (decoded_data['sensitivity.accelerometer_measurement_range']) {
                        case 0:
                            decoded_data['sensitivity.accelerometer_measurement_range'] = 2;
                            break;
                        case 1:
                            decoded_data['sensitivity.accelerometer_measurement_range'] = 4;
                            break;
                        case 2:
                            decoded_data['sensitivity.accelerometer_measurement_range'] = 8;
                            break;
                        case 3:
                            decoded_data['sensitivity.accelerometer_measurement_range'] = 16;
                            break;
                        default:
                            decoded_data['sensitivity.accelerometer_measurement_range'] = 0;
                    }
                    return 1;
                }
            },
            {
                key: [0x36],
                fn: function (arg) {
                    decoded_data.impact_alarm_grace_period = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x37],
                fn: function (arg) {
                    decoded_data.impact_alarm_threshold_count = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x38],
                fn: function (arg) {
                    decoded_data.impact_alarm_threshold_period = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x39],
                fn: function (arg) {
                    decoded_data.temperature_relative_humidity_sample_period_idle = decode_field(arg, 0, 31, "unsigned");
                    return 4;
                }
            },
            {
                key: [0x3A],
                fn: function (arg) {
                    decoded_data.temperature_relative_humidity_sample_period_active = decode_field(arg, 0, 31, "unsigned");
                    return 4;
                }
            },
            {
                key: [0x3B],
                fn: function (arg) {
                    decoded_data['ambient_temperature_threshold.high'] = decode_field(arg, 0, 7, "signed");
                    decoded_data['ambient_temperature_threshold.low'] = decode_field(arg, 8, 15, "signed");
                    return 2;
                }
            },
            {
                key: [0x3C],
                fn: function (arg) {
                    decoded_data.ambient_temperature_threshold_enabled = decode_field(arg, 0, 0, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x3D],
                fn: function (arg) {
                    decoded_data['relative_humidity_threshold.low'] = decode_field(arg, 0, 7, "unsigned");
                    decoded_data['relative_humidity_threshold.high'] = decode_field(arg, 8, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x3E],
                fn: function (arg) {
                    decoded_data.relative_humidity_threshold_enabled = decode_field(arg, 0, 0, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x40],
                fn: function (arg) {
                    decoded_data.mcu_temperature_sample_period_idle = decode_field(arg, 0, 31, "unsigned");
                    return 4;
                }
            },
            {
                key: [0x41],
                fn: function (arg) {
                    decoded_data.mcu_temperature_sample_period_active = decode_field(arg, 0, 31, "unsigned");
                    return 4;
                }
            },
            {
                key: [0x42],
                fn: function (arg) {
                    decoded_data['mcu_temperature_threshold.high'] = decode_field(arg, 0, 7, "signed");
                    decoded_data['mcu_temperature_threshold.low'] = decode_field(arg, 8, 15, "signed");
                    return 2;
                }
            },
            {
                key: [0x43],
                fn: function (arg) {
                    decoded_data.mcu_temperature_threshold_enabled = decode_field(arg, 0, 0, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x44],
                fn: function (arg) {
                    decoded_data.analog_sample_period_idle = decode_field(arg, 0, 31, "unsigned");
                    return 4;
                }
            },
            {
                key: [0x45],
                fn: function (arg) {
                    decoded_data.analog_sample_period_active = decode_field(arg, 0, 31, "unsigned");
                    return 4;
                }
            },
            {
                key: [0x46],
                fn: function (arg) {
                    decoded_data['analog_input_threshold.high'] = decode_field(arg, 0, 15, "unsigned") * 0.001;
                    decoded_data['analog_input_threshold.low'] = decode_field(arg, 16, 31, "unsigned") * 0.001;
                    return 4;
                }
            },
            {
                key: [0x47],
                fn: function (arg) {
                    decoded_data.light_sample_period = decode_field(arg, 0, 31, "unsigned");
                    return 4;
                }
            },
            {
                key: [0x48],
                fn: function (arg) {
                    decoded_data['light.threshold'] = decode_field(arg, 0, 5, "unsigned");
                    decoded_data['light.threshold_enabled'] = decode_field(arg, 7, 7, "unsigned") * 1;
                    return 1;
                }
            },
            {
                key: [0x49],
                fn: function (arg) {
                    decoded_data['light_tx.state_reported'] = decode_field(arg, 0, 0, "unsigned");
                    decoded_data['light_tx.intensity_reported'] = decode_field(arg, 1, 1, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x4A],
                fn: function (arg) {
                    decoded_data.analog_input_threshold_enabled = decode_field(arg, 0, 0, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x50],
                fn: function (arg) {
                    decoded_data.pir_grace_period = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x51],
                fn: function (arg) {
                    decoded_data.pir_threshold = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x52],
                fn: function (arg) {
                    decoded_data.pir_threshold_period = decode_field(arg, 0, 15, "unsigned");
                    return 2;
                }
            },
            {
                key: [0x53],
                fn: function (arg) {
                    decoded_data['pir_mode.motion_count_reported'] = decode_field(arg, 0, 0, "unsigned");
                    decoded_data['pir_mode.motion_state_reported'] = decode_field(arg, 1, 1, "unsigned");
                    decoded_data['pir_mode.event_transmission_enabled'] = decode_field(arg, 6, 6, "unsigned");
                    decoded_data['pir_mode.transducer_enabled'] = decode_field(arg, 7, 7, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x5A],
                fn: function (arg) {
                    //}
                    decoded_data.moisture_sample_period = decode_field(arg, 0, 2, "unsigned");
                    switch (decoded_data.moisture_sample_period) {
                        case 1:
                            decoded_data.moisture_sample_period = 16;
                            break;
                        case 2:
                            decoded_data.moisture_sample_period = 32;
                            break;
                        case 3:
                            decoded_data.moisture_sample_period = 64;
                            break;
                        case 4:
                            decoded_data.moisture_sample_period = 128;
                            break;
                        default:
                            decoded_data.moisture_sample_period = 0;
                    }
                    return 1;
                }
            },
            {
                key: [0x5B],
                fn: function (arg) {
                    decoded_data.moisture_threshold = decode_field(arg, 0, 7, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x5C],
                fn: function (arg) {
                    decoded_data.moisture_sensing_enabled = decode_field(arg, 0, 0, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x5D],
                fn: function (arg) {
                    decoded_data.moisture_caliberation_dry = decode_field(arg, 0, 7, "unsigned");
                    return 1;
                }
            },
            {
                key: [0x71],
                fn: function (arg) {
                    decoded_data['firmware_version.app_major_version'] = decode_field(arg, 0, 7, "unsigned");
                    decoded_data['firmware_version.app_minor_version'] = decode_field(arg, 8, 15, "unsigned");
                    decoded_data['firmware_version.app_revision'] = decode_field(arg, 16, 23, "unsigned");
                    decoded_data['firmware_version.loramac_major_version'] = decode_field(arg, 24, 31, "unsigned");
                    decoded_data['firmware_version.loramac_minor_version'] = decode_field(arg, 32, 39, "unsigned");
                    decoded_data['firmware_version.loramac_revision'] = decode_field(arg, 40, 47, "unsigned");
                    decoded_data['firmware_version.region'] = decode_field(arg, 48, 55, "unsigned");
                    return 7;
                }
            }
        ]
    }

    var bytes = input.bytes;

    for (var bytes_left = bytes.length; bytes_left > 0;) {
        var found = false;
        for (var i = 0; i < decoder.length; i++) {
            var item = decoder[i];
            var key = item.key;
            var keylen = key.length;
            header = slice(bytes, 0, keylen);
            // Header in the data matches to what we expect
            if (is_equal(header, key)) {
                var f = item.fn;
                consumed = f(slice(bytes, keylen, bytes.length)) + keylen;
                bytes_left -= consumed;
                bytes = slice(bytes, consumed, bytes.length);
                found = true;
                break;
            }
        }
        if (found) {
            continue;
        }
        // Unable to decode -- headers are not as expected
        return {
          errors: [
            "Headers are not as expected"
          ]
        }
    }

    // Converts value to unsigned
    function to_uint(x) {
        return x >>> 0;
    }

    // Checks if two arrays are equal
    function is_equal(arr1, arr2) {
        if (arr1.length != arr2.length) {
            return false;
        }
        for (var i = 0; i != arr1.length; i++) {
            if (arr1[i] != arr2[i]) {
                return false;
            }
        }
        return true;
    }

    function toHexString(byteArray) {
        var arr = [];
        for (var i = 0; i < byteArray.length; ++i) {
            arr.push(('0' + (byteArray[i] & 0xFF).toString(16)).slice(-2));
        }
        return arr.join('');
    }

    return {
      data: decoded_data
    };
}

function normalizeUplink(input) {
    var data = {};
    var air = {};
  	var action = {};
    var motion = {};

    if (input.data.ambient_temperature) {
      air.temperature = input.data.ambient_temperature;
    }

    if (input.data.relative_humidity) {
      air.relativeHumidity = input.data.relative_humidity;
    }

    if (input.data.light_detected) {
      air.lightIntensity = input.data.light_detected;
    }

    if (input.data.motion_event_state) {
      motion.detected = input.data.motion_event_state > 0;
      action.motion = motion;
    }

    if (input.data.motion_event_count) {
      motion.count = input.data.motion_event_count;
      action.motion = motion;
    }

    if (input.data.reed_state) {
      action.contactState = input.data.reed_state;
    }
  
    if (Object.keys(air).length > 0) {
      data.air = air;
    }
    
    if (Object.keys(action).length > 0) {
      data.action = action;
    }
  
    if (input.data.battery_voltage) {
      data.battery = input.data.battery_voltage;
    }
  
    return { data: data };
  }

	if (typeof decodeUplink === 'function') {
		__ogtb_decode_uplink = decodeUplink;
	} else if (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function') {
		__ogtb_decode_uplink = codec.decodeUplink;
	}
})();

// ─── Source encoder (TTN downlinkEncoder : encoder_smart_room_sensor_pir_base.js) ─────────
(function () {
function encodeDownlink(input) {
    var ret = [];
    port = 100;

    check_encode("device_eui",
        function (value) {
        },
        function () {
            ret = ret.concat(ret, [0x00])
        }
    );
    check_encode("app_eui",
        function (value) {
        },
        function () {
            ret = ret.concat(ret, [0x01])
        }
    );
    check_encode("app_key",
        function (value) {
        },
        function () {
            ret = ret.concat(ret, [0x02])
        }
    );
    check_encode("device_address",
        function (value) {
        },
        function () {
            ret = ret.concat(ret, [0x03])
        }
    );
    check_encode("network_session_key",
        function (value) {
        },
        function () {
            ret = ret.concat(ret, [0x04])
        }
    );
    check_encode("app_session_key",
        function (value) {
        },
        function () {
            ret = ret.concat(ret, [0x05])
        }
    );
    check_encode("lorawan_join_mode",
        function (value) {
            var converted = [0x10 | 0x80,
                ((value & 0x1) << 7), 0x00];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x10])
        }
    );
    check_encode("loramac_opts",
        function (value) {
            var converted = [0x11 | 0x80, 0x00,
                ((value.loramac_confirm_mode & 0x1) << 0) |
                ((value.loramac_sync_word & 0x1) << 1) |
                ((value.loramac_duty_cycle & 0x1) << 2) |
                ((value.loramac_adr & 0x1) << 3)];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x11])
        }
    );
    check_encode("loramac_dr_tx",
        function (value) {
            var converted = [0x12 | 0x80,
                ((value.dr_number & 0xf) << 0),
                ((value.tx_power_number & 0xf) << 0)];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x12])
        }
    );
    check_encode("loramac_rx2",
        function (value) {
            var converted = [0x13 | 0x80,
                (value.frequency >> 24) & 0xff, (value.frequency >> 16) & 0xff, (value.frequency >> 8) & 0xff, value.frequency & 0xff,
                value.dr_number & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x13])
        }
    );
    check_encode("seconds_per_core_tick",
        function (value) {
            var converted = [0x20 | 0x80,
                (value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x20])
        }
    );
    check_encode("tick_per_battery",
        function (value) {
            var converted = [0x21 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x21])
        }
    );
    check_encode("tick_per_ambient_temperature",
        function (value) {
            var converted = [0x22 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x22])
        }
    );
    check_encode("tick_per_relative_humidity",
        function (value) {
            var converted = [0x23 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x23])
        }
    );
    check_encode("tick_per_reed_switch",
        function (value) {
            var converted = [0x24 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x24])
        }
    );
    check_encode("tick_per_light",
        function (value) {
            var converted = [0x25 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x25])
        }
    );
    check_encode("tick_per_accelerometer",
        function (value) {
            var converted = [0x26 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x26])
        }
    );
    check_encode("tick_per_mcu_temperature",
        function (value) {
            var converted = [0x27 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x27])
        }
    );
    check_encode("tick_per_pir",
        function (value) {
            var converted = [0x28 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x28])
        }
    );
    check_encode("tick_per_external_connector",
        function (value) {
            var converted = [0x29 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x29])
        }
    );
    check_encode("reed_mode",
        function (value) {
            var converted = [0x2A | 0x80,
                ((value.rising_edge_enabled & 0x1) << 0) |
                ((value.falling_edge_enabled & 0x1) << 1)];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x2A])
        }
    );
    check_encode("reed_switch_count_threshold",
        function (value) {
            var converted = [0x2B | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x2B])
        }
    );
    check_encode("reed_tx",
        function (value) {
            var converted = [0x2C | 0x80,
                ((value.report_state_enabled & 0x1) << 0) |
                ((value.report_count_enabled & 0x1) << 1)];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x2C])
        }
    );
    check_encode("external_connector",
        function (value) {
            var converted = [0x2D | 0x80,
                ((value.rising_edge_enabled & 0x1) << 0) |
                ((value.falling_edge_enabled & 0x1) << 1) |
                ((value.mode & 0x1) << 7)];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x2D])
        }
    );
    check_encode("external_connector_count_threshold",
        function (value) {
            var converted = [0x2E | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x2E])
        }
    );
    check_encode("external_connector_tx",
        function (value) {
            var converted = [0x2F | 0x80,
                ((value.report_state_enabled & 0x1) << 0) |
                ((value.report_count_enabled & 0x1) << 1)];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x2F])
        }
    );
    check_encode("impact_event_threshold",
        function (value) {
            var converted = [0x30 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x30])
        }
    );
    check_encode("acceleration_event_threshold",
        function (value) {
            var converted = [0x31 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x31])
        }
    );
    check_encode("accelerometer_tx",
        function (value) {
            var converted = [0x32 | 0x80,
                ((value.report_alarm_enabled & 0x1) << 0) |
                ((value.report_magnitude_enabled & 0x1) << 4) |
                ((value.report_vector_enabled & 0x1) << 5)];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x32])
        }
    );
    check_encode("acceleration_impact_grace_period",
        function (value) {
            var converted = [0x33 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x33])
        }
    );
    check_encode("accelerometer",
        function (value) {
            var converted = [0x34 | 0x80,
                ((value.impact_threshold_enabled & 0x1) << 0) |
                ((value.acceleration_threshold_enabled & 0x1) << 1) |
                ((value.xaxis_enabled & 0x1) << 4) |
                ((value.yaxis_enabled & 0x1) << 5) |
                ((value.zaxis_enabled & 0x1) << 6) |
                ((value.poweron & 0x1) << 7)];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x34])
        }
    );
    check_encode("sensitivity",
        function (value) {
            var converted = [0x35 | 0x80,
                ((value.accelerometer_sample_rate & 0x7) << 0) |
                ((value.accelerometer_measurement_range & 0x3) << 4)];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x35])
        }
    );
    check_encode("impact_alarm_grace_period",
        function (value) {
            var converted = [0x36 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x36])
        }
    );
    check_encode("impact_alarm_threshold_count",
        function (value) {
            var converted = [0x37 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x37])
        }
    );
    check_encode("impact_alarm_threshold_period",
        function (value) {
            var converted = [0x38 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x38])
        }
    );
    check_encode("temperature_relative_humidity_sample_period_idle",
        function (value) {
            var converted = [0x39 | 0x80,
                (value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x39])
        }
    );
    check_encode("temperature_relative_humidity_sample_period_active",
        function (value) {
            var converted = [0x3A | 0x80,
                (value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x3A])
        }
    );
    check_encode("ambient_temperature_threshold",
        function (value) {
            var converted = [0x3B | 0x80,
                value.high & 0xff,
                value.low & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x3B])
        }
    );
    check_encode("ambient_temperature_threshold_enabled",
        function (value) {
            var converted = [0x3C | 0x80,
                value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x3C])
        }
    );
    check_encode("relative_humidity_threshold",
        function (value) {
            var converted = [0x3D | 0x80,
                value.high & 0xff,
                value.low & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x3D])
        }
    );
    check_encode("relative_humidity_threshold_enabled",
        function (value) {
            var converted = [0x3E | 0x80,
                value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x3E])
        }
    );
    check_encode("mcu_temperature_sample_period_idle",
        function (value) {
            var converted = [0x40 | 0x80,
                (value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x40])
        }
    );
    check_encode("mcu_temperature_sample_period_active",
        function (value) {
            var converted = [0x41 | 0x80,
                (value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x41])
        }
    );
    check_encode("mcu_temperature_threshold",
        function (value) {
            var converted = [0x42 | 0x80,
                value.high & 0xff,
                value.low & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x42])
        }
    );
    check_encode("mcu_temperature_threshold_enabled",
        function (value) {
            var converted = [0x43 | 0x80,
                value & 0x1];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x43])
        }
    );
    check_encode("analog_sample_period_idle",
        function (value) {
            var converted = [0x44 | 0x80,
                (value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x44])
        }
    );
    check_encode("analog_sample_period_active",
        function (value) {
            var converted = [0x45 | 0x80,
                (value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x45])
        }
    );
    check_encode("analog_input_threshold",
        function (value) {
            var converted = [0x46 | 0x80,
                (value.high >> 16) & 0xff,
                (value.high) & 0xff,
                (value.low >> 16) & 0xff,
                (value.low) & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x46])
        }
    );
    check_encode("light_sample_period",
        function (value) {
            var converted = [0x47 | 0x80,
                (value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x47])
        }
    );
    check_encode("light",
        function (value) {
            var converted = [0x48 | 0x80,
                (value.threshold & 0x3f) |
                (value.threshold_enabled & 0x1) << 7];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x48])
        }
    );
    check_encode("light_tx",
        function (value) {
            var converted = [0x49 | 0x80,
                (value.state_reported & 0x1) |
                (value.intensity_reported & 0x1) << 1];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x49])
        }
    );
    check_encode("analog_input_threshold_enabled",
        function (value) {
            var converted = [0x4A | 0x80,
                value.analog_input_threshold_enabled & 0x1];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x4A])
        }
    );
    check_encode("pir_grace_period",
        function (value) {
            var converted = [0x50 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x50])
        }
    );
    check_encode("pir_threshold",
        function (value) {
            var converted = [0x51 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x51])
        }
    );
    check_encode("pir_threshold_period",
        function (value) {
            var converted = [0x52 | 0x80,
                (value >> 8) & 0xff, value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x52])
        }
    );
    check_encode("pir_mode",
        function (value) {
            var converted = [0x53 | 0x80,
                ((value.motion_count_reported & 0x1) << 0) |
                ((value.motion_state_reported & 0x1) << 1) |
                ((value.event_transmission_enabled & 0x1) << 6) |
                ((value.transducer_enabled & 0x1) << 7)];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x53])
        }
    );
    check_encode("moisture_sample_period",
        function (value) {
            var converted = [0x5A | 0x80,
                value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x5A])
        }
    );
    check_encode("moisture_threshold",
        function (value) {
            var converted = [0x5B | 0x80,
                value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x5B])
        }
    );
    check_encode("moisture_sensing_enabled",
        function (value) {
            var converted = [0x5C | 0x80,
                value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x5C])
        }
    );
    check_encode("moisture_caliberation_dry",
        function (value) {
            var converted = [0x5D | 0x80,
                value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x5D])
        }
    );
    check_encode("write_to_flash",
        function (value) {
            var converted = [0x70 | 0x80,
                ((value.app_configuration & 0x1) << 5) |
                ((value.lora_configuration & 0x1) << 6),
                ((value.restart_sensor & 0x1) << 0)];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x70])
        }
    );
    check_encode("firmware_version",
        function (value) {
        },
        function () {
            ret = ret.concat(ret, [0x71])
        }
    );
    check_encode("configuration_factory_reset",
        function (value) {
            var converted = [0x72 | 0x80,
                value & 0xff];
            ret = ret.concat(converted);
        },
        function () {
            ret = ret.concat([0x72])
        }
    );
    check_encode("payload",
        function (value) {
            var converted = base64ToArray(value);
            ret = ret.concat(converted);
        },
        function () {
        }
    );
    function check_encode(prop_name, do_write, do_read) {
        if (input.data.hasOwnProperty(prop_name)) {
            var obj = input.data[prop_name];
            if (obj.hasOwnProperty("access")) {
                var access_value = obj.access;
                if (access_value == "write") {
                    do_write(obj.value);
                } else if (access_value == "read") {
                    do_read();
                }
            } else if (obj.hasOwnProperty("value")) {
                do_write(obj.value);
            }
        }
    }

    function atob(input) {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var str = String(input).replace(/[=]+$/, ''); // #31: ExtendScript bad parse of /=
        if (str.length % 4 === 1) {
            throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded.");
        }
        for (
            var bc = 0, bs, buffer, idx = 0, output = '';
            buffer = str.charAt(idx++);
            ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
        ) {
            buffer = chars.indexOf(buffer);
        }
        return output;
    }

    function base64ToArray(base64) {
        var binary_string = atob(base64);
        var len = binary_string.length;
        var result = [];
        for (var i = 0; i < len; i++) {
            result.push(binary_string.charCodeAt(i));
        }
        return result;
    }

    return {
        bytes: ret,
        fPort: port
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
