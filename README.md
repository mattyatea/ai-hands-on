# TODOアプリケーション (Beta)

Vue 3 + TypeScript + Piniaで構築されたモダンなTODO管理アプリケーションです。

## 🚀 機能

### 実装済み機能
- ✅ タスクの追加・削除・編集
- ✅ タスクの完了状態管理
- ✅ フィルタリング（全て/アクティブ/完了済み）
- ✅ 完了済みタスクの一括削除
- ✅ ローカルデータベース（SQL.js）による永続化
- ✅ レスポンシブデザイン

### 開発予定機能
- 🔍 検索機能
- 💾 データのインポート/エクスポート
- 🌙 ダークモード

## 🛠️ 技術スタック

- **フロントエンド**: Vue 3 (Composition API)
- **状態管理**: Pinia
- **型定義**: TypeScript
- **スタイリング**: Tailwind CSS
- **ビルドツール**: Vite
- **データベース**: SQL.js (ブラウザ内SQLite)
- **テスト**: Vitest + Playwright

## 📦 セットアップ

### 必要条件
- Node.js 18以上
- pnpm（推奨）またはnpm

### インストール

```bash
# 依存関係のインストール
pnpm install
```

## 🔧 開発

```bash
# 開発サーバーの起動（http://localhost:5173）
pnpm dev

# TypeScriptの型チェック
pnpm type-check

# ESLintによるコードチェック
pnpm lint

# フォーマット（Prettier）
pnpm format
```

## 🏗️ ビルド

```bash
# プロダクションビルド
pnpm build

# ビルド結果のプレビュー
pnpm preview
```

## 🧪 テスト

```bash
# ユニットテストの実行
pnpm test:unit

# E2Eテストの実行
pnpm test:e2e

# テストカバレッジ
pnpm test:coverage
```

## 📁 プロジェクト構造

```
src/
├── components/       # Vueコンポーネント
│   ├── TodoList.vue # メインのTODOリスト
│   └── TodoItem.vue # 個別のTODOアイテム
├── stores/          # Piniaストア
│   └── todos.ts     # TODO状態管理
├── services/        # サービス層
│   └── database.ts  # データベース操作
├── assets/          # 静的リソース
│   └── main.css     # グローバルスタイル
└── main.ts          # アプリケーションエントリーポイント
```

## 🎯 今後の開発予定

1. **Phase 1**: 基本機能の強化
   - 検索機能の実装
   - データの永続化改善（IndexedDB対応）
   
2. **Phase 2**: ユーザビリティ向上
   - ドラッグ&ドロップによる並び替え
   - キーボードショートカット
   - アニメーション追加

3. **Phase 3**: 高度な機能
   - マルチユーザー対応
   - リアルタイム同期
   - PWA化

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容について議論してください。

## 📝 ライセンス

MIT License

## 🐛 既知の問題

- 検索機能は現在未実装です
- ブラウザをリロードするとデータが失われます（IndexedDB対応予定）

## 📧 お問い合わせ

質問や提案がある場合は、GitHubのissueでお知らせください。