import React, { useState } from 'react';
import '../pages/DashboardPage.css';

function DashboardPage() {
  const [targetGPA, setTargetGPA] = useState(3.50);
  const courses = [
    { code: 'CS101', name: 'Introduction to Computer Science', credits: 4, grade: 'A', status: 'Completed' },
    { code: 'MATH201', name: 'Calculus II', credits: 3, grade: 'B+', status: 'Completed' },
    { code: 'PHY150', name: 'General Physics', credits: 4, grade: 'A-', status: 'Completed' },
    { code: 'HIST210', name: 'World History', credits: 3, grade: 'B', status: 'Completed' },
    { code: 'ENG102', name: 'English Literature', credits: 3, grade: 'A', status: 'Completed' },
  ];

  const currentGPA = 0.00;
  const totalCredits = 157;
  const requiredAverage = 140.88;
  const remainingCredits = 4;

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">📊</div>
          <h2>GPAce</h2>
        </div>
        <nav className="nav-menu">
          <a href="/dashboard" className="nav-item active">
            <span className="nav-icon">📊</span>
            Dashboard
          </a>
          <a href="/courses" className="nav-item">
            <span className="nav-icon">📚</span>
            My Courses
          </a>
        </nav>
        <div className="user-profile">
          <div className="profile-avatar">GP</div>
          <div className="profile-info">
            <div className="profile-name">Student</div>
            <div className="profile-link">View Profile</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <h1>Academic Dashboard</h1>
            <p>Track your progress and plan your path to graduation.</p>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">CURRENT GPA</span>
              <span className="stat-icon">🎯</span>
            </div>
            <div className="stat-value">{currentGPA.toFixed(2)}</div>
            <div className="stat-subtitle">Based on {totalCredits} credits</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">SET GOAL</span>
              <span className="stat-icon">🎯</span>
            </div>
            <div className="stat-value">{targetGPA.toFixed(2)}</div>
            <div className="stat-subtitle">Target GPA</div>
            <input 
              type="range" 
              min="2.0" 
              max="4.0" 
              step="0.01" 
              value={targetGPA}
              onChange={(e) => setTargetGPA(parseFloat(e.target.value))}
              className="gpa-slider"
            />
            <div className="slider-labels">
              <span>2.0</span>
              <span>4.0</span>
            </div>
          </div>

          <div className="stat-card alert">
            <div className="stat-header">
              <span className="stat-label">REQUIRED AVERAGE</span>
              <span className="stat-icon">📈</span>
            </div>
            <div className="stat-value">{requiredAverage.toFixed(2)}</div>
            <div className="stat-subtitle alert-text">Impossible with {remainingCredits} credits</div>
            <div className="remaining-credits">
              Remaining Credits: {remainingCredits} 💎
            </div>
          </div>
        </div>

        {/* Courses Table */}
        <div className="courses-section">
          <div className="section-header">
            <h2>Modules & Courses</h2>
            <div className="section-actions">
              <button className="btn-secondary">Remove All</button>
              <button className="btn-primary">+ Add Course</button>
            </div>
          </div>

          <div className="tabs">
            <button className="tab active">All Courses</button>
            <button className="tab">Completed</button>
            <button className="tab">Planned</button>
          </div>

          <table className="courses-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Course Name</th>
                <th>Credits</th>
                <th>Grade</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course, index) => (
                <tr key={index}>
                  <td>{course.code}</td>
                  <td>{course.name}</td>
                  <td>{course.credits}</td>
                  <td><span className="grade-badge">{course.grade}</span></td>
                  <td><span className="status-badge completed">{course.status}</span></td>
                  <td>
                    <button className="icon-btn">✏️</button>
                    <button className="icon-btn">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Import Data Section */}
        <aside className="import-section">
          <h3>Import Data</h3>
          <div className="upload-box">
            <div className="upload-icon">⬆️</div>
            <h4>Upload Transcript or Outline</h4>
            <p>Upload a PDF or image of your academic record to automatically import your courses and grades.</p>
            <button className="btn-primary">Select Document</button>
          </div>
          <div className="how-it-works">
            <h4>How it works</h4>
            <ul>
              <li>Upload your course outline or transcript PDF.</li>
              <li>We automatically extract course codes, credits, and grades.</li>
              <li>Set your goal GPA to see what grades you need to achieve it.</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default DashboardPage;
