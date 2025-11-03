# Timelit App

A comprehensive productivity and time management application built with React and Node.js.

This app provides calendar management, task tracking, mood monitoring, and AI-powered assistance for better productivity.

## Running the app

```bash
npm install
npm run dev
```

## Building the app

```bash
npm run build
```

## Features

- 📅 Calendar management with event scheduling
- ✅ Task tracking with priority and due dates
- 🎯 Pomodoro timer for focused work sessions
- 😊 Mood tracking and analytics
- 🤖 AI-powered assistance and insights
- 📱 Responsive design for all devices
- 🔐 Secure authentication with JWT
- 📧 Email notifications and reminders

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Radix UI components
- React Router
- React Query

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- OpenAI integration

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd timelit-app
```

2. Install frontend dependencies
```bash
npm install
```

3. Install backend dependencies
```bash
cd server
npm install
```

4. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Start MongoDB and update connection string in server/.env

6. Start the development servers
```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
npm run dev
```

The app will be available at `http://localhost:5173` and the API at `http://localhost:5000`.

## Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb://localhost:27017/timelit
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OPENAI_API_KEY=your_openai_api_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
PORT=5000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

This project is licensed under the ISC License.