/**
 * @file Layout.jsx
 * @description Layout component that defines the main structure of the FindMySchool app.
 * It includes the header and navigation bar that are persistent throughout the app.
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Navbar from './Navbar';

/**
 * Layout component that serves as the base layout for all app pages.
 * Renders the Header, Navbar, and the nested route content via React Router's <Outlet />.
 * @component
 * @returns {JSX.Element} The rendered layout structure of the app.
 */
function Layout() {
  return (
    <div>
      <Header />
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;