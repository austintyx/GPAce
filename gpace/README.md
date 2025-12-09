# GPAce - GPA Monitoring and Planning Application

GPAce is a full-stack web application designed to help university students monitor and plan their GPA effectively. The application provides various features that allow users to manage their courses, calculate their GPA, and explore potential grade combinations for better academic planning.

## Features

- **User Authentication**: Secure login and registration for students.
- **Dashboard**: A central hub for users to view their academic progress and GPA.
- **Course Management**: Users can view and manage their enrolled courses.
- **GPA Calculator**: A tool for calculating GPA based on user input.
- **Grade Permutations**: Generate possible grade combinations to help plan for desired GPA outcomes.
- **Document Upload**: Upload and manage documents related to courses.

## Project Structure

The project is divided into two main parts: the frontend and the backend.

### Frontend

The frontend is built using React and TypeScript, and it includes the following key components:

- **Components**: Reusable UI components such as buttons, inputs, cards, and modals.
- **Pages**: Main application pages including Dashboard, Courses, Profile, and NotFound.
- **Utilities**: Helper functions for API calls, calculations, and URL management.
- **Hooks**: Custom hooks for managing authentication and course data.

### Backend

The backend is built using Node.js and Express, and it includes:

- **Controllers**: Functions for handling authentication, course management, document uploads, and GPA calculations.
- **Routes**: API endpoints for user authentication, course management, and GPA calculations.
- **Models**: Database schemas for users, courses, modules, and documents.
- **Middleware**: Functions for authentication and error handling.

## Getting Started

### Prerequisites

- Node.js and npm installed on your machine.
- A MongoDB database (or any other database of your choice).

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd gpace
   ```

2. Install frontend dependencies:
   ```
   cd frontend
   npm install
   ```

3. Install backend dependencies:
   ```
   cd ../backend
   npm install
   ```

4. Set up environment variables:
   - Copy `.env.example` to `.env` in the backend directory and configure your database connection and other settings.

### Running the Application

1. Start the backend server:
   ```
   cd backend
   npm run dev
   ```

2. Start the frontend application:
   ```
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000` to access the application.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.