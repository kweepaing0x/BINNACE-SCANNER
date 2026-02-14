import { corsHeaders } from '../_shared/cors.ts';

const BINANCE_BASE_URL = 'https://testnet.binance.vision/api/v3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');
    
    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint parameter is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const binanceUrl = `${BINANCE_BASE_URL}/${endpoint}`;
    console.log(`Proxying request to: ${binanceUrl}`);

    const binanceResponse = await fetch(binanceUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!binanceResponse.ok) {
      const errorText = await binanceResponse.text();
      console.error(`Binance API error: ${binanceResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: 'Binance API error',
          status: binanceResponse.status,
          details: errorText
        }),
        {
          status: binanceResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const data = await binanceResponse.json();

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Proxy error',
        message: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});