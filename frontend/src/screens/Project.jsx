import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { FaUserGroup } from "react-icons/fa6";
import { FiSend } from "react-icons/fi";
import { MdOutlineClose } from "react-icons/md";
import { FaUser } from "react-icons/fa";
import { IoMdPersonAdd } from "react-icons/io";
import { useEffect } from "react";
import axios from "../config/axios";
const Project = () => {
  const location = useLocation();
  const { project } = location.state || {};

  const [groupPanelOpen, setGroupPanelOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [Users, setUsers] = useState([]);
  const [projectId, setProjectId] = useState(project);

  useEffect(() => {
    axios
      .get(`/projects/get-project/${project._id}`)
      .then((response) => {
        setProjectId(response.data.project);
      })
      .catch((error) => {
        console.error(error);
      });

    const fetchUsers = async () => {
      try {
        const response = await axios.get("/users/all");
        setUsers(response.data.users);
      } catch (error) {
        console.error(error);
      }
    };
    fetchUsers();
  }, [project._id]);

  // toggle user select/unselect
  const toggleUserSelection = (_id) => {
    if (selectedUsers.includes(_id)) {
      setSelectedUsers(selectedUsers.filter((userId) => userId !== _id));
    } else {
      setSelectedUsers([...selectedUsers, _id]);
    }
  };

  const handleAddCollaborator = async () => {
    try {
      const response = await axios.put("/projects/add-user", {
        projectId: project._id, // projectId backend pe expect hai
        users: selectedUsers, // backend "users" expect karta hai, na ke "userIds"
      });
      console.log(response.data);
      setModalOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  if (!project) return <p>Project not found</p>;
  return (
    <main className="h-screen w-screen bg-red-300 flex">
      {/* Left Section */}
      <section className="h-screen w-[30%] bg-gray-300 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="flex w-full justify-between p-4 bg-gray-600 items-center">
          <button
            onClick={() => setModalOpen(true)}
            className="bg-slate-400 rounded-full p-1 px-3 cursor-pointer flex items-center justify-center ml-2 text-sm text-white"
          >
            <IoMdPersonAdd className="mr-2" />
            Add collaborator
          </button>
          <button
            onClick={() => setGroupPanelOpen(!groupPanelOpen)}
            className="bg-slate-400 rounded-full p-2 cursor-pointer text-white"
          >
            <FaUserGroup />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="w-fit max-w-[80%]">
              <div className="bg-white p-2 rounded-md text-sm">
                <span className="block text-xs text-gray-500 mb-1">
                  user1@email.com
                </span>
                Hello Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Quasi
              </div>
            </div>

            <div className="w-fit ml-auto max-w-[80%]">
              <div className="bg-blue-400 p-2 rounded-md text-sm text-white">
                <span className="block text-xs text-gray-200 mb-1">
                  you@email.com
                </span>
                Hi there!
              </div>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-2 bg-gray-400 flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter your message"
            className="flex-1 p-2 rounded-md outline-none"
          />
          <button className="bg-blue-600 text-white p-2 rounded-md">
            <FiSend />
          </button>
        </div>

        {/* Slide Panel */}
        <div
          className={`sidepanel h-full w-96 bg-gray-900 absolute top-0 left-0 transform transition-transform duration-300 ${
            groupPanelOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <header
            onClick={() => setGroupPanelOpen(false)}
            className="flex w-full justify-between p-4 bg-gray-600 text-2xl cursor-pointer"
          >
            <h4 className="text-white text-[18px]">Collaborators</h4>
            <MdOutlineClose />
          </header>
          <div className="users flex flex-col p-4 gap-3">
            {projectId?.users?.map((user, index) => (
              <div
                key={user._id || user.email || index}
                className="flex items-center gap-3 p-2 bg-blue-700 rounded-lg cursor-pointer hover:bg-blue-900 transition"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-700">
                  <FaUser size={20} />
                </div>
                <p className="text-white text-sm font-medium">{user.email}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Right Section */}
      <section className="h-screen w-[70%] bg-gray-800"></section>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white w-[500px] rounded-lg shadow-lg p-6 relative">
            {/* Close Btn */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-black"
            >
              <MdOutlineClose size={24} />
            </button>

            {/* Title */}
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Add Collaborators
            </h2>

            {/* Users List */}
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              {Users.map((user) => (
                <div
                  key={user._id}
                  onClick={() => toggleUserSelection(user._id)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
                    selectedUsers.includes(user._id)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedUsers.includes(user._id)
                        ? "bg-white text-blue-600"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    <FaUser size={18} />
                  </div>
                  <p className="text-sm">{user.email}</p>
                </div>
              ))}
            </div>

            {/* Add Btn */}
            <button
              onClick={() => {
                handleAddCollaborator();
                setModalOpen(false);
              }}
              className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Add Collaborator
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default Project;
