// Project.jsx
import React, { useState, useEffect, useContext, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { FaUserGroup, FaUser } from "react-icons/fa6";
import { FiSend, FiX } from "react-icons/fi";
import { MdOutlineClose } from "react-icons/md";
import { IoMdPersonAdd } from "react-icons/io";
import axios from "../config/axios";
import { UserContext } from "../context/user.context";
import Markdown from "markdown-to-jsx";
import { initializeSocket, sendMessage } from "../config/socket";
import {
  getWebContainerInstance,
  destroyWebContainerInstance,
} from "../config/webContainer";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    console.error("ErrorBoundary caught:", error, error.stack);
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 bg-red-600 text-white text-center">
          <h2 className="text-lg font-bold">Something went wrong</h2>
          <p>{this.state.error.message}</p>
          <button
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Project = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { project } = location.state || {};
  const [groupPanelOpen, setGroupPanelOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectData, setProjectData] = useState(project || null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [webContainer, setWebContainer] = useState(null);
  const [iframeURL, setIframeURL] = useState(null);
  const [currentProcess, setCurrentProcess] = useState(null);
  const [customRoute, setCustomRoute] = useState("");
  const [routeError, setRouteError] = useState(null);
  const [consoleOutput, setConsoleOutput] = useState("");

  const { user } = useContext(UserContext);
  const messagesEndRef = useRef(null);
  const webContainerRef = useRef(null);
  const iframeRef = useRef(null);
  const consoleOutputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToConsoleBottom = () => {
    consoleOutputRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const updateFileContent = (id, newContent) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, content: newContent } : f))
    );
  };

  const closeActiveFile = () => {
    setActiveFile(null);
  };

  const permanentCloseFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (activeFile === id) {
      setActiveFile(null);
    }
  };

  const resetFiles = () => {
    setFiles([]);
    setActiveFile(null);
    setIframeURL(null);
    setRunError(null);
    setRouteError(null);
    setConsoleOutput("");
    if (currentProcess) {
      currentProcess
        .kill()
        .catch((err) => console.warn("Failed to kill process:", err));
      setCurrentProcess(null);
    }
  };

  useEffect(() => {
    if (!projectId) {
      setFetchError("Invalid project ID. Redirecting to home...");
      setTimeout(() => navigate("/"), 2000);
      return;
    }

    setIsLoading(true);
    axios
      .get(`/projects/get-project/${projectId}`)
      .then((response) => {
        setProjectData(response.data.project);
        setMessages(response.data.project.messages || []);
        setFiles(
          (response.data.project.currentFiles || []).map((f, i) => ({
            ...f,
            id: Date.now() + i,
          }))
        );
        setFetchError(null);
      })
      .catch((error) => {
        console.error("Error fetching project:", error);
        const status = error.response?.status;
        let errorMessage = "Failed to load project";
        if (status === 401) {
          errorMessage = "Unauthorized: Please log in again.";
          setTimeout(() => navigate("/login"), 2000);
        } else if (status === 403) {
          errorMessage =
            "Access denied: You are not a collaborator on this project.";
        } else if (status === 404) {
          errorMessage = "Project not found.";
          setTimeout(() => navigate("/"), 2000);
        } else {
          errorMessage = `Server error: ${error.message}`;
          setTimeout(() => navigate("/"), 2000);
        }
        setFetchError(errorMessage);
      })
      .finally(() => setIsLoading(false));

    axios
      .get("/users/all")
      .then((res) => setUsers(res.data.users || []))
      .catch((error) => console.error("Error fetching users:", error));
  }, [projectId, navigate]);

  useEffect(() => {
    const initWebContainer = async () => {
      if (webContainerRef.current) {
        console.log("Using cached WebContainer instance");
        setWebContainer(webContainerRef.current);
        return;
      }

      try {
        const wc = await getWebContainerInstance();
        console.log("WebContainer initialized successfully");
        setWebContainer(wc);
        webContainerRef.current = wc;
        setRunError(null);
      } catch (error) {
        console.error("Failed to initialize WebContainer:", error);
        setRunError(
          `Failed to initialize WebContainer: ${error.message}. Ensure only one browser tab is open and try reloading.`
        );
      }
    };
    initWebContainer();

    return () => {
      console.log("Cleaning up WebContainer on unmount");
      destroyWebContainerInstance();
    };
  }, []);

  useEffect(() => {
    if (!webContainer) return;

    const onServerReady = (port, url) => {
      const baseURL = url.split("/").slice(0, 3).join("/");
      const newIframeURL = customRoute ? `${baseURL}${customRoute}` : baseURL;
      setIframeURL(newIframeURL);
      setRunLoading(false);
      setRunError(null);
      setRouteError(null);
      console.log(`Server ready at ${newIframeURL}`);
    };

    const onError = (error) => {
      console.error("WebContainer error:", error);
      setRunLoading(false);
      setRunError(`WebContainer error: ${error.message}`);
    };

    const serverReadyCleanup = webContainer.on("server-ready", onServerReady);
    const errorCleanup = webContainer.on("error", onError);

    return () => {
      if (webContainer) {
        console.log("Removing WebContainer event listeners");
        serverReadyCleanup();
        errorCleanup();
      }
    };
  }, [webContainer, customRoute]);

  useEffect(() => {
    if (!projectId) return;

    const socket = initializeSocket(projectId);

    const handleMessage = (data) => {
      if (data && data.message) {
        const isAI =
          typeof data.sender === "object" && data.sender._id === "ai";
        let displayMessage = data.message;

        console.log("Received AI Message:", data);

        if (isAI && data.message?.files) {
          const incomingFiles = Array.isArray(data.message.files)
            ? data.message.files
            : [];
          const language = data.message.language || "javascript";
          console.log("Extracted Files:", incomingFiles, "Language:", language);

          if (incomingFiles.length > 0) {
            const requiredFiles = {
              javascript: ["package.json", "server.js"],
              cpp: ["main.cpp", "run.sh"],
              python: ["main.py", "run.sh"],
            }[language];

            if (
              requiredFiles &&
              !requiredFiles.every((name) =>
                incomingFiles.some((f) => f.name === name)
              )
            ) {
              console.warn(
                `AI response missing required files for ${language}`
              );
              incomingFiles.push(...getDefaultFiles(language));
            }

            const newFiles = incomingFiles.map((newFile, index) => {
              const existingFile = files.find((f) => f.name === newFile.name);
              const uniqueId = existingFile
                ? existingFile.id
                : Date.now() + index;
              return {
                id: uniqueId,
                name: newFile.name,
                content: newFile.content,
                language,
              };
            });

            setFiles((prevFiles) => {
              const updatedFiles = prevFiles.filter(
                (f) => !incomingFiles.some((nf) => nf.name === f.name)
              );
              return [...updatedFiles, ...newFiles];
            });

            if (!activeFile && newFiles[0]?.id) {
              setActiveFile(newFiles[0].id);
            }
          } else {
            console.warn("No valid files array received:", data.message.files);
            setRunError("AI response did not include valid files.");
          }
          displayMessage = {
            theory: data.message.theory,
            example: data.message.example,
            error: data.message.error,
            language,
          };
        } else if (isAI && !data.message?.files && data.message?.error) {
          console.warn("AI error:", data.message.error);
          setRunError(`AI error: ${data.message.error}`);
        } else if (isAI && !data.message?.files) {
          console.warn("No files in AI response:", data.message);
          setRunError("AI response did not include files for execution.");
        }

        setMessages((prev) => [...prev, { ...data, message: displayMessage }]);
      }
    };

    socket.on("event-message", handleMessage);

    return () => {
      socket.off("event-message", handleMessage);
      socket?.disconnect();
    };
  }, [projectId, activeFile, files]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    scrollToConsoleBottom();
  }, [consoleOutput]);

  useEffect(() => {
    if (!projectId) return;

    const timeoutId = setTimeout(() => {
      axios
        .put("/projects/update-files", {
          projectId,
          files: files.map(({ id, ...f }) => f),
        })
        .catch((error) => {
          console.error("Failed to update files:", error);
          setRunError("Failed to save files: " + error.message);
        });
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [files, projectId]);

  const getDefaultFiles = (language) => {
    if (language === "javascript") {
      return [
        {
          name: "package.json",
          content: JSON.stringify({
            name: "project",
            version: "1.0.0",
            scripts: { start: "node server.js" },
            dependencies: { express: "^4.18.2" },
          }),
        },
        {
          name: "server.js",
          content: `const express = require('express');\nconst app = express();\nconst port = process.env.PORT || 3000;\napp.use((req, res, next) => { res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' https://*.local-corp.webcontainer-api.io; style-src 'self' 'unsafe-inline';"); next(); });\napp.use(express.json());\napp.get('/', (req, res) => res.send('<div style="color: white; background: #1a1a1a; padding: 20px;">Welcome to the Express Server</div>'));\napp.use((req, res) => res.status(404).send('<div style="color: white; background: #1a1a1a; padding: 20px;">404 Not Found</div>'));\napp.listen(port, () => console.log(\`Server running on port \${port}\`));`,
        },
      ];
    } else if (language === "cpp") {
      return [
        {
          name: "main.cpp",
          content: `#include <iostream>\nint main() {\n    std::cout << "Hello from C++!" << std::endl;\n    return 0;\n}`,
        },
        {
          name: "run.sh",
          content: `#!/bin/sh\ng++ main.cpp -o main && ./main`,
        },
      ];
    } else if (language === "python") {
      return [
        {
          name: "main.py",
          content: `print("Hello from Python!")`,
        },
        {
          name: "run.sh",
          content: `#!/bin/sh\npython3 main.py`,
        },
      ];
    }
    return [];
  };

  const handleRun = async () => {
    if (!webContainer) {
      setRunError("WebContainer not initialized");
      return;
    }

    if (files.length === 0) {
      setRunError("No files to run");
      return;
    }

    const language = files[0]?.language || "javascript";
    setRunLoading(true);
    setRunError(null);
    setRouteError(null);
    setConsoleOutput("");

    try {
      if (currentProcess) {
        try {
          await currentProcess.kill();
          console.log("Previous process killed");
        } catch (error) {
          console.warn("Failed to kill previous process:", error);
        }
        setCurrentProcess(null);
        setIframeURL(null);
      }

      const filesTree = {};
      files.forEach((f) => {
        filesTree[f.name] = {
          file: {
            contents: f.content,
          },
        };
      });

      await webContainer.mount(filesTree);

      if (language === "javascript") {
        const hasPackageJson = files.some(
          (file) => file.name === "package.json"
        );
        if (!hasPackageJson) {
          throw new Error("Missing package.json file for Node.js project.");
        }

        const installProcess = await webContainer.spawn("npm", ["install"]);
        let installError = "";
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              installError += data;
              console.log("npm install output:", data);
              setConsoleOutput((prev) => prev + data);
            },
          })
        );
        const installExitCode = await installProcess.exit;
        if (installExitCode !== 0) {
          throw new Error(`npm install failed: ${installError}`);
        }

        const startProcess = await webContainer.spawn("npm", ["run", "start"]);
        let startError = "";
        startProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              startError += data;
              console.log("npm start output:", data);
              setConsoleOutput((prev) => prev + data);
            },
          })
        );
        setCurrentProcess(startProcess);
      } else if (language === "cpp" || language === "python") {
        const hasRunScript = files.some((file) => file.name === "run.sh");
        if (!hasRunScript) {
          throw new Error(`Missing run.sh script for ${language} project.`);
        }

        const runProcess = await webContainer.spawn("sh", ["run.sh"]);
        let runOutput = "";
        runProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              runOutput += data;
              setConsoleOutput((prev) => prev + data);
              console.log(`${language} run output:`, data);
            },
          })
        );
        const runExitCode = await runProcess.exit;
        if (runExitCode !== 0) {
          throw new Error(
            `${language} execution failed: ${runOutput}. Check run.sh output for details or verify WebContainer environment.`
          );
        }
        setRunLoading(false);
      } else {
        throw new Error(`Unsupported language: ${language}`);
      }
    } catch (error) {
      console.error("Error running code:", error);
      setRunError(`Failed to run code: ${error.message}`);
      setRunLoading(false);
    }
  };

  const handleCustomRouteChange = (e) => {
    let route = e.target.value.trim();
    if (route && !route.startsWith("/")) {
      route = `/${route}`;
    }
    route = route.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
    setCustomRoute(route);
    setRouteError(null);

    if (iframeURL && files[0]?.language === "javascript") {
      const baseURL = iframeURL.split("/").slice(0, 3).join("/");
      const newIframeURL = `${baseURL}${route}`;
      console.log("Updating iframe URL to:", newIframeURL);
      setIframeURL(newIframeURL);
      fetch(newIframeURL, { mode: "cors" }).catch((error) => {
        console.error("Route fetch error:", error);
        setRouteError(
          "Failed to load route. Ensure the route exists on the server or check the console for details."
        );
      });
    }
  };

  const handleRouteSubmit = (e) => {
    if (e.key === "Enter" && files[0]?.language === "javascript") {
      if (!iframeURL) {
        setRouteError("Please run the server first");
        return;
      }
      const baseURL = iframeURL.split("/").slice(0, 3).join("/");
      const route = customRoute || "/";
      const newIframeURL = `${baseURL}${route}`;
      console.log("Submitting iframe URL:", newIframeURL);
      setIframeURL(newIframeURL);
      setRouteError(null);

      fetch(newIframeURL, { mode: "cors" }).catch((error) => {
        console.error("Route fetch error:", error);
        setRouteError(
          "Failed to load route. Ensure the route exists on the server or check the console for details."
        );
      });
    }
  };

  const send = () => {
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
  };

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
      axios
        .get(`/projects/get-project/${projectId}`)
        .then((response) => {
          setProjectData(response.data.project);
        })
        .catch((error) => console.error("Error refreshing project:", error));
    } catch (error) {
      console.error("Error adding collaborator:", error);
      setRunError(`Failed to add collaborator: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (fetchError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 mb-4">{fetchError}</p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <p className="text-center text-gray-600">Loading project...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <main className="h-screen w-screen bg-gray-100 flex">
        <section className="h-screen w-[30%] bg-gray-200 flex flex-col relative overflow-hidden">
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
                    }${
                      msg.message?.language
                        ? `\n\nLanguage: ${msg.message.language}`
                        : ""
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

          <div className="p-2 bg-gray-400 flex items-center gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              type="text"
              placeholder="Enter your message (e.g., @ai create an express server with a /register route)"
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

        <section className="h-screen w-[70%] bg-gray-800 p-4 flex">
          <aside className="w-[20%] bg-gray-700 p-4 overflow-y-auto">
            <h4 className="text-white text-lg mb-4">Files</h4>
            <div className="flex flex-col gap-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between"
                >
                  <button
                    onClick={() => setActiveFile(file.id)}
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

          <div className="flex-1 flex flex-col">
            <header className="flex items-center justify-between p-2 bg-gray-900 border-b border-gray-700">
              <span className="text-white font-medium">
                {activeFile
                  ? files.find((f) => f.id === activeFile)?.name
                  : files[0]?.language === "javascript"
                  ? "Preview"
                  : "Console Output"}
              </span>
              <div className="flex items-center gap-2">
                {files[0]?.language === "javascript" && (
                  <input
                    type="text"
                    value={customRoute}
                    onChange={handleCustomRouteChange}
                    onKeyDown={handleRouteSubmit}
                    placeholder="Enter route (e.g., /register)"
                    className="bg-gray-700 text-white p-1 rounded w-64"
                    disabled={!webContainer || runLoading}
                  />
                )}
                <button
                  onClick={handleRun}
                  className={`bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition ${
                    runLoading || !files.length
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  disabled={runLoading || !files.length}
                >
                  {runLoading ? "Running..." : "Run"}
                </button>
                <button
                  onClick={resetFiles}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                >
                  Reset Files
                </button>
                {activeFile && (
                  <button
                    onClick={closeActiveFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FiX size={18} />
                  </button>
                )}
              </div>
            </header>

            {(runError || routeError) && (
              <div className="bg-red-600 text-white p-2 text-sm">
                {runError || routeError}
              </div>
            )}

            <div className="flex-1 flex">
              <div className="w-1/2 bg-gray-900 p-4 overflow-y-auto">
                {files.map(
                  (file) =>
                    activeFile === file.id && (
                      <textarea
                        key={file.id}
                        value={file.content || "No content available"}
                        onChange={(e) =>
                          updateFileContent(file.id, e.target.value)
                        }
                        className="w-full h-full bg-transparent text-green-400 font-mono text-sm outline-none resize-none whitespace-pre-wrap"
                        placeholder="Edit file content here..."
                      />
                    )
                )}
                {!activeFile && (
                  <p className="text-gray-400 text-center">
                    Select a file to edit
                  </p>
                )}
              </div>

              <div className="w-1/2 bg-white">
                {files[0]?.language === "javascript" ? (
                  iframeURL ? (
                    <iframe
                      ref={iframeRef}
                      src={iframeURL}
                      className="w-full h-full border-none"
                      title="Preview"
                      allow="cross-origin-isolated"
                      onError={(e) => {
                        console.error("Iframe loading error:", e);
                        setRouteError(
                          "Failed to load route. Check if the route exists on the server or inspect the console for details."
                        );
                      }}
                      onLoad={() => {
                        setRouteError(null);
                      }}
                    />
                  ) : (
                    <p className="text-gray-700 text-center mt-10">
                      Click Run to preview
                    </p>
                  )
                ) : (
                  <div className="w-full h-full bg-gray-900 text-green-400 font-mono text-sm p-4 overflow-y-auto">
                    <h4 className="text-white mb-2">Console Output</h4>
                    <pre>{consoleOutput || "Click Run to see output"}</pre>
                    <div ref={consoleOutputRef} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

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
                {isLoading ? "Adding..." : "Add Collaborator"}
              </button>
            </div>
          </div>
        )}
      </main>
    </ErrorBoundary>
  );
};

export default Project;
