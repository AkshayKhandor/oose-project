# Digital Restaurant & Billing System

A complete MERN stack web application for restaurant management, point-of-sale, and billing.

## Features
- **Authentication**: Secure login for Admin/Staff using JWT.
- **Menu Management**: Add, edit, and delete food items with categories.
- **Point of Sale (POS)**: Easy-to-use interface to add items to cart, adjust quantities, and calculate taxes.
- **Billing**: Generates bills and offers a print/PDF feature.
- **Dashboard**: Overview of total revenue, orders, and recent transactions.

## Architecture

- **Frontend**: Built with React.js (Vite) and Tailwind CSS for a modern, responsive UI. Uses React Router for navigation and Axios for API requests.
- **Backend**: Node.js and Express.js REST API.
- **Database**: MongoDB (Mongoose ODM).

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- MongoDB (Running locally or an Atlas connection string)

### 1. Database Setup
1. Ensure MongoDB is running locally on `mongodb://127.0.0.1:27017`
2. Or, you can update the `MONGO_URI` in `backend/.env` to point to your MongoDB Atlas cluster.

### 2. Backend Setup
1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies (already installed if you ran the initial setup):
   ```bash
   npm install
   ```
3. Start the server (runs on port 5000):
   ```bash
   npm run dev
   # OR
   node src/server.js
   ```

### 3. Frontend Setup
1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies (already installed if you ran the initial setup):
   ```bash
   npm install
   ```
3. Start the Vite development server (runs on port 3000):
   ```bash
   npm run dev
   ```

### 4. Creating the First Admin User
You can use an API client like Postman or `curl` to create the initial admin user.
```bash
curl -X POST http://localhost:5000/api/auth/register \
-H "Content-Type: application/json" \
-d '{"name":"Admin User","email":"admin@resto.com","password":"password123","role":"admin"}'
```
After running this, you can log in at `http://localhost:3000/login` with `admin@resto.com` and `password123`.

## API Endpoints

### Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

### Menu
- `GET /api/menu`
- `POST /api/menu`
- `PUT /api/menu/:id`
- `DELETE /api/menu/:id`

### Orders
- `GET /api/orders`
- `POST /api/orders`
- `GET /api/orders/:id`
- `PUT /api/orders/:id/status`
- `GET /api/orders/dashboard/summary`
