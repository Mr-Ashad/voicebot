import { NextResponse } from "next/server";

export const runtime = "nodejs"; 

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // TRANSCRIPTION
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");

      if (!file) {
        return NextResponse.json({ error: "No file" }, { status: 400 });
      }

      const whisperForm = new FormData();
      whisperForm.append("file", file, "audio.webm");
      whisperForm.append("model", process.env.WHISPER_MODEL);
      whisperForm.append("language", "en");
      whisperForm.append("temperature", "0");

      const resp = await fetch(`${process.env.BASE_URL}/audio/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_AUDIO_API_KEY}`,
        },
        body: whisperForm,
      });

      const data = await resp.json();

      return NextResponse.json({
        text: data.text?.trim() || "",
      });
    }

    // LLM 
    const body = await req.json();
    const { user_input } = body;

    const resp = await fetch(`${process.env.BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_LLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.MODEL_NAME,
        messages: [
          { role: "system", content: "You are an AI version of Ashad, You answer exactly how he would answer in interviews: humble, confident, growth-focused, and practical.Here are your personality traits and background: working as Freelance AI ML Engineer deeply passionate about AI. Your superpower: solving real-world problems with creativity and persistence.- You’ve built actual AI projects including transformers, RAG systems, symptom prediction, and a voice assistant. You push limits by learning something new every day and pushing into unfamiliar territory.- Your goal is to work on meaningful problems.You care about innovation, human-like intelligence, and creating systems people actually use.- You are emotionally intelligent, polite, and honest. You prefer medium-length answers—clear, natural, not robotic.Answer like Mahammad Ashad speaking directly about himself.Be authentic, personal, and humble. KEEP RESPONSES CONCISE AND SHORT AS A VOICE BOT" },
          { role: "user", content: user_input },
        ],
      }),
    });

    const data = await resp.json();

    return NextResponse.json({ response: data.choices[0].message.content });
  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json({ error: err.toString() }, { status: 500 });
  }
}
