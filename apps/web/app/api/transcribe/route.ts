import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック (25MB制限)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    // サポートされているファイル形式チェック（gpt-4o-transcribe用）
    const supportedTypes = [
      'audio/wav', 
      'audio/mp3', 
      'audio/m4a', 
      'audio/ogg', 
      'audio/webm', 
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];
    
    console.log(`Received audio file type: "${audioFile.type}"`);
    console.log(`Supported types: ${supportedTypes.join(', ')}`);
    
    if (!supportedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { error: `Unsupported audio format: "${audioFile.type}". Supported formats: WAV, MP3, M4A, OGG, WebM, MP4` },
        { status: 400 }
      );
    }

    console.log(`Processing audio file: ${audioFile.name}, size: ${audioFile.size} bytes, type: ${audioFile.type}`);

    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'gpt-4o-transcribe',
      // 言語を指定せず、自動検出を利用（多言語対応）
      response_format: 'verbose_json', // 言語情報を含む詳細なレスポンス形式
      temperature: 0.2, // 一貫性を重視
    });

    console.log(`Transcription completed. Text: ${transcription.text}`);
    console.log(`Detected language: ${transcription.language}`);
    console.log(`Audio duration: ${transcription.duration} seconds`);

    return NextResponse.json({
      text: transcription.text,
      language: transcription.language, // 検出された言語コード（es, ja, en など）
      duration: transcription.duration, // 音声の長さ（秒）
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Whisper API error:', error);
    
    // OpenAI APIのエラーメッセージを詳細に返す
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Transcription failed',
          details: error.message,
          type: 'whisper_api_error'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Unknown transcription error',
        type: 'unknown_error'
      },
      { status: 500 }
    );
  }
}