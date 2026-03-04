/**
 * GenieACS Provisioning Script: homenet-provision
 *
 * Mendukung: ZTE F663NV3A dan F609 V9
 * Namespace: InternetGatewayDevice (TR-098)
 *
 * Flow:
 *   1. Ambil serial number
 *   2. Ambil config PPPoE + WiFi dari backend
 *   3. Declare WANPPPConnection + credentials
 *   4. Declare WiFi settings
 *   5. Lapor selesai
 */

// ─── 1. Serial Number ────────────────────────────────────────────────────────

const serialDecl = declare("InternetGatewayDevice.DeviceInfo.SerialNumber", { value: 1 });

if (!serialDecl || !serialDecl.value || !serialDecl.value[0]) {
    log("Homenet: Serial not found, abort.");
    return;
}

const serial = String(serialDecl.value[0]).trim();
if (!serial || serial === "undefined" || serial === "null") {
    log("Homenet: Invalid serial: " + serial);
    return;
}

// Ambil GenieACS device ID (format: OUI-ProductClass-SerialNumber, contoh: 8299A8-F609-ZICGC18299A8)
const deviceIdDecl = declare("DeviceID.ID", { value: 1 });
const genieDeviceId = (deviceIdDecl && deviceIdDecl.value && deviceIdDecl.value[0])
    ? String(deviceIdDecl.value[0]).trim()
    : serial; // fallback ke serial jika tidak tersedia

const productClassDecl = declare("DeviceID.ProductClass", { value: 1 });
const productClass = (productClassDecl && productClassDecl.value && productClassDecl.value[0])
    ? String(productClassDecl.value[0]).trim()
    : "UNKNOWN";

log("Homenet: Inform serial=" + serial + " deviceId=" + genieDeviceId + " model=" + productClass);

// ─── 2. Ambil Config dari Backend ────────────────────────────────────────────

const config = ext("homenet-api", "getProvisioning", serial);

if (!config || !config.found) {
    log("Homenet: No config for serial=" + serial
        + (config && config.reason ? " reason=" + config.reason : "")
        + (config && config.error ? " err=" + config.error : ""));
    return;
}

if (!config.pppoe_user || !config.pppoe_password) {
    log("Homenet: PPPoE creds missing for serial=" + serial);
    return;
}

log("Homenet: Config OK user=" + config.pppoe_user);

// ─── 3. WAN3 (PPPoE — VLAN 102) ──────────────────────────────────────────────
//
// WAN1 = System (Index 1) - JANGAN DISENTUH
// WAN2 = TR-069 (Index 2, VLAN 101) - JANGAN DISENTUH
// WAN3 = PPPoE (Index 3, VLAN 102) ← Target PPPoE kita
//
// Jika belum ada, GenieACS akan otomatis AddObject.

declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Enable", { value: [true, "xsd:boolean"] });
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.ConnectionType", { value: ["IP_Routed", "xsd:string"] });
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username", { value: [config.pppoe_user, "xsd:string"] });
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Password", { value: [config.pppoe_password, "xsd:string"] });

// Set VLAN 102 for WAN3
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.X_CT-COM_WANEponLinkConfig.Mode", { value: [2, "xsd:unsignedInt"] }); // 2 = Tag Mode
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.X_CT-COM_WANEponLinkConfig.VLANIDMark", { value: [102, "xsd:unsignedInt"] });

log("Homenet: WAN3 PPPoE (VLAN 102) declared for user=" + config.pppoe_user);

// ─── 4. WAN4 (Bridge — VLAN 103) & SSID2 ─────────────────────────────────────
//
// WAN4 = Bridge (Index 4, VLAN 103) ← Target Bridge kita
// Terbinding ke SSID2, SSID Name: HOME-NET, Auth: Open

// Create/Update Bridge WAN on Index 4
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANIPConnection.1.Enable", { value: [true, "xsd:boolean"] });
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANIPConnection.1.ConnectionType", { value: ["Bridge", "xsd:string"] });

// Set VLAN 103 for WAN4
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.X_CT-COM_WANEponLinkConfig.Mode", { value: [2, "xsd:unsignedInt"] });
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.X_CT-COM_WANEponLinkConfig.VLANIDMark", { value: [103, "xsd:unsignedInt"] });

// Binding ke SSID2
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.X_CT-COM_WANEponLinkConfig.PortBinding", { value: ["SSID2", "xsd:string"] });

// Config SSID2 (HOME-NET)
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Enable", { value: [true, "xsd:boolean"] });
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID", { value: ["HOME-NET", "xsd:string"] });
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.BeaconType", { value: ["None", "xsd:string"] }); // None = Open System

log("Homenet: WAN4 Bridge (VLAN 103) + SSID2 (HOME-NET) declared");

// ─── 5. WiFi 2.4GHz (Main SSID) ──────────────────────────────────────────────

if (config.wifi_ssid && config.wifi_password) {
    declare(
        "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable",
        { value: [true, "xsd:boolean"] }
    );
    declare(
        "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID",
        { value: [config.wifi_ssid, "xsd:string"] }
    );
    declare(
        "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BeaconType",
        { value: ["11i", "xsd:string"] }
    );
    declare(
        "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.IEEE11iEncryptionModes",
        { value: ["AESEncryption", "xsd:string"] }
    );
    declare(
        "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.IEEE11iAuthenticationMode",
        { value: ["PSKAuthentication", "xsd:string"] }
    );
    declare(
        "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase",
        { value: [config.wifi_password, "xsd:string"] }
    );
    log("Homenet: WiFi declared SSID=" + config.wifi_ssid);
}

// ─── 6. Lapor Selesai ────────────────────────────────────────────────────────

// Lapor selesai — kirim genieDeviceId (OUI-ProductClass-Serial) bukan hanya serial
ext("homenet-api", "reportDone", serial, genieDeviceId, "provisioned");
log("Homenet: Done serial=" + serial + " deviceId=" + genieDeviceId);

// ─── 7. Paksa Baca Data Optik setiap Inform ──────────────────────────────────
// declare dengan { value: 1 } = GET parameter dari ONT → tersimpan di GenieACS cache
// Coba banyak variasi nama param karena firmware ZTE F609 V9 beda-beda

// Variasi 1: X_CT-COM_WANEponLinkConfig (Umum di F609/F660)
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANEponLinkConfig.RxOpticalPower", { value: 1 });
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANEponLinkConfig.TxOpticalPower", { value: 1 });
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANEponLinkConfig.OnuTemperature", { value: 1 });
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANEponLinkConfig.RxPower", { value: 1 });
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANEponLinkConfig.TxPower", { value: 1 });
declare("InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_CT-COM_WANEponLinkConfig.Temperature", { value: 1 });

// Variasi 2: WANEponInterfaceConfig (Standar TR-069 ZTE V9)
declare("InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.Stats.RxOpticalPower", { value: 1 });
declare("InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.Stats.TxOpticalPower", { value: 1 });
declare("InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.Stats.OnuTemperature", { value: 1 });
declare("InternetGatewayDevice.WANDevice.1.WANEponInterfaceConfig.Stats.Temperature", { value: 1 });

// Variasi 3: WANPONInterfaceConfig (GPON Variant)
declare("InternetGatewayDevice.WANDevice.1.WANPONInterfaceConfig.Stats.RxPower", { value: 1 });
declare("InternetGatewayDevice.WANDevice.1.WANPONInterfaceConfig.Stats.TxPower", { value: 1 });

declare("InternetGatewayDevice.DeviceInfo.UpTime", { value: 1 });

