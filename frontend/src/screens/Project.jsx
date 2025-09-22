import React, { useState, useEffect, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import { FaUserGroup, FaUser } from "react-icons/fa6";
import { FiSend, FiX } from "react-icons/fi"; // FiX for close
import { MdOutlineClose } from "react-icons/md";
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
  const [isLoading, setIsLoading] = useState(false);

  // Right panel states
  const [files, setFiles] = useState([]); // [{name: "App.js", content:"...", id: uniqueId}]
  const [activeFile, setActiveFile] = useState(null);

  const { user } = useContext(UserContext);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Update file content
  const updateFileContent = (id, newContent) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, content: newContent } : f))
    );
  };

  // Close active file
  const closeActiveFile = () => {
    setActiveFile(null);
  };

  // Permanent close file from list
  const permanentCloseFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (activeFile === id) {
      setActiveFile(null);
    }
  };

  // 🔹 Fetch project + users
  useEffect(() => {
    if (!projectId) return;

    setIsLoading(true);
    axios
      .get(`/projects/get-project/${projectId}`)
      .then((response) => {
        setProjectData(response.data.project);
        setProjectId(response.data.project._id);
      })
      .catch((error) => {
        console.error("Error fetching project:", error);
      })
      .finally(() => setIsLoading(false));

    axios
      .get("/users/all")
      .then((res) => setUsers(res.data.users))
      .catch((error) => console.error("Error fetching users:", error));
  }, [projectId]);

  // 🔹 Socket handling
  useEffect(() => {
    if (!projectId) return;

    const socket = initializeSocket(projectId);

    const handleMessage = (data) => {
      if (data && data.message) {
        const isAI =
          typeof data.sender === "object" && data.sender._id === "ai";
        let displayMessage = data.message;

        console.log("Received AI Message:", data); // Debug log

        // Separate files for right panel
        if (isAI && data.message?.files) {
          const incomingFiles = Array.isArray(data.message.files)
            ? data.message.files
            : [];
          console.log("Extracted Files:", incomingFiles); // Debug files
          if (incomingFiles.length > 0) {
            setFiles((prevFiles) => {
              const newFiles = incomingFiles.map((newFile, index) => {
                const existingFile = prevFiles.find(
                  (f) => f.name === newFile.name
                );
                const uniqueId = existingFile
                  ? existingFile.id
                  : Date.now() + index; // Unique ID
                return {
                  id: uniqueId,
                  name: newFile.name,
                  content: newFile.content,
                };
              });
              // Replace or add, avoid duplicates by name
              const updatedFiles = prevFiles.filter(
                (f) => !incomingFiles.some((nf) => nf.name === f.name)
              );
              return [...updatedFiles, ...newFiles];
            });
            if (!activeFile) {
              setActiveFile(incomingFiles[0].name); // Set first file as active
            }
          } else {
            console.warn("No valid files array received:", data.message.files);
          }
          // Only show theory and example in chat
          displayMessage = {
            theory: data.message.theory,
            example: data.message.example,
            error: data.message.error,
          };
        } else if (isAI && !data.message?.files && data.message?.error) {
          console.warn("AI error:", data.message.error);
        } else if (isAI && !data.message?.files) {
          console.warn("No files in AI response:", data.message);
        }

        setMessages((prev) => [...prev, { ...data, message: displayMessage }]);
      }
    };

    socket.on("event-message", handleMessage);

    return () => {
      socket.off("event-message", handleMessage);
      socket?.disconnect();
    };
  }, [projectId, activeFile]);

  // 🔹 Auto scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 🔹 Monitor files state change
  useEffect(() => {
    console.log("Updated Files State:", files); // Debug files state
  }, [files]);

  // 🔹 Send message
  function send() {
    if (!message.trim() || !projectId || isLoading) return;
    setIsLoading(true);
    const newMsg = {
      message,
      projectId,
      sender: user?._id,
    };
    sendMessage("event-message", newMsg);
    setMessage("");
    setIsLoading(false);
  }

  const toggleUserSelection = (_id) => {
    setSelectedUsers((prev) =>
      prev.includes(_id) ? prev.filter((id) => id !== _id) : [...prev, _id]
    );
  };

  const handleAddCollaborator = async () => {
    try {
      setIsLoading(true);
      await axios.put("/projects/add-user", {
        projectId,
        users: selectedUsers,
      });
      setModalOpen(false);
    } catch (error) {
      console.error("Error adding collaborator:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!projectId)
    return <p className="text-center mt-10">⚠ Project not found</p>;

  return (
    <main className="h-screen w-screen bg-gray-100 flex">
      {/* Left Section (Chat + Users) */}
      <section className="h-screen w-[30%] bg-gray-200 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="flex w-full justify-between p-4 bg-gray-600 items-center">
          <button
            onClick={() => setModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 rounded-full p-2 px-3 cursor-pointer flex items-center text-sm text-white transition"
            disabled={isLoading}
          >
            <IoMdPersonAdd className="mr-2" />
            Add collaborator
          </button>
          <button
            onClick={() => setGroupPanelOpen(!groupPanelOpen)}
            className="bg-blue-500 hover:bg-blue-600 rounded-full p-2 cursor-pointer text-white transition"
            disabled={isLoading}
          >
            <FaUserGroup />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-4">
            {messages.map((msg, i) => {
              const senderId =
                typeof msg?.sender === "object"
                  ? msg?.sender?._id
                  : msg?.sender;
              const senderEmail =
                typeof msg?.sender === "object"
                  ? msg?.sender?.email
                  : "Unknown";
              const isOwn = senderId === user?._id;
              const isAI = senderId === "ai";

              let text = "";
              if (isAI) {
                if (msg.message.error) {
                  text = `Error: ${msg.message.error}`;
                } else {
                  text = `${msg.message?.theory || ""}\n\n${
                    msg.message?.example || ""
                  }`;
                }
              } else {
                text =
                  typeof msg?.message === "string"
                    ? msg?.message
                    : msg?.message?.content || "";
              }

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
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {!isAI && (
                      <span className="block text-xs text-gray-900 mb-1">
                        {senderEmail}
                      </span>
                    )}
                    {isAI ? (
                      <Markdown
                        options={{
                          forceBlock: true,
                          overrides: { p: { component: "div" } },
                        }}
                      >
                        {text || "No content available"}
                      </Markdown>
                    ) : (
                      <span>{text || "No content available"}</span>
                    )}
                  </div>
                </div>
              );
            })}
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
            disabled={isLoading}
          />
          <button
            className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition"
            onClick={send}
            disabled={isLoading}
          >
            <FiSend />
          </button>
        </div>

        {/* Slide Panel (Collaborators) */}
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

      {/* Right Section (Files from AI) */}
      <section className="h-screen w-[70%] bg-gray-800 p-4 flex">
        {/* Side List (File List with Permanent Close) */}
        <aside className="w-[20%] bg-gray-700 p-4 overflow-y-auto">
          <h4 className="text-white text-lg mb-4">Files</h4>
          <div className="flex flex-col gap-2">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between">
                <button
                  onClick={() => setActiveFile(file.id)} // Use id for activeFile
                  className={`text-left w-full px-2 py-1 rounded ${
                    activeFile === file.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-600 text-gray-200"
                  }`}
                >
                  {file.name}
                </button>
                <button
                  onClick={() => permanentCloseFile(file.id)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  <FiX size={16} />
                </button>
              </div>
            ))}
            {files.length === 0 && <p className="text-gray-400">No files</p>}
          </div>
        </aside>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar for Active File */}
          {activeFile && (
            <header className="flex items-center justify-between p-2 bg-gray-900 border-b border-gray-700">
              <span className="text-white font-medium">
                {files.find((f) => f.id === activeFile)?.name}
              </span>
              <button
                onClick={closeActiveFile}
                className="text-red-500 hover:text-red-700"
              >
                <FiX size={18} />
              </button>
            </header>
          )}

          {/* File Content - Editable */}
          <div className="flex-1 bg-gray-900 p-4 overflow-y-auto">
            {files.map(
              (file) =>
                activeFile === file.id && (
                  <textarea
                    key={file.id} // Use unique id for key
                    value={file.content || "No content available"}
                    onChange={(e) => updateFileContent(file.id, e.target.value)}
                    className="w-full h-full bg-transparent text-green-400 font-mono text-sm outline-none resize-none whitespace-pre-wrap"
                    placeholder="Edit file content here..."
                  />
                )
            )}
            {!activeFile && (
              <p className="text-gray-400 text-center">Select a file to edit</p>
            )}
          </div>
        </div>
      </section>

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
              disabled={isLoading}
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
