# Myブランディングちゃん【光杏】- AIパーソナル診断ツール

風俗業界で働く女性向けのAIパーソナル診断ツール「Myブランディングちゃん【光杏】」のLINE Botアプリケーションです。

## 機能概要

- 質問による自己分析サポート（対話形式）
- キャッチコピーや自己PR文の自動生成
- SNS・写メ日記支援
- 画像生成プロンプト提供
- 文体分析・スタイル変更
- ファイルアップロード機能（画像分析など）

## 技術スタック

- Node.js
- Express
- LINE Messaging API
- OpenAI API (GPT-4, GPT-4 Vision)

## セットアップ手順

### 前提条件

- Node.js (16.x以上)
- npm or yarn
- LINE Developers アカウント
- OpenAI API アカウント

### インストール

1. リポジトリをクローン

```bash
git clone <repository-url>
cd mybranding-koaki
```

2. 依存パッケージをインストール

```bash
npm install
# または
yarn install
```

3. 環境変数の設定

`.env.example` ファイルを `.env` にコピーして、必要な環境変数を設定します。

```bash
cp .env.example .env
```

- LINE_CHANNEL_SECRET: LINE Developersコンソールから取得
- LINE_CHANNEL_ACCESS_TOKEN: LINE Developersコンソールから取得
- OPENAI_API_KEY: OpenAIダッシュボードから取得

4. アプリケーションの起動

```bash
npm start
# または
npm run dev # 開発モード（変更自動反映）
```

### LINE Botのセットアップ

1. [LINE Developers Console](https://developers.line.biz/console/)でアカウントとプロバイダーを作成
2. 新しいチャネル（Messaging API）を作成
3. チャネルシークレットとアクセストークンを取得
4. Webhook URLを設定（例: `https://your-domain.com/webhook`）
5. Webhook送信を有効化
6. 必要に応じて応答設定を調整

## 使用方法

1. LINEアプリでボットを友達追加
2. 「診断開始」と送信して診断プロセスを開始
3. 質問に回答して、パーソナライズされたブランディング提案を受け取る
4. 各種機能（キャッチコピー、PR文、SNSアドバイス、文体変更など）を利用
5. 「文体変更」で異なるスタイルのテキストを生成可能
6. 写メ日記の文体分析や画像分析も可能

## システム構成図

```
User <---> LINE <---> Webhook API <---> AI処理
                        |
                        |---> OpenAI API
                        |---> セッション管理
                        |---> テンプレート処理
```

## ファイル構成

```
/
├── config/               # 設定ファイル
│   ├── line.js           # LINE API設定
│   └── openai.js         # OpenAI API設定
├── src/
│   ├── handlers/         # メッセージハンドラー
│   │   ├── fileHandler.js      # ファイル処理
│   │   └── messageHandler.js   # メッセージ処理
│   ├── models/           # データモデル
│   │   ├── brandingTemplate.js # ブランディングテンプレート定義
│   │   └── questionTemplate.js # 質問テンプレート定義
│   ├── services/         # ビジネスロジック
│   │   ├── openaiService.js    # OpenAI API連携
│   │   └── sessionService.js   # セッション管理
│   └── index.js          # アプリケーションエントリーポイント
├── uploads/              # アップロードされたファイル（一時）
├── .env                  # 環境変数
├── .env.example          # 環境変数のサンプル
├── package.json
└── README.md
```

## 主要機能詳細

### 1. 自己分析質問フロー

業種・ジャンルの特性に合わせた質問を通じて、ユーザーの魅力や個性を引き出します。
- 基本情報（名前、年齢、身体的特徴）
- 性格・趣味
- 見た目の特徴
- 接客スタイル
- お客様の傾向・理想像
- ブランディング方向性

### 2. テンプレートマッチング

ユーザーの回答と希望に基づいて、最適なテンプレート（業種×ジャンル）を選択します。
- 学園系ヘルス
- SM系ホテヘル
- 高級デリヘル
- 人妻系ソープ
- エステ・アロマ など

### 3. 文体スタイル

ユーザーの個性に合わせた文体スタイルでのテキスト生成をサポートします。
- 甘え系
- お姉さん系
- ギャル系
- 丁寧敬語系
- ナチュラル系

### 4. AI生成コンテンツ

OpenAI GPT-4による高品質なコンテンツ生成を提供します。
- キャッチコピー（3案）
- 自己PR文
- SNS投稿アドバイス
- 写メ日記文体分析
- 画像生成プロンプト

### 5. 画像処理・分析

OpenAI Vision APIを使用して画像を分析し、SNSや写メ日記での活用方法をアドバイスします。

## 注意事項

- 本番環境での使用前に、セキュリティ対策を十分に行ってください
- 大量のユーザーを想定する場合は、セッション管理をRedisなどに移行することを検討してください
- 個人情報や機密データの取り扱いには十分注意してください
- API使用量には注意し、コスト管理を行ってください

## ライセンス

- プライベートリポジトリ

## 連絡先

- 開発者:
- メール: 