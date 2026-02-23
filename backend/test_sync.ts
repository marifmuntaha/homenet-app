import 'reflect-metadata'
import { Ignitor } from '@adonisjs/core/ignitor'
import { app } from '@adonisjs/core/services/app'

async function run() {
    const ignitor = new Ignitor(new URL('./', import.meta.url), {
        appKey: process.env.APP_KEY,
    })

    await ignitor.tap((app) => {
        app.booting(async () => {
            // ...
        })
    }).boot()

    const Product = (await import('#models/product')).default
    const ProductsController = (await import('#controllers/products_controller')).default

    const ctx = {
        request: {
            validateUsing: async () => ({
                name: 'Test Speed ' + Date.now(),
                price: 50000,
                downloadSpeed: 10,
                uploadSpeed: 5,
                description: 'Test Description'
            })
        },
        response: {
            created: (data: any) => console.log('CREATED:', JSON.stringify(data, null, 2)),
            conflict: (data: any) => console.log('CONFLICT:', JSON.stringify(data, null, 2))
        }
    }

    const ctrl = new ProductsController()
    await ctrl.store(ctx as any)
}

// This script is better run with node ace repl or similar
// But since I want to see the logs, I'll try to use a more direct approach if possible.
// Actually, I'll just use a simpler script that uses MikrotikService directly.
