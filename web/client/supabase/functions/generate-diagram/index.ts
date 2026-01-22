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
    const { description, diagramType } = await req.json();
    
    if (!description) {
      return new Response(
        JSON.stringify({ error: 'Description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert diagram generator. Convert the user's description into Mermaid diagram syntax.

Important rules:
1. Return ONLY the Mermaid code, no explanations or markdown code blocks
2. Use the appropriate diagram type based on the context:
   - flowchart/graph: for processes, workflows, decision trees
   - sequenceDiagram: for interactions between entities
   - classDiagram: for class structures and relationships
   - erDiagram: for database schemas
   - stateDiagram-v2: for state machines
   - gantt: for project timelines
   - mindmap: for hierarchical ideas
   - C4Context/C4Container/C4Component: for architecture diagrams
   - gitGraph: for version control flows
3. Ensure proper syntax and node connections
4. Use clear, descriptive labels
5. Make the diagram comprehensive and well-structured`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Create a ${diagramType || 'appropriate'} diagram for: ${description}` 
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('Failed to generate diagram');
    }

    const data = await response.json();
    const diagramCode = data.choices?.[0]?.message?.content;

    if (!diagramCode) {
      throw new Error('No diagram code generated');
    }

    console.log('Generated diagram:', diagramCode);

    return new Response(
      JSON.stringify({ diagram: diagramCode.trim() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-diagram function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});