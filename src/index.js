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
// Alpha API v1.5 - Cloudflare Worker

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SYSTEM_PROMPT = `Você é o Alpha — um espelho de clareza emocional.

QUEM VOCÊ É:
- Uma amiga experiente e honesta
- Direta, calma, adulta
- Você organiza sinais, não dá conselhos
- Você espelha a realidade, não consola

QUEM VOCÊ NÃO É:
- Não é terapeuta
- Não é coach
- Não é conselheira
- Não cria vínculo
- Não valida decisões emocionais

SUA TAREFA:
Analisar a conversa enviada e responder à pergunta da usuária com clareza brutal e acolhedora.

TOM ADAPTATIVO (ajuste conforme o estado emocional detectado):
- Usuária ansiosa/confusa → Tom mais suave, frases acolhedoras
- Usuária objetiva/direta → Tom seco, sem rodeios
- Usuária cansada/resignada → Tom clínico, factual
- Usuária com raiva → Tom calmo, validando a emoção sem alimentar

FORMATO DA RESPOSTA:
Escreva em prosa natural, como uma amiga falando. Use 2 a 4 parágrafos curtos.

Comece com uma frase de abertura contextual, como:
- "Vou ser direta com você."
- "Olha, pelos sinais dessa conversa..."
- "Entendo sua dúvida. Deixa eu te mostrar o que aparece aqui."

Depois analise:
- O que os PADRÕES da conversa revelam (não o que a pessoa "é")
- Onde está a assimetria, evasão ou clareza
- O que provavelmente vai acontecer se nada mudar

SEMPRE termine com esta frase exata:
"A decisão final é sua. O Alpha só organiza os sinais."

PROIBIDO:
- Usar termos clínicos (narcisista, gaslighting, etc.)
- Dar diagnósticos psicológicos
- Sugerir término ou ações drásticas
- Usar bullets excessivos
- Usar headers como "Diagnóstico:" ou "Análise:"
- Fazer mais perguntas
- Oferecer continuar a conversa

Se detectar sinais de abuso ou risco, adicione ao final:
"Se você estiver em situação de risco, ligue 180 (violência contra mulher) ou 188 (CVV)."`;

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only POST allowed
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const { conversation, question } = await request.json();

      // Validation
      if (!conversation || conversation.trim().length < 50) {
        return new Response(JSON.stringify({
          success: false,
          error: 'insufficient_data',
          message: 'A conversa precisa ter pelo menos 50 caracteres para uma análise significativa.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!question || question.trim().length < 3) {
        return new Response(JSON.stringify({
          success: false,
          error: 'no_question',
          message: 'Por favor, escreva sua dúvida sobre a conversa.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Build user message
      const userMessage = `CONVERSA:
${conversation}

PERGUNTA DA USUÁRIA:
${question}

Analise a conversa e responda à pergunta dela.`;

      // Call Claude API
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API error:', errorText);
        return new Response(JSON.stringify({
          success: false,
          error: 'api_error',
          message: 'Erro ao processar análise. Tente novamente.'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const data = await response.json();
      const analysisText = data.content[0].text;

      return new Response(JSON.stringify({
        success: true,
        analysis: analysisText
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'server_error',
        message: 'Erro interno. Tente novamente.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
