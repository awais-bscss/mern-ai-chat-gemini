import * as geminiServices from "../services/gemini.service.js";

export const getResult = async (req, res) => {
  try {
    const { prompt } = req.query;

    const result = await geminiServices.generateResult(prompt);
    res.status(200).send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};
