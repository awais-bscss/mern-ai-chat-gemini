import React, { useContext, useState } from "react";
import { UserContext } from "../context/user.context";
import { FiArrowRight } from "react-icons/fi";
import axios from "../config/axios";

const Home = () => {
  const { user } = useContext(UserContext);
  const [modalOpen, setModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    axios
      .post("/projects/create", { name: projectName })
      .then((res) => {
        setModalOpen(false);
      })
      .catch((err) => {
        console.log(err);
      });

    setProjectName("");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 p-6 items-center justify-start">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Welcome, {user?.email || "Guest"}
      </h1>

      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition"
      >
        Create Project
        <FiArrowRight className="text-lg" />
      </button>

      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Enter project name"
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
