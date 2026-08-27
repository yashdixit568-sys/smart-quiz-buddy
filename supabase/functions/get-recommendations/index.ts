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
    const { testResults, topicName } = await req.json();
    console.log('Generating recommendations for:', topicName);

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    interface QuestionResult {
      is_correct?: boolean;
      question_text: string;
    }

    // Analyze weak areas from test results
    const results = testResults as QuestionResult[];
    const totalQuestions = results.length;
    const correctAnswers = results.filter((q) => q.is_correct).length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    const weakAreas = results
      .filter((q) => !q.is_correct)
      .map((q) => q.question_text)
      .slice(0, 5);

    const aiResponse = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are an expert CS educator providing personalized learning recommendations.
            
            Topic: ${topicName}
            Overall Accuracy: ${accuracy.toFixed(1)}%
            Questions Answered Incorrectly: ${weakAreas.join(', ')}
            
            Provide a detailed analysis with:
            1. Overall Performance Summary
            2. Key Weak Areas identified
            3. Specific study recommendations
            4. Suggested practice resources
            5. Next steps for improvement
            
            Return a JSON object with this structure:
            {
              "summary": "Overall performance analysis...",
              "weakAreas": ["area1", "area2"],
              "recommendations": ["rec1", "rec2", "rec3"],
              "resources": ["resource1", "resource2"],
              "nextSteps": "What to focus on next..."
            }`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('Failed to generate recommendations');
    }

    const data = await aiResponse.json();
    const content = data.candidates[0].content.parts[0].text;
    const recommendations = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

    return new Response(
      JSON.stringify({ 
        accuracy, 
        totalQuestions, 
        correctAnswers,
        ...recommendations 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});