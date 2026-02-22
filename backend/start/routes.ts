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

const AuthController = () => import('#controllers/auth_controller')
const UsersController = () => import('#controllers/users_controller')

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
  })
  .use(middleware.auth())
