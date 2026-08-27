import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topicName, numMcqs, numCoding } = await req.json();
    console.log('Generating questions for:', { topicName, numMcqs, numCoding });

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const mcqQuestions = [];
    const codingQuestions = [];

    // Generate MCQs
    if (numMcqs > 0) {
      console.log('Generating MCQ questions...');
      const mcqResponse = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are an expert computer science educator creating high-quality, unique multiple-choice questions. 
              Generate exactly ${numMcqs} MCQ questions about ${topicName}. 
              Each question should be challenging, relevant, and based on best CS resources and real interview questions.
              Return ONLY a JSON array with this exact structure:
              [{"question": "...", "options": ["A", "B", "C", "D"], "correct": "A"}]
              Make sure questions are diverse and don't repeat concepts.`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!mcqResponse.ok) {
        const errorText = await mcqResponse.text();
        console.error('MCQ generation error:', errorText);
        throw new Error('Failed to generate MCQ questions');
      }

      const mcqData = await mcqResponse.json();
      console.log('MCQ response received');

      const mcqContent = mcqData.candidates[0].content.parts[0].text;
      const parsedMcqs = JSON.parse(mcqContent.replace(/```json\n?|\n?```/g, ''));
      mcqQuestions.push(...parsedMcqs);
    }

    // Generate Coding Questions
    if (numCoding > 0) {
      console.log('Generating coding questions...');
      const codingResponse = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are an expert coding interviewer creating unique programming challenges. 
              Generate exactly ${numCoding} coding questions about ${topicName}. 
              Each should be practical, challenging, and similar to real interview questions from top tech companies.
              Return ONLY a JSON array with this exact structure:
              [{"question": "...", "difficulty": "medium", "example_input": "...", "example_output": "...", "constraints": "..."}]
              Make questions diverse covering different aspects of ${topicName}.`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!codingResponse.ok) {
        const errorText = await codingResponse.text();
        console.error('Coding generation error:', errorText);
        throw new Error('Failed to generate coding questions');
      }

      const codingData = await codingResponse.json();
      console.log('Coding response received');

      const codingContent = codingData.candidates[0].content.parts[0].text;
      const parsedCoding = JSON.parse(codingContent.replace(/```json\n?|\n?```/g, ''));
      codingQuestions.push(...parsedCoding);
    }

    return new Response(
      JSON.stringify({ mcqQuestions, codingQuestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-questions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});