import axios from 'axios';
import fs from 'fs';

async function testNbiDetail() {
    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        const nbiUrlMatch = envContent.match(/GENIEACS_NBI_URL=(.+)/);
        const nbiUserMatch = envContent.match(/GENIEACS_NBI_USER=(.+)/);
        const nbiPassMatch = envContent.match(/GENIEACS_NBI_PASS=(.+)/);

        const url = nbiUrlMatch ? nbiUrlMatch[1].trim() : '';
        const user = nbiUserMatch ? nbiUserMatch[1].trim() : '';
        const pass = nbiPassMatch ? nbiPassMatch[1].trim() : '';

        console.log(`Testing NBI at: ${url}`);

        const res = await axios.get(`${url}/devices`, {
            auth: { username: user, password: pass },
            timeout: 10000
        });

        console.log(`Status: ${res.status}`);
        console.log(`Data type: ${typeof res.data}`);
        console.log(`Is Array: ${Array.isArray(res.data)}`);
        console.log(`Body length: ${JSON.stringify(res.data).length}`);
        console.log(`Body (first 200 chars): ${JSON.stringify(res.data).substring(0, 200)}`);
    } catch (err) {
        console.error('Error occurred:');
        console.error(err.message);
        if (err.response) {
            console.error(`Response status: ${err.response.status}`);
        }
    }
}

testNbiDetail();
