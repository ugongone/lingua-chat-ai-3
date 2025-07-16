# PWA アイコン生成について

## 必要なアイコンファイル

PWAの完全な動作には以下のアイコンファイルが必要です：

- `icon-192x192.png` - Android向け標準アイコン
- `icon-512x512.png` - Android向け大きいアイコン
- `apple-touch-icon.png` (180x180) - iOS向けアイコン

## 生成方法

1. **オンラインツールを使用**
   - https://realfavicongenerator.net/
   - https://www.favicon-generator.org/

2. **コマンドラインツールを使用**
   ```bash
   # ImageMagickを使用（要インストール）
   convert icon.svg -resize 192x192 icon-192x192.png
   convert icon.svg -resize 512x512 icon-512x512.png
   convert icon.svg -resize 180x180 apple-touch-icon.png
   ```

3. **Node.jsスクリプトを使用**
   ```bash
   npm install sharp
   # 以下のスクリプトを実行
   ```

## 現在の状況

`icon.svg` が作成されています。これを元に上記のPNGファイルを生成してください。

## スクリーンショット

PWAインストール時のプレビュー用にスクリーンショットも追加することを推奨します：
- `screenshot-wide.png` (1280x720) - デスクトップ向け
- `screenshot-narrow.png` (750x1334) - モバイル向け

これらのファイルが追加されると、PWAの品質が向上し、アプリストアでの表示も改善されます。