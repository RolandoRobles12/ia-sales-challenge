import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { instructions } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key no configurada' },
        { status: 500 }
      );
    }

    console.log('🔄 Creando token efímero para Realtime API...');

    // Generar ephemeral token para Realtime API con WebRTC
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'verse',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error de OpenAI:', error);
      return NextResponse.json(
        { error: error.error?.message || 'No se pudo crear la sesión' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Token efímero generado');

    // Retornar el token efímero para WebRTC
    return NextResponse.json({
      ephemeral_token: data.client_secret?.value || data.client_secret,
    });

  } catch (error) {
    console.error('❌ Error creando sesión:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}