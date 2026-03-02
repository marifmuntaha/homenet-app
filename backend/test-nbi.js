import axios from 'axios';
import fs from 'fs';

async function testNbi() {
    const envContent = fs.readFileSync('.env', 'utf8');
    const nbiUrlMatch = envContent.match(/GENIEACS_NBI_URL=(.+)/);
    const nbiUserMatch = envContent.match(/GENIEACS_NBI_USER=(.+)/);
    const nbiPassMatch = envContent.match(/GENIEACS_NBI_PASS=(.+)/);

    const url = nbiUrlMatch ? nbiUrlMatch[1].trim() : 'https://acs-nbi.own-server.web.id';
    const user = nbiUserMatch ? nbiUserMatch[1].trim() : 'admin';
    const pass = nbiPassMatch ? nbiPassMatch[1].trim() : 'admin';

    console.log(`Testing NBI at: ${url}`);
    console.log(`With User: ${user}`);

    try {
        const res = await axios.get(`${url}/devices`, {
            auth: { username: user, password: pass },
            timeout: 10000
        });
        console.log(`Success! Status: ${res.status}`);
        console.log(`Devices type: ${typeof res.data}`);
        console.log(`Is Array: ${Array.isArray(res.data)}`);
        console.log(`Data length: ${Array.isArray(res.data) ? res.data.length : (res.data ? JSON.stringify(res.data).length : 0)}`);

        if (Array.isArray(res.data) && res.data.length > 0) {
            console.log('First device serial:', res.data[0]._deviceId?._SerialNumber);
        } else {
            console.log('Raw data sample:', JSON.stringify(res.data).substring(0, 200));
        }
    } catch (err) {
        console.error(`Error: ${err.message}`);
        if (err.response) {
            console.error(`Response status: ${err.response.status}`);
            console.error(`Response data: ${JSON.stringify(err.response.data)}`);
        }
    }
}

testNbi();
