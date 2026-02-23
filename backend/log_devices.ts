import Device from '#models/device'

async function run() {
    const devices = await Device.all()
    console.log('DEVICES:', JSON.stringify(devices, null, 2))
    process.exit(0)
}

run()
