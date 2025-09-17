import React, { useState, useEffect } from "react";
import { FiArrowRight, FiUser } from "react-icons/fi";
import axios from "../config/axios";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projects, setProjects] = useState([]);

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    axios
      .post("/projects/create", { name: projectName })
      .then((res) => {
        setModalOpen(false);
        setProjects((prev) => [...prev, res.data.project]);
      })
      .catch((err) => {
        console.log(err);
      });
    setProjectName("");
  };

  useEffect(() => {
    axios
      .get("/projects/all")
      .then((res) => {
        setProjects(res.data.projects);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 p-6 items-center">
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition duration-300"
      >
        Create Project <FiArrowRight className="text-lg" />
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8 w-full max-w-6xl">
        {Array.isArray(projects) &&
          projects.map((project) => (
            <div
              onClick={() => navigate(`/project`, { state: { project } })}
              key={project._id}
              className="p-5 bg-white rounded-2xl shadow-md hover:shadow-xl transition duration-300 cursor-pointer"
            >
              <h2 className="text-lg font-bold mb-3 truncate">
                {project.name}
              </h2>
              <div className="flex items-center gap-2 text-gray-600">
                <FiUser className="text-xl" />
                <span>{project.users.length} Users</span>
              </div>
            </div>
          ))}
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
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
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
