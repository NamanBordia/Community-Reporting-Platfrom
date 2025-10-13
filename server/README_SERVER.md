# Flask Server Setup Guide

## Quick Start

### 1. Start the Flask Server
```bash
cd server
python run.py
```

You should see output like:
```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```

### 2. Test Server Connection
In a new terminal:
```bash
cd server
python test_server_status.py
```

### 3. Access the Application
- **React App**: http://localhost:3000
- **Admin Login**: http://localhost:3000/admin-login
- **Admin Dashboard**: http://localhost:3000/admin
- **Analytics**: http://localhost:3000/analytics

## Troubleshooting

### If you get "Port already in use" error:
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### If you get database connection errors:
1. Make sure MySQL is running
2. Check database credentials in `app/__init__.py`
3. Run database setup: `python setup_db.py`

### If analytics charts don't load:
1. Install Chart.js dependencies in client folder:
   ```bash
   cd client
   npm install chart.js react-chartjs-2
   ```
2. Restart React development server:
   ```bash
   npm start
   ```

## Admin Login Credentials
- **Username**: `adminuser`
- **Password**: `YourSecurePassword`

## Server Status Check
Run this to test if server is working:
```bash
python test_server_status.py
``` 