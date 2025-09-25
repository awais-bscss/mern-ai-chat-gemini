import React, { useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { UserContext } from "../context/user.context";
import axios from "../config/axios";

const UserAuth = ({ children }) => {
  const { user, setUser } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!token) {
          setLoading(false);
          return;
        }

        if (!user) {
          const res = await axios.get("/users/profile", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache",
            },
          });
          setUser(res.data.user);
        }
        setLoading(false);
      } catch (err) {
        console.error("Auth check failed:", err);
        localStorage.removeItem("token");
        setUser(null);
        setLoading(false);
      }
    };

    checkAuth();
  }, [token, user, setUser]);

  if (loading) {
    return <h1 className="text-center mt-10">Loading...</h1>;
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default UserAuth;
