// Home.jsx
import React, { useState, useEffect } from "react";
import { FiArrowRight, FiUser } from "react-icons/fi";
import axios from "../config/axios";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/projects/all");
      setProjects(Array.isArray(res.data.projects) ? res.data.projects : []);
    } catch (err) {
      console.error("Fetch projects error:", err);
      setError("Failed to fetch projects. Retrying...");
      // Retry once after 2 seconds
      setTimeout(async () => {
        try {
          const res = await axios.get("/projects/all");
          setProjects(
            Array.isArray(res.data.projects) ? res.data.projects : []
          );
          setError(null);
        } catch (retryErr) {
          console.error("Retry failed:", retryErr);
          setError("Failed to fetch projects: " + retryErr.message);
        }
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post("/projects/create", { name: projectName });
      setProjects((prev) => [...prev, res.data.project]);
      setModalOpen(false);
      setProjectName("");
    } catch (err) {
      console.error("Create project error:", err);
      setError(err.response?.data?.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (project) => {
    if (!project?._id) {
      setError("Invalid project ID");
      return;
    }
    navigate(`/project/${project._id}`, { state: { project } });
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 p-6 items-center">
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition duration-300"
        disabled={loading}
      >
        Create Project <FiArrowRight className="text-lg" />
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8 w-full max-w-6xl">
        {projects.length > 0 ? (
          projects.map((project) => (
            <div
              key={project._id}
              onClick={() => handleProjectClick(project)}
              className="p-5 bg-white rounded-2xl shadow-md hover:shadow-xl transition duration-300 cursor-pointer"
            >
              <h2 className="text-lg font-bold mb-3 truncate">
                {project.name}
              </h2>
              <div className="flex items-center gap-2 text-gray-600">
                <FiUser className="text-xl" />
                <span>{project.users?.length || 0} Users</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-600">No projects found.</p>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
