import axios from 'axios'
import env from './start/env.js'

async function testNbi() {
    const url = process.env.GENIEACS_NBI_URL || 'https://acs-nbi.own-server.web.id'
    const user = process.env.GENIEACS_NBI_USER || 'admin'
    const pass = process.env.GENIEACS_NBI_PASS || 'admin'

    console.log(`Testing NBI at: ${url}`)
    console.log(`With User: ${user}`)

    try {
        const res = await axios.get(`${url}/devices`, {
            auth: { username: user, password: pass },
            timeout: 10000
        })
        console.log(`Success! Status: ${res.status}`)
        console.log(`Devices count: ${Array.isArray(res.data) ? res.data.length : 'Not an array'}`)
        if (res.data.length > 0) {
            console.log('First device sample:', JSON.stringify(res.data[0]).substring(0, 200))
        }
    } catch (err: any) {
        console.error(`Error: ${err.message}`)
        if (err.response) {
            console.error(`Response status: ${err.response.status}`)
            console.error(`Response data: ${JSON.stringify(err.response.data)}`)
        }
    }
}

testNbi()
