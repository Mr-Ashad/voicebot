'use client'
import { useState, useRef } from "react";

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      if (!navigator.mediaDevices) {
        alert("Your browser does not support audio recording.");
        return;
      }

      // Stop any ongoing TTS before starting new recording
      window.speechSynthesis.cancel();
      setTranscript("");
      setResponse("");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current.length = 0;
        sendAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(200); 
      setRecording(true);

    } catch (err) {
      console.error("Microphone error:", err);
      alert("Audio permission denied or unavailable.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  async function sendAudio(blob: Blob) {
    try {
      const formData = new FormData();
      formData.append("file", blob, "audio.webm");

      const transRes = await fetch("/api/voicebot", {
        method: "POST",
        body: formData,
      });

      const transData = await transRes.json();
      console.log("Transcription:", transData);
      setTranscript(transData.text);

      sendToChat(transData.text);
    } catch (err) {
      console.error("Transcription error:", err);
    }
  }

  async function sendToChat(text: string) {
    try {
      const chatRes = await fetch("/api/voicebot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: text }),
      });

      const chatData = await chatRes.json();
      console.log("Chat Response:", chatData);

      setResponse(chatData.response);

      speak(chatData.response);

    } catch (err) {
      console.error("Chat error:", err);
    }
  }

  function speak(text: string) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.pitch = 1.0;
    window.speechSynthesis.speak(utter);
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-700 font-sans p-4">
      <div className="w-full max-w-xl bg-white shadow-xl rounded-2xl p-8 border border-gray-200">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-2">
          Voice Bot
        </h2>
        <p className="text-center text-gray-600 mb-6">
          Click the button, speak, and let the bot talk back.
        </p>

        <div className="flex justify-center">
          {!recording ? (
            <button
              onClick={startRecording}
              className="px-6 py-3 bg-gray-700 text-white rounded-xl shadow hover:bg-gray-400 transition-all"
            >
              🎙️ Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="px-6 py-3 bg-red-600 text-white rounded-xl shadow hover:bg-red-700 transition-all"
            >
              ⏹️ Stop Recording
            </button>
          )}
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Transcript</h3>
            <p className="mt-2 p-3 bg-gray-100 rounded-xl text-gray-700 min-h-[60px]">
              {transcript || "—"}
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-800">Bot Response</h3>
            <p className="mt-2 p-3 bg-gray-100 rounded-xl text-gray-700 min-h-[60px]">
              {response || "—"}
            </p>
            {response && (
              <button
                onClick={stopSpeaking}
                className="mt-4 w-full py-3 bg-red-600 text-white rounded-xl shadow hover:bg-red-700 transition-all"
              >
                Stop Speaking
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
