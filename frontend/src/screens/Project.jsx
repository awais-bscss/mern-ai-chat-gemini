import React, { useState, useEffect, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import { FaUserGroup } from "react-icons/fa6";
import { FiSend } from "react-icons/fi";
import { MdOutlineClose } from "react-icons/md";
import { FaUser } from "react-icons/fa";
import { IoMdPersonAdd } from "react-icons/io";
import axios from "../config/axios";
import { UserContext } from "../context/user.context";
import Markdown from "markdown-to-jsx";
import {
  initializeSocket,
  receiveMessage,
  sendMessage,
} from "../config/socket";

const Project = () => {
  const location = useLocation();
  const { project } = location.state || {};

  const [groupPanelOpen, setGroupPanelOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectData, setProjectData] = useState(project || null);
  const [projectId, setProjectId] = useState(project?._id || "");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const { user } = useContext(UserContext);

  // ✅ Scroll ref
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Project aur users fetch
  useEffect(() => {
    if (!projectId) return;

    axios
      .get(`/projects/get-project/${projectId}`)
      .then((response) => {
        setProjectData(response.data.project);
        setProjectId(response.data.project._id);
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
  }, [projectId]);

  // Socket connection
  useEffect(() => {
    if (!projectId) return;

    const socket = initializeSocket(projectId);

    receiveMessage("event-message", (data) => {
      console.log("📥 Received:", data);
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [projectId]);

  // ✅ Auto scroll bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function send() {
    if (message.trim() === "" || !projectId) return;
    const newMsg = {
      message,
      projectId,
      sender: user._id,
    };
    sendMessage("event-message", newMsg);
    setMessage("");
  }

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
        projectId,
        users: selectedUsers,
      });
      console.log(response.data);
      setModalOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  if (!projectId) return <p>Project not found</p>;

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
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-4">
            {messages.map((msg, i) => {
              const senderId = msg?.sender?._id || "";
              const isOwn = senderId === user?._id;
              const isAI = senderId === "ai";

              return (
                <div
                  key={i}
                  className={`w-fit max-w-[80%] ${isOwn ? "ml-auto" : ""}`}
                >
                  <div
                    className={`p-3 rounded-2xl text-sm shadow-md ${
                      isOwn
                        ? "bg-blue-500 text-white"
                        : isAI
                        ? "bg-gray-900 text-green-200 border border-gray-700"
                        : "bg-white text-black"
                    }`}
                    style={{
                      overflowWrap: "break-word",
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {/* Normal user sender info */}
                    {!isAI && (
                      <span className="block text-xs text-gray-700 mb-1">
                        {msg?.sender?.email || "Unknown"}
                      </span>
                    )}

                    {/* AI Message (Markdown rendered) */}
                    {isAI ? (
                      <Markdown
                        options={{
                          forceBlock: true,
                          overrides: {
                            a: {
                              props: {
                                target: "_blank",
                                rel: "noopener noreferrer",
                                className: "text-blue-400 underline",
                              },
                            },
                            code: {
                              props: {
                                className:
                                  "bg-gray-800 text-green-400 px-2 py-1 rounded text-xs font-mono block overflow-x-auto max-w-full",
                              },
                            },
                          },
                        }}
                      >
                        {msg?.message || ""}
                      </Markdown>
                    ) : (
                      <span>{msg?.message || ""}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Auto-scroll ref */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="p-2 bg-gray-400 flex items-center gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            type="text"
            placeholder="Enter your message"
            className="flex-1 p-2 rounded-md outline-none"
          />
          <button
            className="bg-blue-600 text-white p-2 rounded-md"
            onClick={send}
          >
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
            {projectData?.users?.map((u, index) => (
              <div
                key={u._id || u.email || index}
                className="flex items-center gap-3 p-2 bg-blue-700 rounded-lg cursor-pointer hover:bg-blue-900 transition"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-700">
                  <FaUser size={20} />
                </div>
                <p className="text-white text-sm font-medium">{u.email}</p>
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
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-black"
            >
              <MdOutlineClose size={24} />
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Add Collaborators
            </h2>
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              {users.map((u) => (
                <div
                  key={u._id}
                  onClick={() => toggleUserSelection(u._id)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
                    selectedUsers.includes(u._id)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedUsers.includes(u._id)
                        ? "bg-white text-blue-600"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    <FaUser size={18} />
                  </div>
                  <p className="text-sm">{u.email}</p>
                </div>
              ))}
            </div>
            <button
              onClick={handleAddCollaborator}
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
