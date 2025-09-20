import { Router } from "express";
import * as geminiController from "../controller/gemini.controller.js";
const router = Router();

router.get("/generate-result", geminiController.getResult);

export default router;
