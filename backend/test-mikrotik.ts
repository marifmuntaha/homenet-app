import { Ignite } from '@adonisjs/core/env'
import app from '@adonisjs/core/services/app'

async function run() {
  const { Ignitor } = await import('@adonisjs/core')
  const ignitor = new Ignitor(new URL('./', import.meta.url))
  await ignitor.boot()
  
  const Device = (await import('#models/device')).default
  const MikrotikService = (await import('#services/mikrotik_service')).default
  
  const devices = await Device.all()
  console.log('Devices found:', devices.length)
  for (const d of devices) {
    console.log(`Checking device: ${d.name} (${d.host})`)
    const svc = MikrotikService.fromDevice(d)
    
    // manual check
    try {
        const axios = (await import('axios')).default
        const url = `http://${d.host}:${d.port}/rest/ppp/active`
        console.log('Hitting:', url)
        const res = await axios.get(url, {
            auth: { username: d.user, password: d.password },
            timeout: 5000
        })
        console.log('Data type:', typeof res.data)
        console.log('Is array?', Array.isArray(res.data))
        console.log('Length:', res.data?.length)
        if (Array.isArray(res.data) && res.data.length > 0) {
            console.log('Sample item keys:', Object.keys(res.data[0]))
            console.log('Sample item name:', res.data[0].name)
            console.log('Full first item:', JSON.stringify(res.data[0], null, 2))
        } else {
            console.log('Raw data:', JSON.stringify(res.data).substring(0, 200))
        }
    } catch (err: any) {
        console.log('Error hitting Mikrotik:', err.message)
    }
  }
}

run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) });
