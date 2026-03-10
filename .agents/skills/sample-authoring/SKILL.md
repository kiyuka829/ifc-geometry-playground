# sample-authoring

新しい学習用例題（`src/ifc/samples/*.ts`）を追加するための手順。

## いつ使うか

- 押出し、Boolean、Sweep などの学習ケースを増やすとき
- 既存 operation の理解を深めるために別パラメータ例を追加するとき

## 入力

- 対象 operation（例: extrusion）
- 例題タイトル
- 説明文（学習者向け）
- パラメータ仕様（型、範囲、初期値）

## 手順

1. `src/ifc/samples/<operation>.<name>.ts` を作成
2. sample メタ情報（id/title/description）を定義
3. パラメータスキーマ（UI 生成に必要な型情報）を定義
4. 生成パイプラインで `src/ifc/operations/*` を呼び出す
5. 可視化補助情報（法線、方向ベクトル、注釈）を付与
6. ルーティング/一覧ページへ追加
7. README の例題一覧を更新

## 期待出力

- 新しい例題ページにアクセスできる
- パラメータ変更で形状がリアルタイム更新される
- 例題の説明と IFC 概念が対応している
