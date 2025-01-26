import { SHYGUY_LABEL, SISTER_LABEL, GIRL_LABEL, BAR_LABEL, DJ_LABEL, WINGMAN_LABEL } from "./constants.js";
import { ELEVENLABS_API_KEY } from "../api.js";

export class ElevenLabsClient {
  constructor() {
    this.apiKey = ELEVENLABS_API_KEY;
    this.baseUrl = "https://api.elevenlabs.io/v1";
  }

  static characterToVoiceIdMapping = {
    [SHYGUY_LABEL]: "bGNROVfU5WbK6F0AyHII",
    [SISTER_LABEL]: "XA4HJz0cEOIlrQq0BGwu",
    [GIRL_LABEL]: "XA4HJz0cEOIlrQq0BGwu",
    [BAR_LABEL]: "XA2bIQ92TabjGbpO2xRr",
    [DJ_LABEL]: "T0pkYhIZ7UMOc26gqqeX",
    [WINGMAN_LABEL]: "XA2bIQ92TabjGbpO2xRr",
  };

  async playAudioForCharacter(character, text) {
    const voiceId = ElevenLabsClient.characterToVoiceIdMapping[character];
    if (!voiceId) {
      throw new Error(`No voice mapping found for character: ${character}`);
    }
    const audioBlob = await this.createSpeech({
      text: text,
      voiceId: voiceId,
    });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    // hack to wait for the audio to finish playing
    return new Promise((res) => {
      audio.play();
      audio.onended = res;
    });
  }

  async createSpeech({
    text,
    voiceId,
    modelId = "eleven_multilingual_v2",
    outputFormat = "mp3_44100_128",
    voiceSettings = null,
    pronunciationDictionaryLocators = null,
    seed = null,
    previousText = null,
    nextText = null,
    previousRequestIds = null,
    nextRequestIds = null,
    usePvcAsIvc = false,
    applyTextNormalization = "auto",
  }) {
    const url = `${this.baseUrl}/text-to-speech/${voiceId}?output_format=${outputFormat}`;

    const requestBody = {
      text,
      model_id: modelId,
      voice_settings: voiceSettings,
      pronunciation_dictionary_locators: pronunciationDictionaryLocators,
      seed,
      previous_text: previousText,
      next_text: nextText,
      previous_request_ids: previousRequestIds,
      next_request_ids: nextRequestIds,
      use_pvc_as_ivc: usePvcAsIvc,
      apply_text_normalization: applyTextNormalization,
    };

    // Remove null values from request body
    Object.keys(requestBody).forEach((key) => requestBody[key] === null && delete requestBody[key]);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      // Return audio blob
      return await response.blob();
    } catch (error) {
      throw new Error(`Failed to create speech: ${error.message}`);
    }
  }
}
