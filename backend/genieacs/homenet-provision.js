/**
 * GenieACS Provisioning Script: homenet-provision
 * 
 * Flow:
 * 1. Ambil Serial Number device
 * 2. Tanya Homenet API: "Ada config buat serial ini?"
 * 3. Jika ya, terapkan PPPoE & WiFi
 * 4. Lapor balik ke Homenet
 */

// 1. Ambil Serial Number (Support ZTE & MikroTik)
const serialDecl = declare("InternetGatewayDevice.DeviceInfo.SerialNumber", { value: 1 })
    || declare("Device.DeviceInfo.SerialNumber", { value: 1 })
    || declare("Device.Base.SerialNumber", { value: 1 }); // MikroTik fallback

if (!serialDecl || !serialDecl.value || !serialDecl.value[0]) {
    log("Homenet: Serial number not found");
    return;
}

const serial = String(serialDecl.value[0]);

// 2. Ambil Config dari Homenet Extension
const config = ext("homenet-api", "getProvisioning", serial);

if (!config || !config.found) {
    log("Homenet: No provisioning found for serial " + serial);
    return;
}

log("Homenet: Provisioning started for " + serial);

// 3. Terapkan PPPoE
if (config.pppoe_user && config.pppoe_password) {
    declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username",
        { value: [config.pppoe_user, "xsd:string"] });
    declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password",
        { value: [config.pppoe_password, "xsd:string"] });
}

// 4. Terapkan WiFi
if (config.wifi_ssid && config.wifi_password) {
    declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID",
        { value: [config.wifi_ssid, "xsd:string"] });
    declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase",
        { value: [config.wifi_password, "xsd:string"] });

    // Opsi tambahan agar security aktif (WPA2-PSK AES)
    declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BeaconType", { value: ["11i", "xsd:string"] });
    declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.IEEE11iEncryptionModes", { value: ["AESEncryption", "xsd:string"] });
    declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.IEEE11iAuthenticationMode", { value: ["PSKAuthentication", "xsd:string"] });
}

// 5. Lapor Selesai (Callback ke Backend)
ext("homenet-api", "reportDone", serial, serial, "provisioned");

log("Homenet: Provisioning done for " + serial);
