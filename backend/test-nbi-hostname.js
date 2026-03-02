import axios from 'axios';

async function testNbiHostname() {
    const url = 'https://acs-nbi.own-server.web.id';
    const user = 'admin';
    const pass = 'admin';

    console.log(`Testing NBI at: ${url}`);
    console.log(`With User: ${user}`);

    try {
        const res = await axios.get(`${url}/devices`, {
            auth: { username: user, password: pass },
            timeout: 10000
        });
        console.log(`Success! Status: ${res.status}`);
        console.log(`Data Type: ${typeof res.data}`);
        console.log(`Data (stringified): ${JSON.stringify(res.data)}`);
        console.log(`Data Length: ${res.data ? JSON.stringify(res.data).length : 0}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
        if (err.response) {
            console.error(`Response status: ${err.response.status}`);
            console.error(`Response headers: ${JSON.stringify(err.response.headers)}`);
        }
    }
}

testNbiHostname();
