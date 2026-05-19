// ─────────────────────────────────────────────────────────────────────
// Codec LoRaWAN — TheThingsStack (TTN v3)
// ─────────────────────────────────────────────────────────────────────
// Vendor       : Tektelic Communications Inc.
// Device       : SEAL Wearable Safety & GPS Tracker
// fPort(s)     : 10
// Fonctions    : decodeUplink + encodeDownlink
// Source       : TheThingsNetwork/lorawan-devices @ 26f5522b7eb8
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/tektelic/decoder_seal.js
//                https://github.com/TheThingsNetwork/lorawan-devices/blob/26f5522b7eb894f139c68971b9183413aa2b2bea/vendor/tektelic/encoder_seal.js
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
function decodeUplink(input){
    var sensor = {
    "10": {
        "0x00 0xD3": [
            {
              "data_size": "1",
              "bit_start": "7",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "battery_lifetime_pct",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "1",
              "multiple": "0",
              "addition": ""
            }
        ],
          "0x00 0xBD": [
            {
              "data_size": "2",
              "bit_start": "15",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "battery_lifetime_dys",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "1",
              "multiple": "0",
              "addition": ""
            }
        ],
          "0x00 0x85": [
            {
              "data_size": "4",
              "bit_start": "31",
              "bit_end": "26",
              "type": "unsigned",
              "parameter_name": "year_utc",
              "group_name": "utc",
              "category_name": "",
              "round": "",
              "coefficient": "1",
              "multiple": "0",
              "addition": ""
            },
            {
              "data_size": "4",
              "bit_start": "25",
              "bit_end": "22",
              "type": "unsigned",
              "parameter_name": "month_utc",
              "group_name": "utc",
              "category_name": "",
              "round": "",
              "coefficient": "1",
              "multiple": "0",
              "addition": ""
            },
            {
              "data_size": "4",
              "bit_start": "21",
              "bit_end": "17",
              "type": "unsigned",
              "parameter_name": "day_utc",
              "group_name": "utc",
              "category_name": "",
              "round": "",
              "coefficient": "1",
              "multiple": "0",
              "addition": ""
            },
            {
              "data_size": "4",
              "bit_start": "16",
              "bit_end": "12",
              "type": "unsigned",
              "parameter_name": "hour_utc",
              "group_name": "utc",
              "category_name": "",
              "round": "",
              "coefficient": "1",
              "multiple": "0",
              "addition": ""
            },
            {
              "data_size": "4",
              "bit_start": "11",
              "bit_end": "6",
              "type": "unsigned",
              "parameter_name": "minute_utc",
              "group_name": "utc",
              "category_name": "",
              "round": "",
              "coefficient": "1",
              "multiple": "0",
              "addition": ""
            },
            {
              "data_size": "4",
              "bit_start": "5",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "second_utc",
              "group_name": "utc",
              "category_name": "",
              "round": "",
              "coefficient": "1",
              "multiple": "0",
              "addition": ""
            }
        ],
        "0x00 0x88": [
            {
            "data_size": "8",
            "bit_start": "63",
            "bit_end": "40",
            "type": "signed",
            "parameter_name": "latitude",
            "group_name": "coordinates",
            "category_name": "",
            "round": "7",
            "coefficient": "1.07E-05",
            "multiple": "0",
            "addition": ""
            },
            {
            "data_size": "8",
            "bit_start": "39",
            "bit_end": "16",
            "type": "signed",
            "parameter_name": "longitude",
            "group_name": "coordinates",
            "category_name": "",
            "round": "7",
            "coefficient": "2.15E-05",
            "multiple": "0",
            "addition": ""
            },
            {
            "data_size": "8",
            "bit_start": "15",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "altitude",
            "group_name": "coordinates",
            "category_name": "",
            "round": "2",
            "coefficient": "0.144958496",
            "multiple": "0",
            "addition": "-500"
            }
        ],
        "0x00 0x92": [
            {
            "data_size": "1",
            "bit_start": "7",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "ground_speed",
            "group_name": "",
            "category_name": "",
            "round": "3",
            "coefficient": "0.27778",
            "multiple": "0",
            "addition": ""
            }
        ],
        "0x00 0x00": [
            {
            "data_size": "1",
            "bit_start": "7",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "gnss_fix",
            "group_name": "",
            "category_name": "",
            "round": "",
            "coefficient": "1",
            "multiple": "0",
            "addition": ""
            }
        ],
        "0x00 0x95": [
            {
            "data_size": "1",
            "bit_start": "1",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "gnss_status_dz0",
            "group_name": "gnss_status",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "0",
            "addition": ""
            },
            {
            "data_size": "1",
            "bit_start": "3",
            "bit_end": "2",
            "type": "unsigned",
            "parameter_name": "gnss_status_dz1",
            "group_name": "gnss_status",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "0",
            "addition": ""
            },
            {
            "data_size": "1",
            "bit_start": "5",
            "bit_end": "4",
            "type": "unsigned",
            "parameter_name": "gnss_status_dz2",
            "group_name": "gnss_status",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "0",
            "addition": ""
            },
            {
            "data_size": "1",
            "bit_start": "7",
            "bit_end": "6",
            "type": "unsigned",
            "parameter_name": "gnss_status_dz3",
            "group_name": "gnss_status",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "0",
            "addition": ""
            }
        ],
        "0x01 0x95": [
        {
            "data_size": "1",
            "bit_start": "1",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "ble_status_dz0",
            "group_name": "ble_status",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "0",
            "addition": ""
            },
            {
            "data_size": "1",
            "bit_start": "3",
            "bit_end": "2",
            "type": "unsigned",
            "parameter_name": "ble_status_dz1",
            "group_name": "ble_status",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "0",
            "addition": ""
            },
            {
            "data_size": "1",
            "bit_start": "5",
            "bit_end": "4",
            "type": "unsigned",
            "parameter_name": "ble_status_dz2",
            "group_name": "ble_status",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "0",
            "addition": ""
            },
            {
            "data_size": "1",
            "bit_start": "7",
            "bit_end": "6",
            "type": "unsigned",
            "parameter_name": "ble_status_dz3",
            "group_name": "ble_status",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "0",
            "addition": ""
        }
        ],
        "0x00 0x73": [
            {
            "data_size": "2",
            "bit_start": "15",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "barometric_pressure",
            "group_name": "",
            "category_name": "",
            "round": "1",
            "coefficient": "",
            "multiple": "0.1",
            "addition": ""
            }
        ],
        "0x00 0x74": [
            {
            "data_size": "2",
            "bit_start": "15",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "cal_barometric_pressure",
            "group_name": "",
            "category_name": "",
            "round": "1",
            "coefficient": "",
            "multiple": "0.1",
            "addition": ""
            }
        ],
        "0x00 0x71": [
            {
            "data_size": "6",
            "bit_start": "47",
            "bit_end": "32",
            "type": "signed",
            "parameter_name": "acceleration_x",
            "group_name": "acceleration_vector",
            "category_name": "",
            "round": "3",
            "coefficient": "",
            "multiple": "0.001",
            "addition": ""
            },
            {
            "data_size": "6",
            "bit_start": "31",
            "bit_end": "16",
            "type": "signed",
            "parameter_name": "acceleration_y",
            "group_name": "acceleration_vector",
            "category_name": "",
            "round": "3",
            "coefficient": "",
            "multiple": "0.001",
            "addition": ""
            },
            {
            "data_size": "6",
            "bit_start": "15",
            "bit_end": "0",
            "type": "signed",
            "parameter_name": "acceleration_z",
            "group_name": "acceleration_vector",
            "category_name": "",
            "round": "3",
            "coefficient": "",
            "multiple": "0.001",
            "addition": ""
            }
        ],
        "0x00 0x67": [
            {
            "data_size": "2",
            "bit_start": "15",
            "bit_end": "0",
            "type": "signed",
            "parameter_name": "temperature",
            "group_name": "",
            "category_name": "",
            "round": "1",
            "coefficient": "",
            "multiple": "0.1",
            "addition": ""
            }
        ],
        "0x02 0x95": [
            {
            "data_size": "1",
            "bit_start": "0",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "safety_status_eb",
            "group_name": "safety_status",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            },
            {
            "data_size": "1",
            "bit_start": "1",
            "bit_end": "1",
            "type": "unsigned",
            "parameter_name": "safety_status_fall",
            "group_name": "safety_status",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            },
            {
            "data_size": "1",
            "bit_start": "2",
            "bit_end": "2",
            "type": "unsigned",
            "parameter_name": "safety_status_sh",
            "group_name": "safety_status",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            },
            {
            "data_size": "1",
            "bit_start": "3",
            "bit_end": "3",
            "type": "unsigned",
            "parameter_name": "safety_status_ear",
            "group_name": "safety_status",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            },
            {
            "data_size": "1",
            "bit_start": "4",
            "bit_end": "4",
            "type": "unsigned",
            "parameter_name": "safety_status_pressure",
            "group_name": "safety_status",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            }
        ]
    },
    "25": {
        "0x0A": [
          {
            "data_size": "7",
            "bit_start": "0",
            "bit_end": "55",
            "type": "hexstring",
            "parameter_name": "id_01",
            "group_name": "ble_1",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
          },
          {
            "data_size": "7",
            "bit_start": "56",
            "bit_end": "63",
            "type": "signed",
            "parameter_name": "rssi_01",
            "group_name": "ble_1",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
          }
        ],
        "0xB0": [
          {
            "data_size": "7",
            "bit_start": "0",
            "bit_end": "55",
            "type": "hexstring",
            "parameter_name": "id_02",
            "group_name": "ble_2",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": "",
          },
          {
            "data_size": "7",
            "bit_start": "56",
            "bit_end": "63",
            "type": "signed",
            "parameter_name": "rssi_02",
            "group_name": "ble_2",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
          }
        ],
        "0xB1": [
          {
            "data_size": "7",
            "bit_start": "0",
            "bit_end": "55",
            "type": "hexstring",
            "parameter_name": "id_03",
            "group_name": "ble_3",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
          },
          {
            "data_size": "7",
            "bit_start": "56",
            "bit_end": "63",
            "type": "signed",
            "parameter_name": "rssi_03",
            "group_name": "ble_3",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": "",
            "enum": {}
          }
        ],
        "0xB2": [
          {
            "data_size": "7",
            "bit_start": "0",
            "bit_end": "55",
            "type": "hexstring",
            "parameter_name": "id_04",
            "group_name": "ble_4",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
          },
          {
            "data_size": "7",
            "bit_start": "56",
            "bit_end": "63",
            "type": "signed",
            "parameter_name": "rssi_04",
            "group_name": "ble_4",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
          }
        ],
        "0xB3": [
          {
            "data_size": "7",
            "bit_start": "0",
            "bit_end": "55",
            "type": "hexstring",
            "parameter_name": "id_05",
            "group_name": "ble_5",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": "",
          },
          {
            "data_size": "7",
            "bit_start": "56",
            "bit_end": "63",
            "type": "signed",
            "parameter_name": "rssi_05",
            "group_name": "ble_5",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": "",
          }
        ]
    },
    "100": {
        "0x10": [
            {
            "data_size": "2",
            "bit_start": "15",
            "bit_end": "15",
            "type": "unsigned",
            "parameter_name": "join_mode",
            "group_name": "",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            }
        ],
        "0x11": [
            {
            "data_size": "2",
            "bit_start": "3",
            "bit_end": "3",
            "type": "unsigned",
            "parameter_name": "loramac_adr",
            "group_name": "loramac_opts",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            },
            {
            "data_size": "2",
            "bit_start": "2",
            "bit_end": "2",
            "type": "unsigned",
            "parameter_name": "loramac_duty_cycle",
            "group_name": "loramac_opts",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            },
            {
            "data_size": "2",
            "bit_start": "1",
            "bit_end": "1",
            "type": "unsigned",
            "parameter_name": "loramac_ul_type",
            "group_name": "loramac_opts",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            },
            {
            "data_size": "2",
            "bit_start": "0",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "loramac_confirmed",
            "group_name": "loramac_opts",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            }
        ],
        "0x12": [
            {
            "data_size": "2",
            "bit_start": "11",
            "bit_end": "8",
            "type": "unsigned",
            "parameter_name": "loramac_default_dr",
            "group_name": "loramac_dr_tx",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            },
            {
            "data_size": "2",
            "bit_start": "3",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "loramac_default_tx_pwr",
            "group_name": "loramac_dr_tx",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            }
        ],
        "0x13": [
            {
            "data_size": "5",
            "bit_start": "39",
            "bit_end": "8",
            "type": "unsigned",
            "parameter_name": "loramac_rx2_freq",
            "group_name": "loramac_rx2",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            },
            {
            "data_size": "5",
            "bit_start": "7",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "loramac_rx2_dr",
            "group_name": "loramac_rx2",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            }
        ],
        "0x20": [
            {
            "data_size": "4",
            "bit_start": "31",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "seconds_per_core_tick",
            "group_name": "",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            }
        ],
        "0x21": [
            {
            "data_size": "2",
            "bit_start": "15",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "ticks_battery",
            "group_name": "",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            }
        ],
        "0x22": [
            {
            "data_size": "2",
            "bit_start": "15",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "ticks_normal_state",
            "group_name": "",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            }
        ],
        "0x23": [
            {
            "data_size": "2",
            "bit_start": "15",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "ticks_emergency_state",
            "group_name": "",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            }
        ],
        "0x24": [
            {
            "data_size": "2",
            "bit_start": "15",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "ticks_accelerometer",
            "group_name": "",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            }
        ],
        "0x25": [
            {
            "data_size": "2",
            "bit_start": "15",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "ticks_temperature",
            "group_name": "",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            }
        ],
        "0x26": [
            {
            "data_size": "2",
            "bit_start": "15",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "ticks_safety_status_normal",
            "group_name": "",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            }
        ],
        "0x27": [
            {
            "data_size": "2",
            "bit_start": "15",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "ticks_pressure",
            "group_name": "",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            }
        ],
        "0x28": [
            {
            "data_size": "3",
            "bit_start": "23",
            "bit_end": "16",
            "type": "unsigned",
            "parameter_name": "eb_buzz_active_on_time",
            "group_name": "eb_active_buzz_config",
            "category_name": "",
            "round": "",
            "coefficient": "0.1",
            "multiple": "",
            "addition": ""
            },
            {
            "data_size": "3",
            "bit_start": "15",
            "bit_end": "8",
            "type": "unsigned",
            "parameter_name": "eb_buzz_active_off_time",
            "group_name": "eb_active_buzz_config",
            "category_name": "",
            "round": "",
            "coefficient": "0.1",
            "multiple": "",
            "addition": ""
            },
            {
            "data_size": "3",
            "bit_start": "7",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "eb_buzz_active_num_on_offs",
            "group_name": "eb_active_buzz_config",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            }
        ],
        "0x29": [
            {
            "data_size": "3",
            "bit_start": "23",
            "bit_end": "16",
            "type": "unsigned",
            "parameter_name": "eb_buzz_inactive_on_time",
            "group_name": "eb_inactive_buzz_config",
            "category_name": "",
            "round": "",
            "coefficient": "0.1",
            "multiple": "",
            "addition": ""
            },
            {
            "data_size": "3",
            "bit_start": "15",
            "bit_end": "8",
            "type": "unsigned",
            "parameter_name": "eb_buzz_inactive_off_time",
            "group_name": "eb_inactive_buzz_config",
            "category_name": "",
            "round": "",
            "coefficient": "0.1",
            "multiple": "",
            "addition": ""
            },
            {
            "data_size": "3",
            "bit_start": "7",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "eb_buzz_inactive_num_on_offs",
            "group_name": "eb_inactive_buzz_config",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
            }
        ],
        "0x2C": [
            {
              "data_size": "1",
              "bit_start": "7",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "sh_debounce_interval",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x2D": [
            {
              "data_size": "5",
              "bit_start": "33",
              "bit_end": "32",
              "type": "hexstring",
              "parameter_name": "sh_buzz_when_to",
              "group_name": "sh_buzz_config",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "31",
              "bit_end": "24",
              "type": "unsigned",
              "parameter_name": "sh_buzz_on_time",
              "group_name": "sh_buzz_config",
              "category_name": "",
              "round": "",
              "coefficient": "0.1",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "23",
              "bit_end": "16",
              "type": "unsigned",
              "parameter_name": "sh_buzz_off_time",
              "group_name": "sh_buzz_config",
              "category_name": "",
              "round": "",
              "coefficient": "0.1",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "15",
              "bit_end": "8",
              "type": "unsigned",
              "parameter_name": "sh_buzz_num_on_offs",
              "group_name": "sh_buzz_config",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "7",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "sh_buzz_period",
              "group_name": "sh_buzz_config",
              "category_name": "",
              "round": "",
              "coefficient": "0.1",
              "multiple": "",
              "addition": "",
            }
          ],
          "0x30": [
            {
              "data_size": "1",
              "bit_start": "7",
              "bit_end": "7",
              "type": "unsigned",
              "parameter_name": "gnss_receiver",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x31": [
            {
              "data_size": "1",
              "bit_start": "2",
              "bit_end": "2",
              "type": "unsigned",
              "parameter_name": "gnss_dz_status_report",
              "group_name": "gnss_report_options",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "1",
              "bit_start": "1",
              "bit_end": "1",
              "type": "unsigned",
              "parameter_name": "gnss_ground_speed_report",
              "group_name": "gnss_report_options",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "1",
              "bit_start": "0",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "gnss_utc_coordinates_report",
              "group_name": "gnss_report_options",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x32": [
            {
              "data_size": "8",
              "bit_start": "63",
              "bit_end": "40",
              "type": "signed",
              "parameter_name": "gnss_dz_latitude",
              "group_name": "gnss_dz0",
              "category_name": "",
              "round": "",
              "coefficient": "1.07E-05",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "8",
              "bit_start": "39",
              "bit_end": "16",
              "type": "signed",
              "parameter_name": "gnss_dz_longitude",
              "group_name": "gnss_dz0",
              "category_name": "",
              "round": "",
              "coefficient": "2.15E-05",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "8",
              "bit_start": "15",
              "bit_end": "0",
              "type": "signed",
              "parameter_name": "gnss_dz_radius",
              "group_name": "gnss_dz0",
              "category_name": "",
              "round": "",
              "coefficient": "10",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x33": [
            {
              "data_size": "8",
              "bit_start": "63",
              "bit_end": "40",
              "type": "signed",
              "parameter_name": "gnss_dz_latitude",
              "group_name": "gnss_dz1",
              "category_name": "",
              "round": "",
              "coefficient": "1.07E-05",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "8",
              "bit_start": "39",
              "bit_end": "16",
              "type": "signed",
              "parameter_name": "gnss_dz_longitude",
              "group_name": "gnss_dz1",
              "category_name": "",
              "round": "",
              "coefficient": "2.15E-05",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "8",
              "bit_start": "15",
              "bit_end": "0",
              "type": "signed",
              "parameter_name": "gnss_dz_radius",
              "group_name": "gnss_dz1",
              "category_name": "",
              "round": "",
              "coefficient": "10",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x34": [
            {
              "data_size": "8",
              "bit_start": "63",
              "bit_end": "40",
              "type": "signed",
              "parameter_name": "gnss_dz_latitude",
              "group_name": "gnss_dz2",
              "category_name": "",
              "round": "",
              "coefficient": "1.07E-05",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "8",
              "bit_start": "39",
              "bit_end": "16",
              "type": "signed",
              "parameter_name": "gnss_dz_longitude",
              "group_name": "gnss_dz2",
              "category_name": "",
              "round": "",
              "coefficient": "2.15E-05",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "8",
              "bit_start": "15",
              "bit_end": "0",
              "type": "signed",
              "parameter_name": "gnss_dz_radius",
              "group_name": "gnss_dz2",
              "category_name": "",
              "round": "",
              "coefficient": "10",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x35": [
            {
              "data_size": "8",
              "bit_start": "63",
              "bit_end": "40",
              "type": "signed",
              "parameter_name": "gnss_dz_latitude",
              "group_name": "gnss_dz3",
              "category_name": "",
              "round": "",
              "coefficient": "1.07E-05",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "8",
              "bit_start": "39",
              "bit_end": "16",
              "type": "signed",
              "parameter_name": "gnss_dz_longitude",
              "group_name": "gnss_dz3",
              "category_name": "",
              "round": "",
              "coefficient": "2.15E-05",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "8",
              "bit_start": "15",
              "bit_end": "0",
              "type": "signed",
              "parameter_name": "gnss_dz_radius",
              "group_name": "gnss_dz3",
              "category_name": "",
              "round": "",
              "coefficient": "10",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x3B": [
            {
              "data_size": "1",
              "bit_start": "5",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "seconds_pressure_sample",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x3C": [
            {
              "data_size": "2",
              "bit_start": "15",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "calibration_reference_pressure",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x3D": [
            {
              "data_size": "4",
              "bit_start": "31",
              "bit_end": "16",
              "type": "unsigned",
              "parameter_name": "pressure_threshold_max",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "4",
              "bit_start": "15",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "pressure_threshold_min",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x41": [
            {
              "data_size": "1",
              "bit_start": "5",
              "bit_end": "4",
              "type": "unsigned",
              "parameter_name": "accelerometer_measurement_range",
              "group_name": "accelerometer_sensitivity",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "1",
              "bit_start": "2",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "accelerometer_sample_rate",
              "group_name": "accelerometer_sensitivity",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x42": [
            {
              "data_size": "2",
              "bit_start": "15",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "sleep_acceleration_threshold",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "0.001",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x43": [
            {
              "data_size": "1",
              "bit_start": "7",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "timeout_to_sleep",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x48": [
            {
              "data_size": "4",
              "bit_start": "31",
              "bit_end": "16",
              "type": "unsigned",
              "parameter_name": "free_fall_acceleration_threshold",
              "group_name": "free_fall",
              "category_name": "",
              "round": "",
              "coefficient": "0.001",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "4",
              "bit_start": "15",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "free_fall_acceleration_interval",
              "group_name": "free_fall",
              "category_name": "",
              "round": "",
              "coefficient": "0.001",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x49": [
            {
              "data_size": "4",
              "bit_start": "31",
              "bit_end": "16",
              "type": "unsigned",
              "parameter_name": "impact_threshold",
              "group_name": "impact",
              "category_name": "",
              "round": "",
              "coefficient": "0.001",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "4",
              "bit_start": "15",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "impact_blackout_duration",
              "group_name": "impact",
              "category_name": "",
              "round": "",
              "coefficient": "0.001",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x4A": [
            {
              "data_size": "3",
              "bit_start": "23",
              "bit_end": "8",
              "type": "unsigned",
              "parameter_name": "torpidity_threshold",
              "group_name": "torpidity",
              "category_name": "",
              "round": "",
              "coefficient": "0.001",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "3",
              "bit_start": "7",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "torpidity_interval",
              "group_name": "torpidity",
              "category_name": "",
              "round": "",
              "coefficient": "0.001",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x50": [
            {
              "data_size": "1",
              "bit_start": "7",
              "bit_end": "7",
              "type": "unsigned",
              "parameter_name": "ble_avg_mode",
              "group_name": "ble_mode",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "1",
              "bit_start": "6",
              "bit_end": "6",
              "type": "unsigned",
              "parameter_name": "ble_dz_status_report",
              "group_name": "ble_mode",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "1",
              "bit_start": "5",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "ble_num_reported_devices",
              "group_name": "ble_mode",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x51": [
            {
              "data_size": "1",
              "bit_start": "7",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "ble_scan_duration_periodic",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x52": [
            {
              "data_size": "2",
              "bit_start": "15",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "ble_scan_interval",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x53": [
            {
              "data_size": "2",
              "bit_start": "15",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "ble_scan_window",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x54": [
            {
              "data_size": "9",
              "bit_start": "71",
              "bit_end": "48",
              "type": "hexstring",
              "parameter_name": "ble_range0_bd_addr_oui",
              "group_name": "ble_range0",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "9",
              "bit_start": "47",
              "bit_end": "24",
              "type": "hexstring",
              "parameter_name": "ble_range0_bd_addr_start",
              "group_name": "ble_range0",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "9",
              "bit_start": "23",
              "bit_end": "0",
              "type": "hexstring",
              "parameter_name": "ble_range0_bd_addr_end",
              "group_name": "ble_range0",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x55": [
            {
              "data_size": "9",
              "bit_start": "71",
              "bit_end": "48",
              "type": "hexstring",
              "parameter_name": "ble_range1_bd_addr_oui",
              "group_name": "ble_range1",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "9",
              "bit_start": "47",
              "bit_end": "24",
              "type": "hexstring",
              "parameter_name": "ble_range1_bd_addr_start",
              "group_name": "ble_range1",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "9",
              "bit_start": "23",
              "bit_end": "0",
              "type": "hexstring",
              "parameter_name": "ble_range1_bd_addr_end",
              "group_name": "ble_range1",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x56": [
            {
              "data_size": "9",
              "bit_start": "71",
              "bit_end": "48",
              "type": "hexstring",
              "parameter_name": "ble_range2_bd_addr_oui",
              "group_name": "ble_range2",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "9",
              "bit_start": "47",
              "bit_end": "24",
              "type": "hexstring",
              "parameter_name": "ble_range2_bd_addr_start",
              "group_name": "ble_range2",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "9",
              "bit_start": "23",
              "bit_end": "0",
              "type": "hexstring",
              "parameter_name": "ble_range2_bd_addr_end",
              "group_name": "ble_range2",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x57": [
            {
              "data_size": "9",
              "bit_start": "71",
              "bit_end": "48",
              "type": "hexstring",
              "parameter_name": "ble_range3_bd_addr_oui",
              "group_name": "ble_range3",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "9",
              "bit_start": "47",
              "bit_end": "24",
              "type": "hexstring",
              "parameter_name": "ble_range3_bd_addr_start",
              "group_name": "ble_range3",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "9",
              "bit_start": "23",
              "bit_end": "0",
              "type": "hexstring",
              "parameter_name": "ble_range3_bd_addr_end",
              "group_name": "ble_range3",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x58": [
            {
              "data_size": "7",
              "bit_start": "55",
              "bit_end": "8",
              "type": "hexstring",
              "parameter_name": "ble_dz0_bd_addr",
              "group_name": "ble_dz0",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "7",
              "bit_start": "7",
              "bit_end": "0",
              "type": "signed",
              "parameter_name": "ble_dz0_rssi",
              "group_name": "ble_dz0",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x59": [
            {
              "data_size": "7",
              "bit_start": "55",
              "bit_end": "8",
              "type": "hexstring",
              "parameter_name": "ble_dz1_bd_addr",
              "group_name": "ble_dz1",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "7",
              "bit_start": "7",
              "bit_end": "0",
              "type": "signed",
              "parameter_name": "ble_dz1_rssi",
              "group_name": "ble_dz1",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x5A": [
            {
              "data_size": "7",
              "bit_start": "55",
              "bit_end": "8",
              "type": "hexstring",
              "parameter_name": "ble_dz2_bd_addr",
              "group_name": "ble_dz2",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "7",
              "bit_start": "7",
              "bit_end": "0",
              "type": "signed",
              "parameter_name": "ble_dz2_rssi",
              "group_name": "ble_dz2",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x5B": [
            {
              "data_size": "7",
              "bit_start": "55",
              "bit_end": "8",
              "type": "hexstring",
              "parameter_name": "ble_dz3_bd_addr",
              "group_name": "ble_dz3",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "7",
              "bit_start": "7",
              "bit_end": "0",
              "type": "signed",
              "parameter_name": "ble_dz3_rssi",
              "group_name": "ble_dz3",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x68": [
            {
              "data_size": "1",
              "bit_start": "2",
              "bit_end": "2",
              "type": "unsigned",
              "parameter_name": "battery_lifetime_dys_report",
              "group_name": "battery_report_options",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "1",
              "bit_start": "1",
              "bit_end": "1",
              "type": "unsigned",
              "parameter_name": "battery_lifetime_pct_report",
              "group_name": "battery_report_options",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x69": [
            {
              "data_size": "2",
              "bit_start": "15",
              "bit_end": "14",
              "type": "unsigned",
              "parameter_name": "low_battery_threshold_type",
              "group_name": "low_battery_threshold",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "2",
              "bit_start": "13",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "low_battery_threshold_value",
              "group_name": "low_battery_threshold",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x6A": [
            {
              "data_size": "4",
              "bit_start": "31",
              "bit_end": "24",
              "type": "unsigned",
              "parameter_name": "low_battery_led_on_time",
              "group_name": "low_battery_led_config",
              "category_name": "",
              "round": "",
              "coefficient": "0.01",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "4",
              "bit_start": "23",
              "bit_end": "16",
              "type": "unsigned",
              "parameter_name": "low_battery_led_off_time",
              "group_name": "low_battery_led_config",
              "category_name": "",
              "round": "",
              "coefficient": "0.01",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "4",
              "bit_start": "15",
              "bit_end": "8",
              "type": "unsigned",
              "parameter_name": "low_battery_led_num_on_offs",
              "group_name": "low_battery_led_config",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "4",
              "bit_start": "7",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "low_battery_led_period",
              "group_name": "low_battery_led_config",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x6B": [
            {
              "data_size": "1",
              "bit_start": "7",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "avg_energy_trend_window",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": "",
              "enum": {}
            }
          ],
          "0x6C": [
            {
              "data_size": "1",
              "bit_start": "7",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "buzzer_disable_timeout",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": "",
              "enum": {}
            }
          ],
          "0x6F": [
            {
              "data_size": "1",
              "bit_start": "7",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "resp_format",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x71": [
            {
              "data_size": "7",
              "bit_start": "55",
              "bit_end": "48",
              "type": "unsigned",
              "parameter_name": "app_ver_major",
              "group_name": "metadata",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "7",
              "bit_start": "47",
              "bit_end": "40",
              "type": "unsigned",
              "parameter_name": "app_ver_minor",
              "group_name": "metadata",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "7",
              "bit_start": "39",
              "bit_end": "32",
              "type": "unsigned",
              "parameter_name": "app_ver_revision",
              "group_name": "metadata",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "7",
              "bit_start": "31",
              "bit_end": "24",
              "type": "unsigned",
              "parameter_name": "loramac_ver_major",
              "group_name": "metadata",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "7",
              "bit_start": "23",
              "bit_end": "16",
              "type": "unsigned",
              "parameter_name": "loramac_ver_minor",
              "group_name": "metadata",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "7",
              "bit_start": "15",
              "bit_end": "8",
              "type": "unsigned",
              "parameter_name": "loramac_ver_revision",
              "group_name": "metadata",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "7",
              "bit_start": "7",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "lorawan_region_id",
              "group_name": "metadata",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ]
    },
    "16":{
    "0x0D 0x3C": [
        {
        "data_size": "1",
        "bit_start": "7",
        "bit_end": "0",
        "type": "unsigned",
        "parameter_name": "num_satellites",
        "group_name": "",
        "category_name": "",
        "round": "",
        "coefficient": "",
        "multiple": "",
        "addition": ""
        }
        ],
        "0x0D 0x64": [
        {
            "data_size": "2",
            "bit_start": "15",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "avg_satellite_snr",
            "group_name": "",
            "category_name": "",
            "round": "",
            "coefficient": "0.1",
            "multiple": "",
            "addition": ""
        }
        ],
        "0x0D 0x95": [
        {
            "data_size": "1",
            "bit_start": "1",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "fix_type",
            "group_name": "",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
        }
        ],
        "0x0D 0x96": [
        {
            "data_size": "2",
            "bit_start": "15",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "time_to_fix",
            "group_name": "",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
        }
        ],
        "0x0D 0x97": [
        {
            "data_size": "4",
            "bit_start": "31",
            "bit_end": "16",
            "type": "unsigned",
            "parameter_name": "gnss_vertical_accuracy",
            "group_name": "fix_accuracy",
            "category_name": "",
            "round": "toFixed(2)",
            "coefficient": "",
            "multiple": "",
            "addition": ""
        },
        {
            "data_size": "4",
            "bit_start": "15",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "gnss_horizontal_accuracy",
            "group_name": "fix_accuracy",
            "category_name": "",
            "round": "toFixed(2)",
            "coefficient": "",
            "multiple": "",
            "addition": ""
        }
        ],
        "0x0D 0x98": [
        {
            "data_size": "4",
            "bit_start": "31",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "ground_speed_accuracy",
            "group_name": "",
            "category_name": "",
            "round": "toFixed(3)",
            "coefficient": "0.001",
            "multiple": "",
            "addition": ""
        }
        ],
        "0x0D 0x99": [
        {
            "data_size": "1",
            "bit_start": "7",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "num_of_fixes",
            "group_name": "",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
        }
        ],
        "0x0D 0x0F": [
        {
            "data_size": "2",
            "bit_start": "15",
            "bit_end": "0",
            "type": "unsigned",
            "parameter_name": "log_num",
            "group_name": "",
            "category_name": "",
            "round": "",
            "coefficient": "",
            "multiple": "",
            "addition": ""
        }
    ]
    },
    "15":{
        "0x0A": [
            {
              "data_size": "5",
              "bit_start": "39",
              "bit_end": "34",
              "type": "unsigned",
              "parameter_name": "year_0a",
              "group_name": "log_request_utc_type_a",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "33",
              "bit_end": "30",
              "type": "unsigned",
              "parameter_name": "month_0a",
              "group_name": "log_request_utc_type_a",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "29",
              "bit_end": "25",
              "type": "unsigned",
              "parameter_name": "day_0a",
              "group_name": "log_request_utc_type_a",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "24",
              "bit_end": "20",
              "type": "unsigned",
              "parameter_name": "hour_0a",
              "group_name": "log_request_utc_type_a",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "19",
              "bit_end": "14",
              "type": "unsigned",
              "parameter_name": "minute_0a",
              "group_name": "log_request_utc_type_a",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "13",
              "bit_end": "8",
              "type": "unsigned",
              "parameter_name": "second_0a",
              "group_name": "log_request_utc_type_a",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "7",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "number_0a",
              "group_name": "log_request_utc_type_a",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x0B": [
            {
              "data_size": "1",
              "bit_start": "7",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "number_0b",
              "group_name": "log_request_utc_type_b",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x01": [
            {
              "data_size": "5",
              "bit_start": "39",
              "bit_end": "32",
              "type": "unsigned",
              "parameter_name": "fragment_number_1",
              "group_name": "log_utc",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "31",
              "bit_end": "26",
              "type": "unsigned",
              "parameter_name": "year_1",
              "group_name": "log_utc",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "25",
              "bit_end": "22",
              "type": "unsigned",
              "parameter_name": "month_1",
              "group_name": "log_utc",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "21",
              "bit_end": "17",
              "type": "unsigned",
              "parameter_name": "day_1",
              "group_name": "log_utc",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "16",
              "bit_end": "12",
              "type": "unsigned",
              "parameter_name": "hour_1",
              "group_name": "log_utc",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "11",
              "bit_end": "6",
              "type": "unsigned",
              "parameter_name": "minute_1",
              "group_name": "log_utc",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "5",
              "bit_start": "5",
              "bit_end": "0",
              "type": "unsigned",
              "parameter_name": "second_1",
              "group_name": "log_utc",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ],
          "0x02": [
            {
              "data_size": "9",
              "bit_start": "71",
              "bit_end": "64",
              "type": "unsigned",
              "parameter_name": "fragment_number_2",
              "group_name": "log_coordinates",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": "",
              "enum": {}
            },
            {
              "data_size": "9",
              "bit_start": "63",
              "bit_end": "40",
              "type": "signed",
              "parameter_name": "latitude_2",
              "group_name": "log_coordinates",
              "category_name": "",
              "round": "",
              "coefficient": "1.07E-05",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "9",
              "bit_start": "39",
              "bit_end": "16",
              "type": "signed",
              "parameter_name": "longitude_2",
              "group_name": "log_coordinates",
              "category_name": "",
              "round": "",
              "coefficient": "2.15E-05",
              "multiple": "",
              "addition": ""
            },
            {
              "data_size": "9",
              "bit_start": "15",
              "bit_end": "0",
              "type": "signed",
              "parameter_name": "altitude_2",
              "group_name": "log_coordinates",
              "category_name": "",
              "round": "",
              "coefficient": "0.144958496",
              "multiple": " + -500",
              "addition": ""
            }
          ],
          "0x03": [
            {
              "data_size": "",
              "bit_start": "",
              "bit_end": "",
              "type": "",
              "parameter_name": "",
              "group_name": "",
              "category_name": "",
              "round": "",
              "coefficient": "",
              "multiple": "",
              "addition": ""
            }
          ]
    }
}
    if (typeof Object.assign !== 'function') {
        // Must be writable: true, enumerable: false, configurable: true
        Object.defineProperty(Object, "assign", {
            value: function assign(target, varArgs) { // .length of function is 2
                'use strict';
                if (target === null || target === undefined) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }

                var to = Object(target);

                for (var index = 1; index < arguments.length; index++) {
                    var nextSource = arguments[index];

                    if (nextSource !== null && nextSource !== undefined) {
                        for (var nextKey in nextSource) {
                            // Avoid bugs when hasOwnProperty is shadowed
                            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                                to[nextKey] = nextSource[nextKey];
                            }
                        }
                    }
                }
                return to;
            },
            writable: true,
            configurable: true
        });
    }

    function crc16(buffer) {
        var crc = 0xFFFF;
        var odd;

        for (var i = 0; i < buffer.length; i++) {
            crc = crc ^ buffer[i];

            for (var j = 0; j < 8; j++) {
                odd = crc & 0x0001;
                crc = crc >> 1;
                if (odd) {
                    crc = crc ^ 0xA001;
                }
            }
        }

        return crc;
    };

    function trunc(v){
        v = +v;
        if (!isFinite(v)) return v;
        return (v - v % 1)   ||   (v < 0 ? -0 : v === 0 ? v : 0);
    }

    function stringifyHex(header) {
        // expects Number, returns stringified hex number in format (FF -> 0xFF) || (A -> 0x0A)
        var ret = header.toString(16).toUpperCase()
        if (ret.length === 1) {
            return "0x0" + ret;
        }
        return "0x" + ret;
    }

    function toUint(x) {
        return x >>> 0;
    }

    function byteArrayToArray(byteArray) {
        var array = []
        for (i = 0; i < byteArray.length; i++){
            array.push(byteArray[i] < 0 ? byteArray[i]+256 : byteArray[i])
            // adding 256 turns this into an unsigned byte array, which is what we want.
        }
        return array;
    }

    function byteArrayToHexString(byteArray) {
        var arr = [];
        for (var i = 0; i < byteArray.length; ++i) {
            arr.push(('0' + (byteArray[i] & 0xFF).toString(16).toUpperCase()).slice(-2));
        }
        return arr.join('');
    }

    function extractBytes(chunk, startBit, endBit) {
        // example:
        //          chunk = [ 0b00000100, 0b11111000 ]
        // we'll be going from      ^    to    ^   to go from bit 11 to bit 4
        // startBit =  11
        // endBit = 4
        // RETURN: [ 01001111 ]. Array is expanded to fit an appropriate number of bits.

        // You are heavily encouraged to run this function with debug to get a feel for what it does.
        // A great example would be LoRaMAC options

        var totalBits = startBit - endBit + 1;
        var totalBytes = totalBits % 8 === 0 ? toUint(totalBits / 8) : toUint(totalBits / 8) + 1;
        var bitOffset = endBit % 8;
        var arr = new Array(totalBytes);

        for (var byte = totalBytes-1; byte >= 0; byte--) {
            // we'll be looking at up to 2 bytes at a time: hi (the right one) and lo (the left one).
            // in the above example those would be byte 0 (from which we took 0b0100)
            // and byte 1 (from which we took 0b1111)
            // after which we *hi | lo* and received 0b01000000 | 0b00001111 = 0b01001111

            var chunkIndex = byte + (chunk.length - 1 - trunc(startBit / 8));
            var lo = chunk[chunkIndex] >> bitOffset; // from the example: 0b11111000 >> 4 = 0b1111 (0b1000 was trunc'ed)
            var hi = 0;
            if (byte !== 0) {
                var hi_bitmask = (1 << bitOffset) - 1 // same as 2^bitOffset - 1
                var bits_to_take_from_hi = 8 - bitOffset // in the example above this var is 4, because we take 4 bits from hi
                hi = (chunk[chunkIndex - 1] & (hi_bitmask << bits_to_take_from_hi));
            } else {
                // Truncate last bits
                lo = lo & ((1 << (totalBits % 8 ? totalBits % 8 : 8)) - 1);
            }
            arr[byte] = hi | lo;
        }
        return arr;
    }

    function byteTo8Bits(byte){
        var bits = byte.toString(2).split('')
        for (var i = 0; i < bits.length; i++) {
            bits[i] = bits[i] === '1'
        }
        while (bits.length % 8 !== 0) { //turns 1111 into 00001111
            bits.unshift(false);
        }
        return bits
    }

    function bytesToValue(bytes, dataType, coefficient, round, addition) {
        var output = 0;
        if (dataType === "unsigned") {
            for (var i = 0; i < bytes.length; ++i) {
                output = (toUint(output << 8)) | bytes[i];
            }
            return round ? Number( (output*coefficient + addition).toFixed(round) ) : Number(output*coefficient + addition);
        }

        if (dataType === "signed") {
            for (var i = 0; i < bytes.length; ++i) {
                output = (output << 8) | bytes[i];
            }
            // Convert to signed, based on value size
            if (output > Math.pow(2, 8*bytes.length-1)) {
                output -= Math.pow(2, 8*bytes.length);
            }

            return Number( (output*coefficient + addition).toFixed(round) )
        }

        if (dataType === "hexstring") {
            return byteArrayToHexString(bytes);
        }

        if (dataType === "double") {
            if (bytes.length !== 8)
                return 0;
            //as per IEEE 754 implementation
            var bit_arr = [];
            for (var i = 0; i < bytes.length; i++) {
                bit_arr = bit_arr.concat(byteTo8Bits(bytes[i]))
            }
            var sign = bit_arr[0] ? -1 : 1;
            var exp = 0;
            for (var i_here = 11; i_here >= 1; i_here--) {
                exp += Math.pow(2, 11-i_here) * (bit_arr[i_here] ? 1 : 0)
            }
            var fraction = 1;
            for (var i = 12; i < bit_arr.length; i++) {
                fraction += Math.pow(2, -(i-11)) * (bit_arr[i] ? 1 : 0)
            }
            return sign*fraction*Math.pow(2, exp-1023)
        }

        // Incorrect data type
        return null;
    }

    function decodeField(chunk, p) {
        //decodeField(valueArray, p["bit_start"], p["bit_end"], p["type"], p["coefficient"], p["round"], p["addition"])
        var startBit = p["bit_start"]
        var endBit = p["bit_end"]
        var dataType = p["type"]
        var addition = (typeof p["addition"] !== 'undefined') ?  Number(p["addition"]) : 0;
        var coefficient = (typeof p["coefficient"] !== 'undefined') ? Number(p["coefficient"]) : 1;
        var round = (typeof p["round"] !== 'undefined') ? Number(p["round"]) : 0;

        var bytes = extractBytes(chunk, startBit, endBit);
        return bytesToValue(bytes, dataType, coefficient, round, addition);
    }

    function flattenObject(ob) {
        var toReturn = {};

        for (var i in ob) {
            if (!ob.hasOwnProperty(i)) continue;

            if ((typeof ob[i]) == 'object') {
                var flatObject = flattenObject(ob[i]);
                for (var x in flatObject) {
                    if (!flatObject.hasOwnProperty(x)) continue;

                    toReturn[i + '.' + x] = flatObject[x];
                }
            } else {
                toReturn[i] = ob[i];
            }
        }
        return toReturn;
    }

    function decode(parameters, bytes, port, flat){
        if (typeof(port)==="number")
            port = port.toString();
        //below is performed in case the NS the decoder is used on supplies a byteArray that isn't an array
        bytes = byteArrayToArray(bytes)

        var decodedData = {};
        decodedData.raw = stringifyBytes(bytes);
        decodedData.port = port;
    // decodedData.timestamp = Date.now().toString();
        if(port === "101"){
            var invalid_registers = [];
            var responses = [];
            while(bytes.length > 0){
                downlink_fcnt = bytes[0];
                um_invalid_writes = bytes[1];
                bytes = bytes.slice(2);

                if(num_invalid_writes > 0) {
                    for(var i = 0; i < num_invalid_writes; i++){
                        invalid_registers.push("0x" + bytes[i]);
                    }
                    bytes = bytes.slice(num_invalid_writes);
                    responses.push(parseInt(num_invalid_writes, 16) + " Invalid write command(s) from DL: " + parseInt(downlink_fcnt, 16) + " for register(s): " + invalid_registers.toString());
                }
                else {
                    responses.push("All write commands from DL: " + parseInt(downlink_fcnt, 16) + " were successful");
                }
                invalid_registers = [];
            }
            decodedData.response = responses;
            return decodedData;
        }

        // uncomment below for 1-wire solution

        /*if (port === "20") {
            if (bytes.length <= 1)
                return decodedData;
            var buff = bytes.slice(1, -2)
            var crc_calculated = crc16(buff)
            var crc_le = [crc_calculated & 0xFF, crc_calculated >> 8 & 0xFF] // little endian CRC - the moodbus way
            var crc_received = [bytes[bytes.length-2], bytes[bytes.length-1]]
            console.log(crc_received)
            bytes = bytes.slice(0, -2)

            decodedData.crc_ok = crc_received[0] === crc_le[0] && crc_received[1] === crc_le[1];
            decodedData.crc = stringifyBytes(crc_received)
        }

        if (port == "11") {
            let data_types=["harness_0_periodic", "harness_1_periodic", "harness_0_threshold", "harness_1_threshold"]
            properties = parameters["11"]["none"]
            while(bytes.length > 0) {
                let data_type = bytesToValue(extractBytes(bytes.slice(0,2), 15,12), "unsigned", 1, 0, 0)
                decodedData[data_types[data_type]] = {}
                let bitmask = bytesToValue(extractBytes(bytes.slice(0,2), 9, 0), "unsigned", 1, 0, 0)
                bytes = bytes.slice(2)
                if (bytes.length === 0)
                    return decodedData

                let str_bitmask = bitmask.toString(2)
                let arr_bitmask = [...str_bitmask].map((el)=>parseInt(el))

                for (var i = 0; i < arr_bitmask.length; i++) {
                    if (arr_bitmask[i] === 1) {
                        let valueArray = bytes.slice(0, 2)
                        bytes = bytes.length === 2 ? [] : bytes.slice(2)
                        decodedData[data_types[data_type]]["thermometer_"+(arr_bitmask.length-1-i)] = {
                            temperature:
                                (bytesToValue(extractBytes(valueArray, 10, 10),
                                    "unsigned", 1,0, 0) ? -1 : 1 )
                                *
                                bytesToValue(extractBytes(valueArray, 9, 0),
                                    "unsigned", 0.0625, 2, 0),

                            alarm: bytesToValue(extractBytes(valueArray, 15, 15),
                                "unsigned", 1,0, 0)
                        }
                    }
                }
            }

            return decodedData;
        }*/

        if(port === "33"){
            decodedData.tag_num = bytes.slice(0, 2)
            bytes = bytes.slice(2)

            while(bytes.length > 0){
                var tag_bytes = bytes[0]
                bytes = bytes.slice(1)
                decodedData.tag_data += decode(parameters, bytes.slice(0, tag_bytes), port, flat)
                bytes = bytes.slice(tag_bytes)
            }
        }

        if (port === "14"){
            decodedData.empty_tags = '(bytes.length / 2).toString() + " empty tags found!"';
            decodedData.tags = stringifyBytes(bytes)
            return decodedData;
        }

        if (port === "32") {
            decodedData.tag_number = bytesToValue(extractBytes(bytes.slice(0,2), 15, 0), "unsigned", 1, 0, 0)
            bytes = bytes.slice(2)
            port = "10";
        }

        if (!parameters.hasOwnProperty(port)) {
            decodedData.error = "Wrong port: " + port;
            return decodedData
        }

        while (bytes.length > 0) {
            // To find the length of the header, we will search for a header in the decoder object that starts with the same
            // byte, and then see how many bytes the header contains.
            var firstByte = stringifyHex(bytes[0])
            var headers = Object.keys(parameters[port])
            var headerLength = null // setting this to null doesn't affect the algorithm unless the decoder object
            // is erroneous, in which case it's fine. headerLength SHOULD be changed by the for loop below.
            for (var i = 0; i < headers.length; i++){
                if ( firstByte === (headers[i].split(' '))[0] ) {
                    headerLength = (headers[i].split(' ')).length;
                }
            }

            var header
            if (parameters[port].hasOwnProperty("none")){
                header = "none"
            } else {
                header = bytes.slice(0, headerLength);
                bytes = bytes.slice(headerLength)
                if (headerLength === 1) {
                    header = stringifyHex(header[0]);
                } else if (headerLength === 2) {
                    header = stringifyHex(header[0]) + " " + stringifyHex(header[1])
                }
            }

            if (!parameters[port].hasOwnProperty(header)) {
                decodedData.error = "Couldn't find header " + header + " in decoder object." +
                    " Are you decoding the correct sensor?";
                return decodedData;
            }

            var properties = parameters[port][header];

            if (properties.length === 0) {
                decodedData.error = "Something is wrong with the decoder object. Check " +
                    "port "+ port + ", header " + header + ""
                return decodedData;
            }

            var i, j, p, bytesToConsume, valueArray
            // WARNING: arrays can only ever be in the end of the properties for a given port / header
            if (properties.length === 1) {
                // if property array has only one element, then its either going to be a value or a value array,
                // since a group would require at least 2 elements

                p = properties[0];
                if (!decodedData.hasOwnProperty(p["category_name"]))
                    decodedData[p["category_name"]] = {}

                if (p["multiple"] == 0) {

                    // CASE 1:
                    // value
                    bytesToConsume = parseInt( p["data_size"] )
                    valueArray = []
                    for (i = 0; i < bytesToConsume; i++) {
                        valueArray.push(bytes[0])
                        bytes = bytes.slice(1)
                    }

                    decodedData[p["category_name"]][p["parameter_name"]] =
                        decodeField(valueArray, p)

                } else {
                    // CASE 2:
                    // array of values (without anything in front)
                    decodedData[ p["category_name"] ][ p["parameter_name"] ] = []
                    while (bytes.length > 0) {
                        bytesToConsume = parseInt(p["data_size"])
                        valueArray = []
                        for (i = 0; i < bytesToConsume; i++) {
                            valueArray.push(bytes[0])
                            bytes = bytes.slice(1)
                        }
                        decodedData[ p["category_name"] ][ p["parameter_name"] ].push(
                            decodeField(valueArray, p)
                        )
                    }
                }
            } else {
                for (i = 0; i < properties.length && bytes.length > 0; i++) {
                    p = properties[i];

                    if (!decodedData.hasOwnProperty(p["category_name"]))
                        decodedData[p["category_name"]] = {}

                    if (p["multiple"] == 0){
                        if (p["group_name"] == "") {
                            // CASE 3:
                            // a stand-alone value that comes right before a group, like in port 15 of Industrial GPS Asset Tracker
                            // and port 20 of Industrial Transceiver
                            bytesToConsume = parseInt(p["data_size"])
                            valueArray = []
                            for (j = 0; j < bytesToConsume; j++) {
                                if (parseInt(p["bit_start"]) < 0){
                                    valueArray.push(bytes.pop())
                                } else {
                                    valueArray.push(bytes[0])
                                    bytes = bytes.slice(1)
                                }
                            }
                            decodedData[p["category_name"]][ p["parameter_name"] ] =
                                decodeField(valueArray, p)
                        } else {
                            // CASE 4:
                            // a group of values
                            if (!decodedData[p["category_name"]].hasOwnProperty(p["group_name"]))
                                decodedData[p["category_name"]][ p["group_name"] ] = {}
                            bytesToConsume = parseInt(p["data_size"])
                            valueArray = []
                            for (j = 0; j < bytesToConsume; j++) {
                                valueArray.push(bytes[0])
                                bytes = bytes.slice(1)
                            }
                            for (j = i; j < properties.length; j++) {
                                p = properties[j]
                                if (p["multiple"] == 0) // there could be an array following a group/value and we don't want to eat that up
                                    decodedData[p["category_name"]][ p["group_name"] ][ p["parameter_name"] ] =
                                        decodeField(valueArray, p)
                            }
                        }
                    }

                    if (p["multiple"] == 0){
                        if (properties[i+1] && properties[i+1]["multiple"] == "1")
                            continue
                        else
                            break;
                    }

                    if (p["group_name"] === "") {
                        // CASE 5:
                        // array of values (after a group or a value)
                        // e.g. for Industrial Sensor serial port communication
                        decodedData[p["category_name"]][ p["parameter_name"] ] = []
                        while (bytes.length > 0) {
                            bytesToConsume = parseInt(p["data_size"])
                            valueArray = []

                            for (j = 0; j < bytesToConsume; j++) {
                                valueArray.push(bytes[0])
                                bytes = bytes.slice(1)
                            }
                            decodedData[p["category_name"]][ p["parameter_name"] ].push(
                                decodeField(valueArray, p)
                            )
                        }
                    } else {
                        // CASE 6:
                        // array of groups (stand-alone OR after a value/group)
                        var multipleIndex = 0;
                        for (; properties[multipleIndex]["multiple"] != 1;
                            multipleIndex++)
                            var isInsideGroup = false;
                        if (typeof decodedData[ p["category_name"] ][ p["group_name"] ] === "object") {
                            decodedData[ p["category_name"] ][ p["group_name"] ][ p["parameter_name"] ] = []
                            isInsideGroup = true;
                        }
                        else
                            decodedData[ p["category_name"] ][ p["group_name"] ] = []
                        // else throw new Error("Fail in CASE 6. If multiple == 1, the parameter must be a part of an existing group or a stand alone array of groups/values.")

                        //TODO: REMOVE HARDCODE

                        while (bytes.length > 0) {
                            bytesToConsume = parseInt(p["data_size"])
                            valueArray = []
                            for (j = 0; j < bytesToConsume; j++) {
                                valueArray.push(bytes[0])
                                bytes = bytes.slice(1)
                            }
                            var obj = {}
                            for (j = multipleIndex; j < properties.length; j++) {
                                p = properties[j]
                                obj[ p["parameter_name"] ] =
                                    decodeField(valueArray, p)
                            }
                            if (isInsideGroup)
                                decodedData[ p["category_name"] ][ p["group_name"] ][ p["parameter_name"] ].push(obj)
                            else
                                decodedData[ p["category_name"] ][ p["group_name"] ].push(obj)
                        }

                    }
                }
            }
        }
        if (decodedData.hasOwnProperty("")) {                     // Uplink-only fields have an empty string category,
            decodedData = Object.assign(decodedData, decodedData[""])  // this will take care of it
            delete decodedData[""]
        }

        return flat ? flattenObject(decodedData) : decodedData;
    }

    function stringifyBytes(bytes){
        var stringBytes = "["
        for (var i = 0; i < bytes.length; i++){
            if (i !== 0)
                stringBytes+=", "
            var byte = bytes[i].toString(16).toUpperCase()
            if (byte.split("").length === 1)
                byte = "0" + byte
            stringBytes+= byte
        }
        stringBytes+="]"

        return stringBytes
    }

    return {
        data: decode(sensor, input.bytes, input.fPort, false),
        warnings: [],
        errors: []
    };
}

	if (typeof decodeUplink === 'function') {
		__ogtb_decode_uplink = decodeUplink;
	} else if (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function') {
		__ogtb_decode_uplink = codec.decodeUplink;
	}
})();

// ─── Source encoder (TTN downlinkEncoder : encoder_seal.js) ─────────
(function () {
var sensor =
{
    "loramac_config": {
        "join_mode": {
            "header": "0x10",
            "data_size": 2,
            "bit_start": 15,
            "bit_end": 15,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "loramac_opts": {
            "header": "0x11",
            "or_80_to_write": 1,
            "port": 100,
            "loramac_adr": {
                "data_size": 2,
                "bit_start": 3,
                "bit_end": 3,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "loramac_duty_cycle": {
                "data_size": 2,
                "bit_start": 2,
                "bit_end": 2,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "loramac_ul_type": {
                "data_size": 2,
                "bit_start": 1,
                "bit_end": 1,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "loramac_confirmed": {
                "data_size": 2,
                "bit_start": 0,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "loramac_dr_tx": {
            "header": "0x12",
            "or_80_to_write": 1,
            "port": 100,
            "loramac_default_dr": {
                "data_size": 2,
                "bit_start": 11,
                "bit_end": 8,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "loramac_default_tx_pwr": {
                "data_size": 2,
                "bit_start": 3,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "loramac_rx2": {
            "header": "0x13",
            "or_80_to_write": 1,
            "port": 100,
            "loramac_rx2_freq": {
                "data_size": 5,
                "bit_start": 39,
                "bit_end": 8,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "loramac_rx2_dr": {
                "data_size": 5,
                "bit_start": 7,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        }
    },
    "periodic_tx_config": {
        "seconds_per_core_tick": {
            "header": "0x20",
            "data_size": 4,
            "bit_start": 31,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "ticks_battery": {
            "header": "0x21",
            "data_size": 2,
            "bit_start": 15,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "ticks_normal_state": {
            "header": "0x22",
            "data_size": 2,
            "bit_start": 15,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "ticks_emergency_state": {
            "header": "0x23",
            "data_size": 2,
            "bit_start": 15,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "ticks_accelerometer": {
            "header": "0x24",
            "data_size": 2,
            "bit_start": 15,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "ticks_temperature": {
            "header": "0x25",
            "data_size": 2,
            "bit_start": 15,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "ticks_safety_status_normal": {
            "header": "0x26",
            "data_size": 2,
            "bit_start": 15,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "ticks_pressure": {
            "header": "0x27",
            "data_size": 2,
            "bit_start": 15,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        }
    },
    "eb_config": {
        "eb_active_buzz_config": {
            "header": "0x28",
            "or_80_to_write": 1,
            "port": 100,
            "eb_buzz_active_on_time": {
                "data_size": 3,
                "bit_start": 23,
                "bit_end": 16,
                "type": "unsigned",
                "round": 2,
                "coefficient": "0.1",
                "access": "RW",
                "multiple": 0
            },
            "eb_buzz_active_off_time": {
                "data_size": 3,
                "bit_start": 15,
                "bit_end": 8,
                "type": "unsigned",
                "round": 2,
                "coefficient": "0.1",
                "access": "RW",
                "multiple": 0
            },
            "eb_buzz_active_num_on_offs": {
                "data_size": 3,
                "bit_start": 7,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "eb_inactive_buzz_config": {
            "header": "0x29",
            "or_80_to_write": 1,
            "port": 100,
            "eb_buzz_inactive_on_time": {
                "data_size": 3,
                "bit_start": 23,
                "bit_end": 16,
                "type": "unsigned",
                "round": 2,
                "coefficient": "0.1",
                "access": "RW",
                "multiple": 0
            },
            "eb_buzz_inactive_off_time": {
                "data_size": 3,
                "bit_start": 15,
                "bit_end": 8,
                "type": "unsigned",
                "round": 2,
                "coefficient": "0.1",
                "access": "RW",
                "multiple": 0
            },
            "eb_buzz_inactive_num_on_offs": {
                "data_size": 3,
                "bit_start": 7,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        }
    },
    "sh_config": {
        "sh_debounce_interval": {
            "header": "0x2C",
            "data_size": 1,
            "bit_start": 7,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "sh_buzz_config": {
            "header": "0x2D",
            "or_80_to_write": 1,
            "port": 100,
            "sh_buzz_when_to": {
                "data_size": 5,
                "bit_start": 33,
                "bit_end": 32,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "sh_buzz_on_time": {
                "data_size": 5,
                "bit_start": 31,
                "bit_end": 24,
                "type": "unsigned",
                "round": 2,
                "coefficient": "0.1",
                "access": "RW",
                "multiple": 0
            },
            "sh_buzz_off_time": {
                "data_size": 5,
                "bit_start": 23,
                "bit_end": 16,
                "type": "unsigned",
                "round": 2,
                "coefficient": "0.1",
                "access": "RW",
                "multiple": 0
            },
            "sh_buzz_num_on_offs": {
                "data_size": 5,
                "bit_start": 15,
                "bit_end": 8,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "sh_buzz_period": {
                "data_size": 5,
                "bit_start": 7,
                "bit_end": 0,
                "type": "unsigned",
                "round": 2,
                "coefficient": "0.1",
                "access": "RW",
                "multiple": 0
            }
        }
    },
    "gnss_config": {
        "gnss_receiver": {
            "header": "0x30",
            "data_size": 1,
            "bit_start": 7,
            "bit_end": 7,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "gnss_report_options": {
            "header": "0x31",
            "or_80_to_write": 1,
            "port": 100,
            "gnss_dz_status_report": {
                "data_size": 1,
                "bit_start": 2,
                "bit_end": 2,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "gnss_ground_speed_report": {
                "data_size": 1,
                "bit_start": 1,
                "bit_end": 1,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "gnss_utc_coordinates_report": {
                "data_size": 1,
                "bit_start": 0,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "gnss_dz0": {
            "header": "0x32",
            "or_80_to_write": 1,
            "port": 100,
            "gnss_dz0_latitude": {
                "data_size": 8,
                "bit_start": 63,
                "bit_end": 40,
                "type": "signed",
                "round": 7,
                "coefficient": "1.07E-05",
                "access": "RW",
                "multiple": 0
            },
            "gnss_dz0_longitude": {
                "data_size": 8,
                "bit_start": 39,
                "bit_end": 16,
                "type": "signed",
                "round": 7,
                "coefficient": "2.15E-05",
                "access": "RW",
                "multiple": 0
            },
            "gnss_dz0_radius": {
                "data_size": 8,
                "bit_start": 15,
                "bit_end": 0,
                "type": "signed",
                "round": 1,
                "coefficient": 10,
                "access": "RW",
                "multiple": 0
            }
        },
        "gnss_dz1": {
            "header": "0x33",
            "or_80_to_write": 1,
            "port": 100,
            "gnss_dz1_latitude": {
                "data_size": 8,
                "bit_start": 63,
                "bit_end": 40,
                "type": "signed",
                "round": 7,
                "coefficient": "1.07E-05",
                "access": "RW",
                "multiple": 0
            },
            "gnss_dz1_longitude": {
                "data_size": 8,
                "bit_start": 39,
                "bit_end": 16,
                "type": "signed",
                "round": 7,
                "coefficient": "2.15E-05",
                "access": "RW",
                "multiple": 0
            },
            "gnss_dz1_radius": {
                "data_size": 8,
                "bit_start": 15,
                "bit_end": 0,
                "type": "signed",
                "round": 1,
                "coefficient": 10,
                "access": "RW",
                "multiple": 0
            }
        },
        "gnss_dz2": {
            "header": "0x34",
            "or_80_to_write": 1,
            "port": 100,
            "gnss_dz2_latitude": {
                "data_size": 8,
                "bit_start": 63,
                "bit_end": 40,
                "type": "signed",
                "round": 7,
                "coefficient": "1.07E-05",
                "access": "RW",
                "multiple": 0
            },
            "gnss_dz2_longitude": {
                "data_size": 8,
                "bit_start": 39,
                "bit_end": 16,
                "type": "signed",
                "round": 7,
                "coefficient": "2.15E-05",
                "access": "RW",
                "multiple": 0
            },
            "gnss_dz2_radius": {
                "data_size": 8,
                "bit_start": 15,
                "bit_end": 0,
                "type": "signed",
                "round": 1,
                "coefficient": 10,
                "access": "RW",
                "multiple": 0
            }
        },
        "gnss_dz3": {
            "header": "0x35",
            "or_80_to_write": 1,
            "port": 100,
            "gnss_dz3_latitude": {
                "data_size": 8,
                "bit_start": 63,
                "bit_end": 40,
                "type": "signed",
                "round": 7,
                "coefficient": "1.07E-05",
                "access": "RW",
                "multiple": 0
            },
            "gnss_dz3_longitude": {
                "data_size": 8,
                "bit_start": 39,
                "bit_end": 16,
                "type": "signed",
                "round": 7,
                "coefficient": "2.15E-05",
                "access": "RW",
                "multiple": 0
            },
            "gnss_dz3_radius": {
                "data_size": 8,
                "bit_start": 15,
                "bit_end": 0,
                "type": "signed",
                "round": 1,
                "coefficient": 10,
                "access": "RW",
                "multiple": 0
            }
        },
        "gnss_diagnostics_tx": {
            "header": "0x36",
            "or_80_to_write": 1,
            "port": 100,
            "num_of_sats": {
                "data_size": 1,
                "bit_start": 0,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "avg_sat_snr": {
                "data_size": 1,
                "bit_start": 1,
                "bit_end": 1,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "reported_fix_type": {
                "data_size": 1,
                "bit_start": 2,
                "bit_end": 2,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "time_to_reported_fix": {
                "data_size": 1,
                "bit_start": 3,
                "bit_end": 3,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "fix_log_num": {
                "data_size": 1,
                "bit_start": 4,
                "bit_end": 4,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "fix_acc_and_num_fixes_report": {
                "data_size": 1,
                "bit_start": 5,
                "bit_end": 5,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        }
    },
    "emergency_config": {
        "emergency_state_trigger": {
            "header": "0x38",
            "or_80_to_write": 1,
            "port": 100,
            "emergency_trigger_by_ble_dz": {
                "data_size": 1,
                "bit_start": 1,
                "bit_end": 1,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "emergency_trigger_by_gnss_dz": {
                "data_size": 1,
                "bit_start": 0,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "emergency_state_led_config": {
            "header": "0x39",
            "or_80_to_write": 1,
            "port": 100,
            "emergency_led_on_time": {
                "data_size": 4,
                "bit_start": 31,
                "bit_end": 24,
                "type": "unsigned",
                "round": 2,
                "coefficient": "0.01",
                "access": "RW",
                "multiple": 0
            },
            "emergency_led_off_time": {
                "data_size": 4,
                "bit_start": 23,
                "bit_end": 16,
                "type": "unsigned",
                "round": 2,
                "coefficient": "0.01",
                "access": "RW",
                "multiple": 0
            },
            "emergency_led_num_on_offs": {
                "data_size": 4,
                "bit_start": 15,
                "bit_end": 8,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "emergency_led_period": {
                "data_size": 4,
                "bit_start": 7,
                "bit_end": 0,
                "type": "unsigned",
                "round": 1,
                "coefficient": "0.1",
                "access": "RW",
                "multiple": 0
            }
        }
    },
    "barometer_config": {
        "seconds_pressure_sample": {
            "header": "0x3B",
            "data_size": 1,
            "bit_start": 5,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": "",
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "calibration_reference_pressure": {
            "header": "0x3C",
            "data_size": 2,
            "bit_start": 15,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "pressure_threshold_max": {
            "header": "0x3D",
            "data_size": 4,
            "bit_start": 31,
            "bit_end": 16,
            "type": "unsigned",
            "round": "",
            "coefficient": "",
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "pressure_threshold_min": {
            "header": "0x3D",
            "data_size": 4,
            "bit_start": 15,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": "",
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        }
    },
    "accelerometer_config": {
        "accelerometer_sensitivity": {
            "header": "0x41",
            "or_80_to_write": 1,
            "port": 100,
            "accelerometer_measurement_range": {
                "data_size": 1,
                "bit_start": 5,
                "bit_end": 4,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "accelerometer_sample_rate": {
                "data_size": 1,
                "bit_start": 2,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "sleep_acceleration_threshold": {
            "header": "0x42",
            "data_size": 2,
            "bit_start": 15,
            "bit_end": 0,
            "type": "unsigned",
            "round": 3,
            "coefficient": "0.001",
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "timeout_to_sleep": {
            "header": "0x43",
            "data_size": 1,
            "bit_start": 7,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        }
    },
    "fall_config": {
        "free_fall": {
            "header": "0x48",
            "or_80_to_write": 1,
            "port": 100,
            "free_fall_acceleration_threshold": {
                "data_size": 4,
                "bit_start": 31,
                "bit_end": 16,
                "type": "unsigned",
                "round": 3,
                "coefficient": "0.001",
                "access": "RW",
                "multiple": 0
            },
            "free_fall_acceleration_interval": {
                "data_size": 4,
                "bit_start": 15,
                "bit_end": 0,
                "type": "unsigned",
                "round": 3,
                "coefficient": "0.001",
                "access": "RW",
                "multiple": 0
            }
        },
        "impact": {
            "header": "0x49",
            "or_80_to_write": 1,
            "port": 100,
            "impact_threshold": {
                "data_size": 4,
                "bit_start": 31,
                "bit_end": 16,
                "type": "unsigned",
                "round": 3,
                "coefficient": "0.001",
                "access": "RW",
                "multiple": 0
            },
            "impact_blackout_duration": {
                "data_size": 4,
                "bit_start": 15,
                "bit_end": 0,
                "type": "unsigned",
                "round": 3,
                "coefficient": "0.001",
                "access": "RW",
                "multiple": 0
            }
        },
        "torpidity": {
            "header": "0x4A",
            "or_80_to_write": 1,
            "port": 100,
            "torpidity_threshold": {
                "data_size": 3,
                "bit_start": 23,
                "bit_end": 8,
                "type": "unsigned",
                "round": 3,
                "coefficient": "0.001",
                "access": "RW",
                "multiple": 0
            },
            "torpidity_interval": {
                "data_size": 3,
                "bit_start": 7,
                "bit_end": 0,
                "type": "unsigned",
                "round": 3,
                "coefficient": "0.001",
                "access": "RW",
                "multiple": 0
            }
        }
    },
    "ble_config": {
        "ble_mode": {
            "header": "0x50",
            "or_80_to_write": 1,
            "port": 100,
            "ble_avg_mode": {
                "data_size": 1,
                "bit_start": 7,
                "bit_end": 7,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "ble_dz_status_report": {
                "data_size": 1,
                "bit_start": 6,
                "bit_end": 6,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "ble_num_reported_devices": {
                "data_size": 1,
                "bit_start": 5,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "ble_scan_duration_periodic": {
            "header": "0x51",
            "data_size": 1,
            "bit_start": 7,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "ble_scan_interval": {
            "header": "0x52",
            "data_size": 2,
            "bit_start": 15,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "ble_scan_window": {
            "header": "0x53",
            "data_size": 2,
            "bit_start": 15,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        },
        "ble_range0": {
            "header": "0x54",
            "or_80_to_write": 1,
            "port": 100,
            "ble_range0_bd_addr_oui": {
                "data_size": 9,
                "bit_start": 71,
                "bit_end": 48,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "ble_range0_bd_addr_start": {
                "data_size": 9,
                "bit_start": 47,
                "bit_end": 24,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "ble_range0_bd_addr_end": {
                "data_size": 9,
                "bit_start": 23,
                "bit_end": 0,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "ble_range1": {
            "header": "0x55",
            "or_80_to_write": 1,
            "port": 100,
            "ble_range1_bd_addr_oui": {
                "data_size": 9,
                "bit_start": 71,
                "bit_end": 48,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "ble_range1_bd_addr_start": {
                "data_size": 9,
                "bit_start": 47,
                "bit_end": 24,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "ble_range1_bd_addr_end": {
                "data_size": 9,
                "bit_start": 23,
                "bit_end": 0,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "ble_range2": {
            "header": "0x56",
            "or_80_to_write": 1,
            "port": 100,
            "ble_range2_bd_addr_oui": {
                "data_size": 9,
                "bit_start": 71,
                "bit_end": 48,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "ble_range2_bd_addr_start": {
                "data_size": 9,
                "bit_start": 47,
                "bit_end": 24,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "ble_range2_bd_addr_end": {
                "data_size": 9,
                "bit_start": 23,
                "bit_end": 0,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "ble_range3": {
            "header": "0x57",
            "or_80_to_write": 1,
            "port": 100,
            "ble_range3_bd_addr_oui": {
                "data_size": 9,
                "bit_start": 71,
                "bit_end": 48,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "ble_range3_bd_addr_start": {
                "data_size": 9,
                "bit_start": 47,
                "bit_end": 24,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "ble_range3_bd_addr_end": {
                "data_size": 9,
                "bit_start": 23,
                "bit_end": 0,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "ble_dz0": {
            "header": "0x58",
            "or_80_to_write": 1,
            "port": 100,
            "ble_dz0_bd_addr": {
                "data_size": 7,
                "bit_start": 55,
                "bit_end": 8,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "ble_dz0_rssi": {
                "data_size": 7,
                "bit_start": 7,
                "bit_end": 0,
                "type": "signed",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "ble_dz1": {
            "header": "0x59",
            "or_80_to_write": 1,
            "port": 100,
            "ble_dz1_bd_addr": {
                "data_size": 7,
                "bit_start": 55,
                "bit_end": 8,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "ble_dz1_rssi": {
                "data_size": 7,
                "bit_start": 7,
                "bit_end": 0,
                "type": "signed",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "ble_dz2": {
            "header": "0x5A",
            "or_80_to_write": 1,
            "port": 100,
            "ble_dz2_bd_addr": {
                "data_size": 7,
                "bit_start": 55,
                "bit_end": 8,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "ble_dz2_rssi": {
                "data_size": 7,
                "bit_start": 7,
                "bit_end": 0,
                "type": "signed",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "ble_dz3": {
            "header": "0x5B",
            "or_80_to_write": 1,
            "port": 100,
            "ble_dz3_bd_addr": {
                "data_size": 7,
                "bit_start": 55,
                "bit_end": 8,
                "type": "hexstring",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "ble_dz3_rssi": {
                "data_size": 7,
                "bit_start": 7,
                "bit_end": 0,
                "type": "signed",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        }
    },
    "battery_config": {
        "battery_report_options": {
            "header": "0x68",
            "or_80_to_write": 1,
            "port": 100,
            "battery_lifetime_dys_report": {
                "data_size": 1,
                "bit_start": 2,
                "bit_end": 2,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "battery_lifetime_pct_report": {
                "data_size": 1,
                "bit_start": 1,
                "bit_end": 1,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "low_battery_threshold": {
            "header": "0x69",
            "or_80_to_write": 1,
            "port": 100,
            "low_battery_threshold_type": {
                "data_size": 2,
                "bit_start": 15,
                "bit_end": 14,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "low_battery_threshold_value": {
                "data_size": 2,
                "bit_start": 13,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        },
        "low_battery_led_config": {
            "header": "0x6A",
            "or_80_to_write": 1,
            "port": 100,
            "low_battery_led_on_time": {
                "data_size": 4,
                "bit_start": 31,
                "bit_end": 24,
                "type": "unsigned",
                "round": 2,
                "coefficient": "0.01",
                "access": "RW",
                "multiple": 0
            },
            "low_battery_led_off_time": {
                "data_size": 4,
                "bit_start": 23,
                "bit_end": 16,
                "type": "unsigned",
                "round": 2,
                "coefficient": "0.01",
                "access": "RW",
                "multiple": 0
            },
            "low_battery_led_num_on_offs": {
                "data_size": 4,
                "bit_start": 15,
                "bit_end": 8,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            },
            "low_battery_led_period": {
                "data_size": 4,
                "bit_start": 7,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "RW",
                "multiple": 0
            }
        }
    },
    "general": {
        "avg_energy_trend_window": {
            "header": "0x6B",
            "data_size": 1,
            "bit_start": 7,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        }
    },
    "buzz_config": {
        "buzzer_disable_timeout": {
            "header": "0x6C",
            "data_size": 1,
            "bit_start": 7,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        }
    },
    "resp_config": {
        "resp_format": {
            "header": "0x6F",
            "data_size": 1,
            "bit_start": 7,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "RW",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        }
    },
    "cmd_ctrl": {
        "write_to_flash": {
            "header": "0x70",
            "or_80_to_write": 1,
            "port": 100,
            "write_to_flash_loramac_config": {
                "data_size": 2,
                "bit_start": 14,
                "bit_end": 14,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "W",
                "multiple": 0
            },
            "write_to_flash_app_config": {
                "data_size": 2,
                "bit_start": 13,
                "bit_end": 13,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "W",
                "multiple": 0
            },
            "restart_sensor": {
                "data_size": 2,
                "bit_start": 0,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "W",
                "multiple": 0
            }
        },
        "metadata": {
            "header": "0x71",
            "or_80_to_write": 1,
            "port": 100,
            "app_ver_major": {
                "data_size": 7,
                "bit_start": 55,
                "bit_end": 48,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "app_ver_minor": {
                "data_size": 7,
                "bit_start": 47,
                "bit_end": 40,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "app_ver_revision": {
                "data_size": 7,
                "bit_start": 39,
                "bit_end": 32,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "loramac_ver_major": {
                "data_size": 7,
                "bit_start": 31,
                "bit_end": 24,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "loramac_ver_minor": {
                "data_size": 7,
                "bit_start": 23,
                "bit_end": 16,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "loramac_ver_revision": {
                "data_size": 7,
                "bit_start": 15,
                "bit_end": 8,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "lorawan_region_id": {
                "data_size": 7,
                "bit_start": 7,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            }
        },
        "factory_reset_config": {
            "header": "0x72",
            "data_size": 1,
            "bit_start": 7,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "W",
            "multiple": 0,
            "port": 100,
            "or_80_to_write": 1
        }
    },
    "gnss_diagnostics": {
        "num_satellites": {
            "header": "0x0D 0x3C",
            "data_size": 1,
            "bit_start": 7,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "R",
            "multiple": 0,
            "port": 16,
            "or_80_to_write": 1
        },
        "avg_satellite_snr": {
            "header": "0x0D 0x64",
            "data_size": 2,
            "bit_start": 15,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": "0.1",
            "access": "R",
            "multiple": 0,
            "port": 16,
            "or_80_to_write": 1
        },
        "fix_type": {
            "header": "0x0D 0x95",
            "data_size": 1,
            "bit_start": 1,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "R",
            "multiple": 0,
            "port": 16,
            "or_80_to_write": 1
        },
        "time_to_fix": {
            "header": "0x0D 0x96",
            "data_size": 2,
            "bit_start": 15,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "R",
            "multiple": 0,
            "port": 16,
            "or_80_to_write": 1
        },
        "fix_accuracy": {
            "header": "0x0D 0x97",
            "or_80_to_write": 1,
            "port": 16,
            "gnss_vertical_accuracy": {
                "data_size": 4,
                "bit_start": 31,
                "bit_end": 16,
                "type": "unsigned",
                "round": 2,
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "gnss_horizontal_accuracy": {
                "data_size": 4,
                "bit_start": 15,
                "bit_end": 0,
                "type": "unsigned",
                "round": 2,
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            }
        },
        "ground_speed_accuracy": {
            "header": "0x0D 0x98",
            "data_size": 4,
            "bit_start": 31,
            "bit_end": 0,
            "type": "unsigned",
            "round": 3,
            "coefficient": "0.001",
            "access": "R",
            "multiple": 0,
            "port": 16,
            "or_80_to_write": 1
        },
        "num_of_fixes": {
            "header": "0x0D 0x99",
            "data_size": 1,
            "bit_start": 7,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "R",
            "multiple": 0,
            "port": 16,
            "or_80_to_write": 1
        },
        "log_num": {
            "header": "0x0D 0x0F",
            "data_size": 2,
            "bit_start": 15,
            "bit_end": 0,
            "type": "unsigned",
            "round": "",
            "coefficient": 1,
            "access": "R",
            "multiple": 0,
            "port": 16,
            "or_80_to_write": 1
        }
    },
    "gnss_log": {
        "log_request_utc_type_a": {
            "header": "0x0A",
            "or_80_to_write": 1,
            "port": 15,
            "year_0a": {
                "data_size": 5,
                "bit_start": 39,
                "bit_end": 34,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "month_0a": {
                "data_size": 5,
                "bit_start": 33,
                "bit_end": 30,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "day_0a": {
                "data_size": 5,
                "bit_start": 29,
                "bit_end": 25,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "hour_0a": {
                "data_size": 5,
                "bit_start": 24,
                "bit_end": 20,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "minute_0a": {
                "data_size": 5,
                "bit_start": 19,
                "bit_end": 14,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "second_0a": {
                "data_size": 5,
                "bit_start": 13,
                "bit_end": 8,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "number_0a": {
                "data_size": 5,
                "bit_start": 7,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            }
        },
        "log_request_utc_type_b": {
            "header": "0x0B",
            "or_80_to_write": 1,
            "port": 15,
            "number_0b": {
                "data_size": 1,
                "bit_start": 7,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            }
        },
        "log_utc": {
            "header": "0x01",
            "or_80_to_write": "",
            "port": 15,
            "fragment_number_1": {
                "data_size": 5,
                "bit_start": 39,
                "bit_end": 32,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "year_1": {
                "data_size": 5,
                "bit_start": 31,
                "bit_end": 26,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "month_1": {
                "data_size": 5,
                "bit_start": 25,
                "bit_end": 22,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "day_1": {
                "data_size": 5,
                "bit_start": 21,
                "bit_end": 17,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "hour_1": {
                "data_size": 5,
                "bit_start": 16,
                "bit_end": 12,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "minute_1": {
                "data_size": 5,
                "bit_start": 11,
                "bit_end": 6,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "second_1": {
                "data_size": 5,
                "bit_start": 5,
                "bit_end": 0,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            }
        },
        "log_coordinates": {
            "header": "0x02",
            "or_80_to_write": "",
            "port": 15,
            "fragment_number_2": {
                "data_size": 9,
                "bit_start": 71,
                "bit_end": 64,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 0
            },
            "latitude_2": {
                "data_size": 9,
                "bit_start": 63,
                "bit_end": 40,
                "type": "signed",
                "round": 7,
                "coefficient": "1.07E-05",
                "access": "R",
                "multiple": 0
            },
            "longitude_2": {
                "data_size": 9,
                "bit_start": 39,
                "bit_end": 16,
                "type": "signed",
                "round": 7,
                "coefficient": "2.15E-05",
                "access": "R",
                "multiple": 0
            },
            "altitude_2": {
                "data_size": 9,
                "bit_start": 15,
                "bit_end": 0,
                "type": "signed",
                "round": 3,
                "coefficient": "0.144958496",
                "access": "R",
                "multiple": 0
            }
        },
        "log_all": {
            "header": "0x03",
            "or_80_to_write": "",
            "port": 15,
            "year_3": {
                "data_size": 12,
                "bit_start": 95,
                "bit_end": 90,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 1
            },
            "month_3": {
                "data_size": 12,
                "bit_start": 89,
                "bit_end": 86,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 1
            },
            "day_3": {
                "data_size": 12,
                "bit_start": 85,
                "bit_end": 81,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 1
            },
            "hour_3": {
                "data_size": 12,
                "bit_start": 80,
                "bit_end": 76,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 1
            },
            "minute_3": {
                "data_size": 12,
                "bit_start": 75,
                "bit_end": 70,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 1
            },
            "second_3": {
                "data_size": 12,
                "bit_start": 69,
                "bit_end": 64,
                "type": "unsigned",
                "round": "",
                "coefficient": 1,
                "access": "R",
                "multiple": 1
            },
            "latitude_3": {
                "data_size": 12,
                "bit_start": 63,
                "bit_end": 40,
                "type": "signed",
                "round": 7,
                "coefficient": "1.07E-05",
                "access": "R",
                "multiple": 1
            },
            "longitude_3": {
                "data_size": 12,
                "bit_start": 39,
                "bit_end": 16,
                "type": "signed",
                "round": 7,
                "coefficient": "2.15E-05",
                "access": "R",
                "multiple": 1
            },
            "altitude_3": {
                "data_size": 12,
                "bit_start": 15,
                "bit_end": 0,
                "type": "signed",
                "round": 3,
                "coefficient": "0.144958496",
                "access": "R",
                "multiple": 1
            }
        }
    }
}
 var BitManipulation = {
    // a "class" that can perform bitwise operations on an unlimited amount of bits
    // a replacement for "BigInt" since "BigInt" is not backwards compatible

    // represents bits as an array of booleans

    // you have to make sure everything is always a multiple of 8 otherwise ascii
    // encoding is screwed up :(

    __make_multiple_of_8: function (bits) {
        // appends 0s to the bits until it's a multiple of 8
        while (bits.length % 8 != 0) {
            bits.unshift(false);
        }
    },

    __make_equal_number_of_bits: function (bits1, bits2) {
        if (bits1.length == bits2.length) {
            return
        }
        while (bits1.length > bits2.length) {
            bits2.unshift(false);
        }
        while (bits2.length > bits1.length) {
            bits1.unshift(false);
        }
    },

    __remove_leading_zeros: function (bits) {
        while ((bits[0] != true) && (bits.length > 1)) {
            bits.shift()
        }
    },

    __make_copy: function (bits) {
        // this function is needed since assignment in js doesn't actually make copies,
        // and I don't want any of the below functions to change the value of their arguments
        var new_bits = new Array(bits.length);
        for (var i = 0; i < bits.length; i++) {
            new_bits[i] = Boolean(bits[i]);
        }
        return new_bits;
    },

    get_bits: function (literal, type) {
        // literal is any datatype that is currently supported by this function:
        // SUPPORTS: unsigned, signed, string, hexstring, double
        var bit_arr = [];
        if (typeof (literal) == "number" && type === "unsigned") {
            if (literal == 0) {
                return [0];
            }
            while (literal > 0) {
                bit_arr.unshift(Boolean(literal % 2));
                literal = Math.floor(literal / 2);
            }

        } else if (typeof (literal) == "number" && type === "signed") {
            if (literal === 0) {
                return [0];
            }
            var negative = false;
            if (literal < 0) {
                literal = -literal
                negative = true;
            }

            while (literal > 0) {
                bit_arr.unshift(Boolean(literal % 2));
                literal = Math.floor(literal / 2);
            }

            this.__make_multiple_of_8(bit_arr)

            if (negative) {
                // turning into two's complement
                bit_arr = this.NOT(bit_arr) // bitwise not all bits
                // adding one to the negated array
                var carry = 1;
                var index = bit_arr.length - 1 // we'll be iterating backwards until index = 0 or carry = 0
                while (carry) {
                    if (bit_arr[index]) {
                        bit_arr[index] = false
                    } else {
                        bit_arr[index] = true
                        carry = 0
                    }
                    if (!index)
                        break;
                    index--
                }
            }
        } else if (typeof (literal) == "number" && type === "double") {
            var i, result = "";
            var dv = new DataView(new ArrayBuffer(8));

            dv.setFloat64(0, literal, false);

            for (i = 0; i < 8; i++) {
                var bits = dv.getUint8(i).toString(2);
                while (bits.length !== 8) {
                    bits = "0"+bits
                }
                result += bits;
            }
            bit_arr = result.split("").map(function (val){
                return val == '1';
            });
        } else if (typeof (literal) == "string" && type === "string") {
            for (var i = 0; i < literal.length; i++) {
                var char_val = literal[i].charCodeAt(0);
                var char_bits = this.get_bits(char_val, "unsigned")
                this.__make_multiple_of_8(char_bits)
                bit_arr = bit_arr.concat(char_bits);
            }
        } else if (typeof (literal) == "string" && type === "hexstring") {
            var string;
            if (literal.length % 2 === 0) {
                string = literal.split("")
            } else {
                string = ("0"+literal).split("")
            }
            var byte_array = []
            while (string.length > 0) {
                byte_array = byte_array.concat( parseInt("0x"+(string.splice(0, 2)).join("")) )
            }

            for (var i = 0; i < byte_array.length; i++){
                var byte = byte_array[i];
                var byte_bits = byte.toString(2)
                    .split("")
                    .map(function(el) { return el !== "0"; })
                this.__make_multiple_of_8(byte_bits)
                bit_arr = bit_arr.concat(byte_bits);
            }

        }

        this.__remove_leading_zeros(bit_arr);
        this.__make_multiple_of_8(bit_arr);
        return bit_arr;
    },

    init_mask: function (length, val) {
        // returns a mask of 1s or 0s, as given by the "val" argument
        if (val === undefined) {
            val = true;
        }

        var mask = new Array(length);
        for (var i = 0; i < length; i++) {
            mask[i] = val;
        }
        return mask;
    },

    to_byte_arr: function (bits, size) {
        this.__remove_leading_zeros(bits);
        this.__make_multiple_of_8(bits);

        var bytes_arr = new Array(bits.length / 8);
        for (var i = 0; i < bits.length; i += 8) {
            var byte_val = 0;

            var k = 0
            for (var j = 7; j >= 0; j--) {
                byte_val += (bits[i + j] << k);
                k += 1
            }
            bytes_arr[i / 8] = byte_val;
        }

        if (size === undefined) {
            return bytes_arr;
        }

        while (bytes_arr.length < Number(size)) {
            bytes_arr.unshift(0);
        }
        return bytes_arr;
    },

    shift_left: function (bits, shift_val) {
        var new_bits = new Array(bits.length + shift_val);
        for (var i = 0; i < bits.length; i++) {
            new_bits[i] = Boolean(bits[i]);
        }
        for (var i = bits.length; i < new_bits.length; i++) {
            new_bits[i] = false;
        }

        this.__remove_leading_zeros(new_bits);
        this.__make_multiple_of_8(new_bits);
        return new_bits;
    },

    shift_right: function (bits, shift_val) {
        var new_bits = new Array(bits.length);

        for (var j = 0; j < shift_val; j++) {
            new_bits[j] = false;
        }
        for (var i = 0; i < bits.length - shift_val; i++) {
            new_bits[i + shift_val] = Boolean(bits[i]);
        }

        this.__remove_leading_zeros(new_bits);
        this.__make_multiple_of_8(new_bits);
        return new_bits;
    },

    AND: function (bits1, bits2) {
        // returns bits1 & bits2
        var bits1_copy = this.__make_copy(bits1);
        var bits2_copy = this.__make_copy(bits2);

        this.__make_equal_number_of_bits(bits1_copy, bits2_copy);
        var new_bits = new Array(bits1_copy.length);
        for (var i = 0; i < bits1_copy.length; i++) {
            new_bits[i] = Boolean(bits1_copy[i] & bits2_copy[i]);
        }

        this.__remove_leading_zeros(new_bits);
        this.__make_multiple_of_8(new_bits);
        return new_bits;
    },

    OR: function (bits1, bits2) {
        // returns bits1 | bits2
        var bits1_copy = this.__make_copy(bits1);
        var bits2_copy = this.__make_copy(bits2);
        this.__make_equal_number_of_bits(bits1_copy, bits2_copy);
        var new_bits = new Array(bits1_copy.length);

        for (var i = 0; i < bits1_copy.length; i++) {
            new_bits[i] = Boolean(bits1_copy[i] | bits2_copy[i]);
        }

        this.__remove_leading_zeros(new_bits);
        this.__make_multiple_of_8(new_bits);

        return new_bits;
    },

    XOR: function (bits1, bits2) {
        // returns bits1 ^ bits2
        var bits1_copy = this.__make_copy(bits1);
        var bits2_copy = this.__make_copy(bits2);
        this.__make_equal_number_of_bits(bits1_copy, bits2_copy);
        var new_bits = new Array(bits1.length);

        for (var i = 0; i < bits1_copy.length; i++) {
            new_bits[i] = Boolean(bits1_copy[i] ^ bits2_copy[i]);
        }

        this.__remove_leading_zeros(new_bits);
        this.__make_multiple_of_8(new_bits);

        return new_bits;
    },

    NOT: function (bits) {
        // return !bits
        var bits_copy = this.__make_copy(bits);
        var new_bits = new Array(bits.length);
        for (var i = 0; i < bits_copy.length; i++) {
            new_bits[i] = !bits_copy[i];
        }
        return new_bits
    },
}

// polyfill for backward compatibility with ES 5 and Nashorn
if (!Object.values) {
    Object.values = function (obj) {
        return Object.keys(obj).map(function(e) {
            return obj[e]
        })
    };
}

function check_command(group_or_field, lookup) {
    // returns true if an individual command is valid, and false otherwise

    // There are 2 things we need to check:
    //    1. Access - read-only? write-only?
    //    2. Number of fields

    if (group_or_field.hasOwnProperty("read")) {
        if (lookup["access"] == "W") {
            return {status: false, error_code: 'Tried reading from write-only field'};
        }
        else if ( typeof(group_or_field["read"]) == "object" ) {
            return {status: false, error_code: 'Syntax error, read commands cannot be of type "object"'};
        }
    }
    else if (group_or_field.hasOwnProperty("write")) {
        if (lookup["access"] == "R") {
            return {status: false, error_code: 'Tried writing to read-only field'};
        }
        if (typeof(group_or_field["write"]) === "object") {
            var fields = Object.keys(group_or_field["write"]);
            if (fields.length != Object.keys(lookup).length - 3) {
                return {status: false, error_code: 'Invalid number of fields in group'};
            }
            for (var i = 0; i < fields.length; i++) {
                if (lookup[fields[i]] === undefined) {
                    return {status: false, error_code: 'Field "' + fields[i] + '" does not exist'}
                }
            }
        }

    }
    return {status: true, error_code: "No error"};
}

function is_valid(commands, sensor) {
    // returns true if commands are valid, returns false otherwise
    var valid = true;
    var categories = Object.keys(commands);
    for (var i = 0; i < categories.length; i++) {
        var category_str = categories[i];
        var category = commands[category_str];

        var groups_and_fields = Object.keys(commands[category_str]);
        for (var j = 0; j < groups_and_fields.length; j++) {
            var group_or_field_str = groups_and_fields[j];
            var group_or_field = category[group_or_field_str];

            var lookup = sensor[category_str][group_or_field_str];
            if (lookup === undefined) {
                var msg = (category_str + " -> " + group_or_field_str);
                return {valid: false, message: msg, error_code: 'Field/group "' + group_or_field_str + '" does not exist'};
            }

            valid = check_command(group_or_field, lookup);
            if (!valid["status"]) {
                var msg = (category_str + " -> " + group_or_field_str);
                return {valid: false, message: msg, error_code: valid["error_code"]};
            }
        }
    }
    return {valid: true, message: "no message", error_code: "no error code"};
}

function write_bits(write_value, start_bit, end_bit, type, current_bits) {
    // write the bits in write_value to the specified location in current_bits and returns the result as a bit array
    // Arguments:
    //      write_value [Number or String] - value to write to "current_bits"
    //      start_bit [Number] - start bit to write to
    //      end_bit [Number] - end bit to write to
    //      type [String] - apply type to the value
    //      current_bits [Bit Array] - bits to write "write_value" to
    if (current_bits === undefined) {
        current_bits = BitManipulation.get_bits(0);
    }

    var bits_to_write = BitManipulation.get_bits(write_value, type);

    var length = Number(start_bit) - Number(end_bit) + 1;
    var mask = BitManipulation.init_mask(length);

    bits_to_write = BitManipulation.AND(bits_to_write, mask);                   // AND bits_to_write with a mask of 1s
    bits_to_write = BitManipulation.shift_left(bits_to_write, end_bit);       // Shift the bits_to_write to start_bit

    current_bits = BitManipulation.OR(current_bits, bits_to_write);              // OR the bits_to_write with the current_bits

    return current_bits;
}

function format_header(header, read, or_80_to_write) {
    // takes in the header as a string, and handles the case of where the header is 2 bytes long
    var headersStr = header.split(" ")
    var headersInt = [];
    for (var i = 0; i < headersStr.length; i++) {
        var int = parseInt(headersStr[i]);
        if (!read && or_80_to_write == "1") {
            int = int | 0x80
        }
        headersInt.push(int)
    }
    return headersInt

}

function write_to_port(bytes, port, encoded_data) {
    // write "bytes" to the appropriate "port" in "encoded_data"
    if (encoded_data.hasOwnProperty(port)) {
        // try pushing "bytes" onto the appropriate port in "encoded_data"
        encoded_data[port] = encoded_data[port].concat(bytes);
    }
    else {
        // if the port doesn't exist as a key yet, create the key and push "bytes" onto it
        encoded_data[port] = bytes;
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function encode_read(lookup, encoded_data) {
    var bytes = format_header(lookup["header"], true, lookup["or_80_to_write"]);
    write_to_port(bytes, lookup["port"], encoded_data);
}

function encode_write_field(command, lookup, encoded_data) {
    var bytes = format_header(lookup["header"], false, lookup["or_80_to_write"]);

    var value = command["write"];
    if ( (lookup["type"] !== "string") && (lookup["type"] !== "hexstring") ) {
        value = Number(value) - Number(lookup["addition"] ? lookup["addition"] : 0)
        value = Number(value)/Number(lookup["coefficient"]);
        // TODO: ideally this should be done inside of write_bits, not before it
    }

    var written_bits = write_bits(
        value,
        parseInt(lookup["bit_start"]),
        parseInt(lookup["bit_end"]),
        lookup["type"],
        0
    );

    if ( (lookup["multiple"] == 0) || (lookup["multiple"] === undefined) ) {
        var size = lookup["data_size"];
    }
    else {
        var size = written_bits.length/8;
    }

    var written_bytes = BitManipulation.to_byte_arr(written_bits, size);
    bytes = bytes.concat(written_bytes);

    write_to_port(bytes, lookup["port"], encoded_data);     // Add the bytes to the appropriate port in "encoded data"
}

function encode_write_group(commands, group_lookup, encoded_data) {
    var header = group_lookup["header"];
    var bytes = format_header(header, false, group_lookup["or_80_to_write"]);

    var written_bits = BitManipulation.get_bits(0);
    var field_names = Object.keys(commands["write"])
    var values = Object.values(commands["write"]);

    var bytes_num = parseInt(group_lookup[field_names[0]]["data_size"]);
    var multiple_field_bits = [];    // A variable to contain the bits of the "multiple" field if it exists

    for (var i = 0; i < field_names.length; i++) {
        var field_name = field_names[i];
        var lookup = group_lookup[field_name];

        var value = values[i];

        if ( (lookup["type"] !== "string") && (lookup["type"] !== "hexstring") ) {
            value = Number(value) - Number(lookup["addition"] ? lookup["addition"] : 0)
            value = Number(value)/Number(lookup["coefficient"]);
            // TODO: ideally this should be done inside of write_bits, not before it
        }

        if( (lookup["multiple"] == 0) || (lookup["multiple"] === undefined) ) {
            written_bits = write_bits(
                value,
                parseInt(lookup["bit_start"]),
                parseInt(lookup["bit_end"]),
                lookup["type"],
                written_bits
            );
        }
        else {
            multiple_field_bits = BitManipulation.get_bits(value, lookup["type"]);
            bytes_num += multiple_field_bits.length/8;
        }
    }

    written_bits = written_bits.concat(multiple_field_bits);  // must add multiple_field_bits at the end

    var written_bytes = BitManipulation.to_byte_arr(written_bits, bytes_num);
    bytes = bytes.concat(written_bytes)

    write_to_port(bytes, group_lookup["port"], encoded_data);
}

function encode(commands, sensor) {
    // encodes the commands object into a nested array of bytes

    var valid = is_valid(commands, sensor);
    if (!valid["valid"]) {
        // check if commands is valid. If not, raise an error
        var message = "Commands are invalid, failed at: " + valid["message"];
        var error_code = valid["error_code"];

        return {error : message, error_code: error_code};
    }

    var lookup_all = JSON.parse(JSON.stringify(sensor));   // clones the sensor json
    var encoded_data = {};
    var categories = Object.keys(commands);
    for (var i = 0; i < categories.length; i++) {   // iterates over the categories of commands
        var command_categories = commands[categories[i]];
        var lookup_categories = lookup_all[categories[i]];

        var groups_and_fields = Object.keys(command_categories);
        for (var j = 0; j < groups_and_fields.length; j++) {    // iterates over the groups of commands
            var command = command_categories[groups_and_fields[j]];
            var lookup = lookup_categories[groups_and_fields[j]];

            // Now that we are iterating over all of the commands, the cases that we have to handle are as such:
            //  1. The read case -> handled by encode_read(...)
            //  2. The write case where the current key is a field -> handled by encode_write_field(...)
            //  3. The write case where the current key is a group -> handled by encode_write_group(...)

            // Within cases 2 and 3, there is the case of "multiple" or not "multiple". These cases are handled
            // inside of their corresponding functions

            var case_1 = command.hasOwnProperty("read");
            var case_2 = command.hasOwnProperty("write") && (typeof(command["write"]) != "object");
            var case_3 = !(case_1 || case_2);

            if (case_1) {
                encode_read(lookup, encoded_data);
            } else if (case_2) {
                encode_write_field(command, lookup, encoded_data);
            } else if (case_3) {
                encode_write_group(command, lookup, encoded_data); }


        }
    }
    return encoded_data;
}

function encodeDownlink(input) {
    var result = encode(input.data, sensor);
    var portNumber = Object.keys(result)[0];
    var bytes = result[portNumber];

    return {
        'bytes': bytes,
        'port': portNumber
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
