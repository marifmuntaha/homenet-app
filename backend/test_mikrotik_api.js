import axios from 'axios';

async function test() {
    const host = '103.139.192.150';
    const port = 8088;
    const user = 'marifmuntaha';
    const password = 'Masadepan100';

    const baseUrl = `http://${host}:${port}/rest`;
    const auth = { username: user, password };
    const profileName = 'Test-Profile-1771769653061'; // Use the ID from previous success if possible or a known name

    try {
        console.log(`Testing Profile Fetch (GET) for ${profileName} at ${baseUrl}...`);
        const res = await axios.get(`${baseUrl}/ppp/profile?name=${profileName}`, {
            auth,
            timeout: 10000
        });
        console.log('GET RESPONSE:', JSON.stringify(res.data, null, 2));

        if (Array.isArray(res.data) && res.data.length > 0) {
            console.log('SUCCESS: Profile found.');
        } else {
            console.log('WARNING: Profile NOT found with "?name=" query.');

            console.log('Listing all profiles to check property names...');
            const allRes = await axios.get(`${baseUrl}/ppp/profile`, { auth, timeout: 10000 });
            const found = allRes.data.find(p => p.name === profileName);
            if (found) {
                console.log('FOUND MANUALLY in full list:', found);
            } else {
                console.log('NOT FOUND in full list either.');
            }
        }
    } catch (error) {
        if (error.response) {
            console.error('ERROR (Status ' + error.response.status + '):', error.response.data);
        } else {
            console.error('ERROR (No Response):', error.message);
        }
    }
}

test();
