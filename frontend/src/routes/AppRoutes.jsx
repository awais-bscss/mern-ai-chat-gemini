// AppRoutes.jsx
import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "../screens/Login";
import Register from "../screens/Register";
import Home from "../screens/Home";
import Project from "../screens/Project";
import UserAuth from "../auth/UserAuth";

const NotFound = () => (
  <div className="h-screen flex flex-col items-center justify-center bg-gray-100 text-center">
    <h1 className="text-4xl font-bold text-red-600">404 - Page Not Found</h1>
    <p className="mt-4 text-lg">The requested page does not exist.</p>
    <a
      href="/"
      className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    >
      Back to Home
    </a>
  </div>
);

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <UserAuth>
              <Home />
            </UserAuth>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/project/:projectId"
          element={
            <UserAuth>
              <Project />
            </UserAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
