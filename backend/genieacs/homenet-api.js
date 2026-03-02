"use strict";

const https = require("https");
const http = require("http");

/**
 * GenieACS Extension: homenet-api
 * Path: /usr/lib/node_modules/genieacs/config/ext/homenet-api.js
 * 
 * Pola callback wajib untuk GenieACS Extension agar sinkron dengan script engine.
 */

const HOMENET_BACKEND_URL = "https://backend-dev.own-server.web.id";
const TIMEOUT = 2500;

function request(method, url, body, callback) {
    const isHttps = url.startsWith("https");
    const lib = isHttps ? https : http;
    const urlObj = new URL(url);

    console.log(`[Homenet] ${method} Request: ${url}`);

    const options = {
        method: method,
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        headers: {
            "Accept": "application/json"
        }
    };

    if (body) {
        options.headers["Content-Type"] = "application/json";
        options.headers["Content-Length"] = Buffer.byteLength(body);
        console.log(`[Homenet] Body: ${body}`);
    }

    let callbackCalled = false;
    const done = (err, data) => {
        if (callbackCalled) return;
        callbackCalled = true;
        callback(err, data);
    };

    const req = lib.request(options, (res) => {
        let data = "";
        console.log(`[Homenet] Response Status: ${res.statusCode}`);
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
            if (res.statusCode >= 400) {
                console.error(`[Homenet] Error HTTP ${res.statusCode}: ${data}`);
                return done(new Error("HTTP " + res.statusCode));
            }
            try {
                const parsed = JSON.parse(data);
                console.log(`[Homenet] Success: ${JSON.stringify(parsed).substring(0, 100)}...`);
                done(null, parsed);
            } catch (e) {
                console.error(`[Homenet] Parse Error: ${data.substring(0, 100)}`);
                done(new Error("Invalid JSON"));
            }
        });
    });

    req.on("error", (err) => {
        console.error(`[Homenet] Request Error: ${err.message}`);
        done(err);
    });
    req.on("timeout", () => {
        console.error(`[Homenet] Timeout reached (${TIMEOUT}ms)`);
        req.destroy();
        done(new Error("Timeout"));
    });
    req.setTimeout(TIMEOUT);

    if (body) req.write(body);
    req.end();
}

/**
 * GET konfigurasi dari Homenet
 */
/**
 * GET konfigurasi dari Homenet
 */
exports.getProvisioning = function () {
    const args = Array.prototype.slice.call(arguments);
    let callback = args.find(arg => typeof arg === "function");

    // Ambil argumen pertama yang bukan function
    let serial = args.find(arg => typeof arg !== "function");

    if (serial) {
        serial = String(serial).trim();
        // Handle case where it's still a comma separated string
        if (serial.indexOf(",") !== -1) {
            serial = serial.split(",")[0].trim();
        }
    }

    console.log(`[Homenet] --- getProvisioning start for "${serial}" ---`);
    if (!serial || serial === "undefined" || serial === "null") {
        console.error("[Homenet] Critical: Serial is invalid in getProvisioning.");
        if (callback) callback(null, { found: false, error: "serial_invalid" });
        return;
    }

    const url = HOMENET_BACKEND_URL + "/onts/provision/" + encodeURIComponent(serial);
    request("GET", url, null, (err, data) => {
        if (callback) {
            if (err) {
                console.log(`[Homenet] getProvisioning failed: ${err.message}`);
                return callback(null, { found: false, error: err.message });
            }
            callback(null, data);
        }
    });
};

/**
 * POST laporan selesai ke Homenet
 */
exports.reportDone = function () {
    const args = Array.prototype.slice.call(arguments);
    let callback = args.find(arg => typeof arg === "function");
    let dataParts = [];

    // Ambil semua argumen yang bukan function
    args.forEach(arg => {
        if (typeof arg !== "function" && arg !== undefined && arg !== null) {
            const s = String(arg).trim();
            if (s.indexOf(",") !== -1) {
                dataParts = dataParts.concat(s.split(",").map(p => p.trim()));
            } else {
                dataParts.push(s);
            }
        }
    });

    const serial = dataParts[0];
    const deviceId = dataParts[1] || serial;
    const status = dataParts[2] || "provisioned";

    console.log(`[Homenet] --- reportDone start for "${serial}" (ID: ${deviceId}, Status: ${status}) ---`);

    if (!serial || serial === "undefined" || serial === "null") {
        console.error("[Homenet] Critical: Serial is invalid in reportDone, skipping request.");
        if (callback) callback(null, { success: false, error: "serial_invalid" });
        return;
    }

    const url = HOMENET_BACKEND_URL + "/onts/provision/" + encodeURIComponent(serial) + "/done";
    const body = JSON.stringify({
        genieacs_device_id: deviceId,
        status: status
    });

    request("POST", url, body, (err, data) => {
        if (callback) {
            if (err) return callback(null, { success: false, error: err.message });
            callback(null, data);
        }
    });
};
