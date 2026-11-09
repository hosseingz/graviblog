import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured.' },
        { status: 500 }
      );
    }

    const { prompt, mode, articleTitle, articleContent } = await req.json();

    const ai = new GoogleGenAI({ apiKey });

    let systemInstruction = `You are GRAVIBLOG AI (Pixel Punch Intell Unit), an irreverent, ultra-knowledgeable neo-brutalist gaming journalist and hardware analyst. You talk with zero corporate PR fluff, bold underground energy, precise technical facts, and punchy comic-zine formatting. Keep answers concise, highly engaging, and direct.`;

    let finalPrompt = prompt;

    if (mode === 'summarize') {
      finalPrompt = `Analyze and summarize this gaming dispatch in 3 punchy neo-brutalist bullet takeaways and 1 spicy hot take:
Title: "${articleTitle || 'Gaming Article'}"
Content: ${articleContent || prompt}

Format output cleanly:
- KEY TAKEAWAY 1: ...
- KEY TAKEAWAY 2: ...
- KEY TAKEAWAY 3: ...
- VERDICT / HOT TAKE: ...`;
    } else if (mode === 'hottake') {
      finalPrompt = `Generate a controversial but highly valid neo-brutalist Hot Take (2-3 sentences max) about this topic or gaming trend: "${prompt}".`;
    } else if (mode === 'search') {
      finalPrompt = `Answer the user's intel query about gaming, hardware, retro tech, or esports: "${prompt}". Give a precise 2-paragraph neo-brutalist dispatch response with technical depth.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: finalPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    const text = response.text || 'No response generated.';
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process request.' },
      { status: 500 }
    );
  }
}
