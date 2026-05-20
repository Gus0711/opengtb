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
