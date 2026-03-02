#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  Script instalasi GenieACS Provisioning untuk Homenet
#  Jalankan DARI KOMPUTER LOKAL: bash install.sh
#  (Bukan dari server GenieACS)
# ═══════════════════════════════════════════════════════════════════

GENIEACS_NBI="https://acs-nbi.own-server.web.id"
NBI_USER="admin"
NBI_PASS="admin"
PROVISION_NAME="homenet-provision"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Konfigurasi SSH ke server GenieACS (untuk copy file ext)
# Isi sesuai server Anda:
GENIEACS_SSH_HOST=""        # Contoh: 12.34.56.78
GENIEACS_SSH_USER=""        # Contoh: root
GENIEACS_EXT_DIR="/usr/lib/node_modules/genieacs/config/ext"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Instalasi GenieACS Provision Homenet"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Upload Provision Script via NBI ─────────────────────────────
echo "📤 Mengupload provision script '$PROVISION_NAME'..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PUT "$GENIEACS_NBI/provisions/$PROVISION_NAME" \
    -u "$NBI_USER:$NBI_PASS" \
    -H "Content-Type: application/javascript" \
    --data-binary "@$SCRIPT_DIR/homenet-provision.js")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "✅ Provision script berhasil diupload (HTTP $HTTP_CODE)"
else
    echo "❌ Gagal upload provision script (HTTP $HTTP_CODE)"
    exit 1
fi

# ── Buat Preset via NBI ─────────────────────────────────────────
echo "📋 Membuat preset 'homenet-ztp'..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PUT "$GENIEACS_NBI/presets/homenet-ztp" \
    -u "$NBI_USER:$NBI_PASS" \
    -H "Content-Type: application/json" \
    -d '{"_id":"homenet-ztp","weight":100,"precondition":"true","provisions":[["homenet-provision"]]}')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "✅ Preset 'homenet-ztp' berhasil dibuat"
else
    echo "⚠️  Preset gagal via API (HTTP $HTTP_CODE), buat manual di UI."
fi

# ── Copy Extension ke Server GenieACS ───────────────────────────
echo ""
if [ -n "$GENIEACS_SSH_HOST" ] && [ -n "$GENIEACS_SSH_USER" ]; then
    echo "📂 Membuat folder ext dan meng-copy homenet-api.js ke server..."
    ssh "$GENIEACS_SSH_USER@$GENIEACS_SSH_HOST" "mkdir -p $GENIEACS_EXT_DIR"
    scp "$SCRIPT_DIR/homenet-api.js" "$GENIEACS_SSH_USER@$GENIEACS_SSH_HOST:$GENIEACS_EXT_DIR/"
    echo "🔄 Restart GenieACS..."
    ssh "$GENIEACS_SSH_USER@$GENIEACS_SSH_HOST" "systemctl restart genieacs-cwmp genieacs-nbi 2>/dev/null || pm2 restart all 2>/dev/null || true"
    echo "✅ Extension terpasang dan GenieACS di-restart"
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ⚠️  Langkah manual: copy Extension ke server GenieACS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Jalankan perintah berikut di server GenieACS:"
    echo ""
    echo "  mkdir -p $GENIEACS_EXT_DIR"
    echo ""
    echo "Lalu copy file homenet-api.js ke:"
    echo "  $GENIEACS_EXT_DIR/homenet-api.js"
    echo ""
    echo "Kemudian restart GenieACS:"
    echo "  systemctl restart genieacs-cwmp genieacs-nbi"
    echo "  # atau jika pakai PM2:"
    echo "  pm2 restart all"
fi

echo ""
echo "✅ Selesai!"
