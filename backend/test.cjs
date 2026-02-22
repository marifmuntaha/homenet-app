const mysql = require('mysql2/promise');
const axios = require('axios');

async function main() {
    const conn = await mysql.createConnection({ host: '127.0.0.1', user: 'root', password: 'myu2nnmd', database: 'homenet' });
    const [rows] = await conn.query('SELECT * FROM devices LIMIT 1');
    const d = rows[0];
    console.log(`Checking ${d.host}:${d.port} as ${d.user}`);
    try {
        const res = await axios.get(`http://${d.host}:${d.port}/rest/ppp/active`, {
            auth: { username: d.user, password: d.password },
            timeout: 5000
        });
        console.log("Response Data:");
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.error("Response:", JSON.stringify(e.response.data));
    }
    process.exit(0);
}
main();
