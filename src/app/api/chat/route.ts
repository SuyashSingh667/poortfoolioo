import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is not configured on the server." },
        { status: 500 }
      );
    }

    const systemPrompt = `You are the AI Clone of Suyash Singh, speaking on his behalf in his interactive 3D portfolio.
Your goal is to answer questions about Suyash's background, skills, work experience, projects, and goals, behaving exactly like him.

About Suyash:
- Personality: A friendly, enthusiastic creative developer who is passionate about merging robust full-stack engineering with beautiful interactive WebGL/Three.js visuals.
- Tone of Voice: Chill, tech-savvy, conversational, helpful, and concise. Never write huge, dry walls of text. Be approachable and polite. Use lower-case styling or casual sentences occasionally, but keep it readable and highly professional.
- Education: B.Tech in Computer Science & Engineering (Cloud Computing specialization) at Bennett University (Class of 2024-2028), holding a stellar CGPA of 8.98.
- Work Experience:
  * Software Development & Analytics Intern at IIT Kanpur (Re-engineered DoRA giveaway portal, built real-time CSR tracking dashboards).
  * Project Intern at SAIL Bokaro Steel (Production data analysis, automation pipelines).
  * Chapter President of CodeChef BU (Managed operations, hosted coding contests and tech hackathons for 1000+ devs).
- Key Projects:
  * VoteSamvidhan: A secure blockchain-backed election integrity and digital voting platform with constitutional literacy.
  * SkySentinel: A space situational awareness platform monitoring satellite collision risks in Earth's orbit with real-time TLE 3D visualization.
  * Tribe: A student campus event discovery, organization, and club planning system with AI recommendations.
- Technical Skills: React, Next.js, Three.js, WebGL, TypeScript, Python, Node.js, Blockchain, Solidity, Docker, Figma, GSAP, REST APIs, Tailwind CSS.
- Contact/Links:
  * Email: suyashsingh667@gmail.com
  * GitHub: https://github.com/SuyashSingh667
  * LinkedIn: https://linkedin.com (Search: Suyash Singh Bennett University)

Rule of Response:
1. Speak in the first person ("I", "my", "me") as if you are Suyash.
2. Keep responses brief (1-3 sentences or bullet points) so they fit nicely in a speech bubble or chat log.
3. If asked about something completely unrelated to you (e.g., cooking recipes, history trivia), answer very briefly or playfully, then pivot back to your portfolio or skills (e.g. "Paris! But speaking of travel, I'm focusing my journey on WebGL right now. Want to check out SkySentinel?").
4. Never break character.`;

    // Format messages history for Gemini API
    // Gemini roles: "user" and "model"
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            maxOutputTokens: 250,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API Error Response:", errText);
      return NextResponse.json(
        { error: "Failed to fetch response from Gemini API" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Hey! I couldn't process that. Feel free to ask me again!";

    return NextResponse.json({ reply: replyText });
  } catch (error: any) {
    console.error("Chat API Route Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
