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
const CustomerDashboardController = () => import('#controllers/customer_dashboard_controller')
const AdminDashboardController = () => import('#controllers/admin_dashboard_controller')
const OdpsController = () => import('#controllers/odps_controller')
const OntsController = () => import('#controllers/onts_controller')

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

    // ODPs CRUD
    router.get('/odps', [OdpsController, 'index'])
    router.post('/odps', [OdpsController, 'store'])
    router.put('/odps/:id', [OdpsController, 'update'])
    router.delete('/odps/:id', [OdpsController, 'destroy'])

    // ONTs (GenieACS) - CRUD Mapping
    router.get('/onts/discover', [OntsController, 'discover'])
    router.get('/onts', [OntsController, 'index'])
    router.get('/onts/:id', [OntsController, 'show'])
    router.post('/onts', [OntsController, 'store'])
    router.put('/onts/:id', [OntsController, 'update'])
    router.delete('/onts/:id', [OntsController, 'destroy'])
    // ONTs - Aksi GenieACS
    router.get('/onts/:id/info', [OntsController, 'info'])
    router.post('/onts/:id/reboot', [OntsController, 'reboot'])
    router.post('/onts/:id/set-wifi', [OntsController, 'setWifi'])
    router.post('/onts/:id/factory-reset', [OntsController, 'factoryReset'])
    router.post('/onts/:id/sync-provision', [OntsController, 'syncProvision'])

    // Devices - Mikrotik connection
    router.get('/devices/:id/status', [DevicesController, 'status'])
    router.post('/devices/:id/test', [DevicesController, 'testConnection'])
    router.get('/devices/:id/interfaces', [DevicesController, 'interfaces'])
    router.get('/devices/:id/traffic', [DevicesController, 'traffic'])

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
    router.post('/customers/:id/generate-pppoe', [CustomersController, 'generatePppoe'])

    // Dashboard
    router.get('/admin/dashboard', [AdminDashboardController, 'index'])

    // Invoices
    router.get('/invoices', [InvoicesController, 'index'])
    router.post('/invoices', [InvoicesController, 'store'])
    router.put('/invoices/:id', [InvoicesController, 'update'])
    router.post('/invoices/:id/notify', [InvoicesController, 'notify'])
    router.delete('/invoices/:id', [InvoicesController, 'destroy'])

    // New: Manual Billing Triggers
    router.post('/invoices/bulk-generate', [InvoicesController, 'bulkGenerate'])
    router.post('/customers/:id/generate-invoice', [InvoicesController, 'generateForCustomer'])
    router.post('/customers/:id/restore-service', [InvoicesController, 'restoreService'])
  })
  .use([middleware.auth(), middleware.admin()])

router
  .group(() => {
    router.post('/invoices/:id/pay', [InvoicesController, 'createPayment'])
  })
  .use(middleware.auth())

// Customer specific routes
router
  .group(() => {
    router.get('/customer/dashboard', [CustomerDashboardController, 'index'])
  })
  .use(middleware.auth())

router.post('/api/v1/callback/midtrans', [InvoicesController, 'webhook'])

// GenieACS ZTP Provisioning (public — dipanggil oleh GenieACS Extension)
router.get('/onts/provision/:serial', [OntsController, 'provision'])
router.post('/onts/provision/:serial/done', [OntsController, 'provisionDone'])
router.post('/onts/provision/:serial/wan', [OntsController, 'provisionWan'])

// trigger rebuild
