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
    const body = await req.json();
    const { 
      topicName, 
      selectedSubjects = [], 
      selectedTopics = {}, 
      difficulty = "Mixed", 
      numMcqs = 5, 
      numCoding = 1 
    } = body;

    const subjectsToUse = selectedSubjects.length > 0 ? selectedSubjects : [topicName || "Data Structures"];
    console.log('Generating questions for:', { subjectsToUse, selectedTopics, difficulty, numMcqs, numCoding });

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const mcqQuestions = [];
    const codingQuestions = [];

    const topicsSummaryStr = Object.entries(selectedTopics)
      .map(([subj, topList]) => `${subj}: ${(topList as string[]).join(', ')}`)
      .join('; ');

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
              Generate exactly ${numMcqs} MCQ questions evenly distributed across these subjects: ${subjectsToUse.join(', ')}.
              ${topicsSummaryStr ? `Focus on these specific sub-topics where applicable: ${topicsSummaryStr}.` : ''}
              
              Return ONLY a JSON array with this exact structure:
              [{"question": "...", "options": ["A", "B", "C", "D"], "correct": "A", "subject": "DBMS", "topic": "Normalization", "explanation": "Detailed explanation why correct answer is right..."}]
              Make sure questions are diverse, accurate, and include clear, educational explanations.`
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
      const targetDiffStr = difficulty === "Mixed" ? "a mix of easy, medium, and hard" : `${difficulty} level`;
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
              Generate exactly ${numCoding} coding questions about subjects: ${subjectsToUse.join(', ')} with difficulty: ${targetDiffStr}. 
              ${topicsSummaryStr ? `Focus on sub-topics: ${topicsSummaryStr}.` : ''}
              
              Return ONLY a JSON array with this exact structure:
              [{"question": "...", "difficulty": "medium", "subject": "Algorithms", "topic": "Dynamic Programming", "example_input": "...", "example_output": "...", "constraints": "...", "explanation": "Detailed solution approach explanation..."}]
              Make questions diverse covering practical algorithmic challenges.`
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