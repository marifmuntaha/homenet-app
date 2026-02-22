/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const UsersController = () => import('#controllers/users_controller')
const DevicesController = () => import('#controllers/devices_controller')
const ProductsController = () => import('#controllers/products_controller')
const CustomersController = () => import('#controllers/customers_controller')
const AuthController = () => import('#controllers/auth_controller')
const InvoicesController = () => import('#controllers/invoices_controller')

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
router.get('/', async () => {
  return {
    app: 'Homenet API',
    version: '1.0.0',
    status: 'running',
  }
})

router.get('/test-ppp', async () => {
  const Device = (await import('#models/device')).default
  const devices = await Device.all()
  const rawResults = []
  for (const d of devices) {
    try {
      const axios = (await import('axios')).default
      const res = await axios.get(`http://${d.host}:${d.port}/rest/ppp/active`, {
        auth: { username: d.user, password: d.password },
        timeout: 5000
      })
      rawResults.push({ device: d.name, data: res.data })
    } catch (e: any) {
      rawResults.push({ device: d.name, error: e.message })
    }
  }
  return rawResults
})

// Auth routes (public)
router
  .group(() => {
    router.post('/register', [AuthController, 'register'])
    router.post('/verify-otp', [AuthController, 'verifyOtp'])
    router.post('/resend-otp', [AuthController, 'resendOtp'])
    router.post('/login', [AuthController, 'login'])
    router.post('/forgot-password', [AuthController, 'forgotPassword'])
    router.post('/reset-password', [AuthController, 'resetPassword'])
  })
  .prefix('/auth')

/*
|--------------------------------------------------------------------------
| Protected Routes (require auth token)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    // Auth - me & logout
    router.get('/auth/me', [AuthController, 'me'])
    router.delete('/auth/logout', [AuthController, 'logout'])

    // Users CRUD
    router.get('/users', [UsersController, 'index'])
    router.get('/users/:id', [UsersController, 'show'])
    router.post('/users', [UsersController, 'store'])
    router.put('/users/:id', [UsersController, 'update'])
    router.delete('/users/:id', [UsersController, 'destroy'])

    // Devices CRUD
    router.get('/devices', [DevicesController, 'index'])
    router.get('/devices/:id', [DevicesController, 'show'])
    router.post('/devices', [DevicesController, 'store'])
    router.put('/devices/:id', [DevicesController, 'update'])
    router.delete('/devices/:id', [DevicesController, 'destroy'])

    // Devices - Mikrotik connection
    router.get('/devices/:id/status', [DevicesController, 'status'])
    router.post('/devices/:id/test', [DevicesController, 'testConnection'])

    // Products CRUD & Sync
    router.get('/products', [ProductsController, 'index'])
    router.post('/products', [ProductsController, 'store'])
    router.put('/products/:id', [ProductsController, 'update'])
    router.delete('/products/:id', [ProductsController, 'destroy'])
    router.post('/products/:id/sync', [ProductsController, 'sync'])

    // Customers CRUD & Subscription
    router.get('/customers/active-pppoe', [CustomersController, 'activePppoe'])
    router.get('/customers', [CustomersController, 'index'])
    router.post('/customers', [CustomersController, 'store'])
    router.put('/customers/:id', [CustomersController, 'update'])
    router.delete('/customers/:id', [CustomersController, 'destroy'])
    router.post('/customers/:id/change-product', [CustomersController, 'changeProduct'])

    // Invoices
    router.get('/invoices', [InvoicesController, 'index'])
    router.post('/invoices', [InvoicesController, 'store'])
    router.put('/invoices/:id', [InvoicesController, 'update'])
    router.delete('/invoices/:id', [InvoicesController, 'destroy'])
  })
  .use(middleware.auth())

// trigger rebuild
