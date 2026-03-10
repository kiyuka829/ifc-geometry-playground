# IFC Geometry Playground

IFCの形状生成（押出し、ブーリアン、Sweepなど）を、パラメータ変更とステップ表示で学ぶためのWebベース学習プロジェクトです。

## 目的

- IFC形状の「最終メッシュ」だけでなく「どう作られたか」を理解しやすくする
- 開発者・学習者が `Ifc*` の構造と幾何生成の対応を追えるようにする
- GitHub Pages で公開できる軽量な教材サイトにする

## 現在の実装状態

> 枠組み実装（MVP skeleton）

- サンプル駆動構成（`src/ifc/samples`）
- 例題選択ルーティング（hash routing）
- パラメータUI自動生成（数値・Vector3）
- 生成ステップ表示、IFCツリー表示、擬似IFC表示
- 3Dビューはプレースホルダー（今後 Babylon.js を統合予定）

## ディレクトリ

- `src/app`: ルーティングとアプリ起動
- `src/pages`: 例題ページのレイアウト
- `src/ui`: ParameterPanel / Stepper / TreeView / CodeView
- `src/ifc`: 型定義・オペレーション・サンプル
- `src/engine`: scene/camera/gizmos などエンジン層（現状はスタブ含む）

## 開発

```bash
npm install
npm run dev
```

## GitHub Pages 公開メモ

- `vite.config.ts` で `base` を `'/ifc-geometry-playground/'` に設定済み
- デプロイ先に応じて `BASE_PATH` 環境変数で上書き可能
