import React, { useContext, useState, useEffect } from "react";
import { UserContext } from "../context/user.context";
import { useNavigate } from "react-router-dom";
import axios from "../config/axios";

const UserAuth = ({ children }) => {
  const { user, setUser } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!token) {
          navigate("/login");
          return;
        }

        if (!user) {
          const res = await axios.get("/users/profile", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setUser(res.data.user);
        }

        setLoading(false);
      } catch (err) {
        console.error("Auth check failed:", err);
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    checkAuth();
  }, [token]);

  if (loading) {
    return <h1>Loading...</h1>;
  }

  return <>{children}</>;
};

export default UserAuth;
