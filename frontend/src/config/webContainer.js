// webContainer.js
import { WebContainer } from "@webcontainer/api";

let webContainerInstance = null;
let booting = null;
let errorCleanup = null;

export const getWebContainerInstance = async () => {
  if (webContainerInstance) {
    console.log("Reusing existing WebContainer instance");
    return webContainerInstance;
  }

  if (booting) {
    console.log("Waiting for ongoing boot");
    return booting;
  }

  // Teardown any existing instance before booting a new one
  await destroyWebContainerInstance();

  booting = WebContainer.boot()
    .then((wc) => {
      console.log("WebContainer booted successfully");
      webContainerInstance = wc;
      booting = null;
      errorCleanup = wc.on("error", (error) => {
        console.warn("WebContainer error detected, resetting instance:", error);
        webContainerInstance = null;
      });
      return wc;
    })
    .catch((error) => {
      console.error("Failed to boot WebContainer:", error);
      booting = null;
      throw error;
    });

  return booting;
};

export const destroyWebContainerInstance = async () => {
  if (webContainerInstance) {
    try {
      if (errorCleanup) {
        errorCleanup();
        errorCleanup = null;
      }
      await webContainerInstance.teardown();
      console.log("WebContainer instance destroyed");
    } catch (error) {
      console.error("Failed to destroy WebContainer:", error);
    }
    webContainerInstance = null;
  }
};
