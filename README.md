# Local Community Issue Reporting Platform

A full-stack platform where residents can report local issues (like potholes, broken street lights, garbage) by uploading images, providing descriptions, selecting issue types, and marking locations on a map.

## 🚀 Features

### For Residents:
- **Issue Reporting**: Upload images, add descriptions, select issue types, and mark locations
- **Interactive Map**: View all reported issues with color-coded status markers
- **Status Tracking**: Real-time updates on issue resolution progress
- **Comments & Upvotes**: Engage with other residents on reported issues
- **Email Notifications**: Get notified when issue status changes

### For Admins:
- **Admin Dashboard**: Manage and respond to reported issues
- **Analytics Dashboard**: View charts and metrics on issue resolution
- **User Management**: View and manage resident accounts
- **Issue Assignment**: Assign issues to appropriate departments

## 🛠 Tech Stack

### Frontend:
- **React.js** - UI framework
- **Tailwind CSS** - Styling
- **Google Maps API** - Map integration
- **Axios** - API communication
- **JWT** - Authentication
- **Chart.js** - Analytics visualization
- **React Admin** - Admin dashboard

### Backend:
- **Flask** - Python web framework
- **JWT** - Authentication & authorization
- **Flask-Mail** - Email notifications
- **MySQL** - Primary database (users, issues, comments)
- **MongoDB** - Flexible data storage (logs, notifications)

## 📁 Project Structure

```
community-reporting/
├── client/                 # React frontend
│   ├── public/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── server/                 # Flask backend
│   ├── app/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── config/
│   └── requirements.txt
├── database/              # Database scripts
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- Python (v3.8+)
- MySQL
- MongoDB
- Google Maps API key

### 1. Clone and Setup

```bash
git clone <repository-url>
cd community-reporting
```

### 2. Backend Setup

```bash
cd server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Database Setup

```bash
# MySQL setup
mysql -u root -p
CREATE DATABASE community_reporting;
CREATE USER 'community_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON community_reporting.* TO 'community_user'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Environment Configuration

Create `.env` files in both `client/` and `server/` directories:

**server/.env:**
```
FLASK_APP=app
FLASK_ENV=development
SECRET_KEY=your-secret-key
MYSQL_HOST=localhost
MYSQL_USER=community_user
MYSQL_PASSWORD=your_password
MYSQL_DB=community_reporting
MONGODB_URI=mongodb://localhost:27017/community_reporting
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

**client/.env:**
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### 5. Frontend Setup

```bash
cd client
npm install
```

### 6. Run the Application

**Backend:**
```bash
cd server
flask run
```

**Frontend:**
```bash
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Issues
- `GET /api/issues` - Get all issues (with filters)
- `POST /api/issues` - Create new issue
- `GET /api/issues/<id>` - Get specific issue
- `PUT /api/issues/<id>` - Update issue
- `DELETE /api/issues/<id>` - Delete issue

### Comments & Upvotes
- `GET /api/issues/<id>/comments` - Get issue comments
- `POST /api/issues/<id>/comments` - Add comment
- `POST /api/issues/<id>/upvote` - Upvote issue

### Analytics
- `GET /api/analytics/overview` - Dashboard overview
- `GET /api/analytics/issues-by-type` - Issues by category
- `GET /api/analytics/resolution-time` - Resolution time metrics

## 🔐 Authentication & Authorization

The platform uses JWT-based authentication with role-based access:

- **Resident**: Can report issues, comment, upvote, view map
- **Admin**: Full access to admin dashboard, issue management, analytics

## 📧 Email Notifications

Residents receive email notifications for:
- Issue status updates
- Admin responses to their reports
- Welcome emails upon registration

## 🗺 Map Integration

- Google Maps API for location picking
- Interactive markers showing issue status
- Heatmap visualization for issue density
- Real-time location updates

## 📱 Features in Detail

### Issue Reporting Flow
1. User uploads image (with validation)
2. Enters description and selects issue type
3. Picks location on map
4. Submits report
5. Receives confirmation and tracking ID

### Admin Workflow
1. View incoming reports in dashboard
2. Verify and categorize issues
3. Assign to appropriate departments
4. Update status and add responses
5. Monitor resolution progress

### Analytics Dashboard
- Issue distribution by type and location
- Resolution time trends
- User engagement metrics
- Department performance tracking

## 🛡 Security Features

- JWT token authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation and sanitization
- File upload security
- Rate limiting on API endpoints

## 🧪 Testing

```bash
# Backend tests
cd server
python -m pytest

# Frontend tests
cd client
npm test
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support and questions, please open an issue in the repository. 