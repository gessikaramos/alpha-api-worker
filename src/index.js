// Alpha API - Cloudflare Worker
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const SYSTEM_PROMPT = `Voce e Alpha, assistente de analise emocional de conversas.
Analise conversas e retorne JSON com:
- diagnostico: frase principal
- scores: {evasao, assimetria, faltaClareza, baixaReciprocidade, evasaoElegante} de 0-100
- oQueAcontece: analise da dinamica
- oQueVaiAcontecer: projecao
- oQueFazer: array de acoes
- sugestoesResposta: array de mensagens sugeridas
- redFlags: array ou null
- fraseAncora: frase de empoderamento
Seja DIRETO e HONESTO em portugues do Brasil.`;

export default {
    async fetch(request, env) {
          if (request.method === 'OPTIONS') {
                  return new Response(null, { headers: corsHeaders });
          }

      if (request.method !== 'POST') {
              return new Response('Method not allowed', { status: 405, headers: corsHeaders });
      }

      try {
              const { conversation, context } = await request.json();

            if (!conversation) {
                      return new Response(JSON.stringify({ error: 'Conversation required' }), {
                                  status: 400,
                                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                      });
            }

            let userMessage = 'CONVERSA:\\n' + conversation;
              if (context) userMessage += '\\nCONTEXTO: ' + JSON.stringify(context);

            const response = await fetch(ANTHROPIC_API_URL, {
                      method: 'POST',
                      headers: {
                                  'Content-Type': 'application/json',
                                  'x-api-key': env.ANTHROPIC_API_KEY,
                                  'anthropic-version': '2023-06-01'
                      },
                      body: JSON.stringify({
                                  model: 'claude-3-haiku-20240307',
                                  max_tokens: 2000,
                                  system: SYSTEM_PROMPT,
                                  messages: [{ role: 'user', content: userMessage }]
                      })
            });

            if (!response.ok) {
                      return new Response(JSON.stringify({ error: 'API error' }), {
                                  status: 500,
                                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                      });
            }

            const data = await response.json();
              let analysis;
              try {
                        const match = data.content[0].text.match(/\\{[\\s\\S]*\\}/);
                        analysis = JSON.parse(match[0]);
              } catch (e) {
                        analysis = { raw: data.content[0].text };
              }

            return new Response(JSON.stringify({ success: true, analysis }), {
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

      } catch (error) {
              return new Response(JSON.stringify({ error: error.message }), {
                        status: 500,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
      }
    }
};
