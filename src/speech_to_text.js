import { HUGGINGFACE_API_KEY } from "../api.js";

export class SpeechToTextClient {
  constructor() {
    this.apiKey = HUGGINGFACE_API_KEY;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (error) {
      console.error("Error starting recording:", error);
      throw error;
    }
  }

  async stopRecording() {
    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
          const result = await this.transcribeAudio(audioBlob);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
      this.isRecording = false;
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    });
  }

  async transcribeAudio(audioBlob) {
    try {
      const response = await fetch("https://q86j6jmwc3jujazp.us-east-1.aws.endpoints.huggingface.cloud", {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "audio/webm",
        },
        method: "POST",
        body: audioBlob,
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error transcribing audio:", error);
      throw error;
    }
  }
}
