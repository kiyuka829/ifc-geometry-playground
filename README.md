# IFC Geometry Playground

IFC の形状生成ロジック（押出し・Boolean・Sweep など）を**対話的に可視化して理解する**ための Web プロジェクトです。開発者や、IFC の形状表現を学びたい人に向けて、"IFC で形状がどう作られているか" を 1 画面で追える体験を目指します。

## 目的

- IFC の形状構成を「最終メッシュ」ではなく「生成プロセス」として学べるようにする
- パラメータ変更（断面、方向ベクトル、深さ、Boolean 対象など）に対して形状がどう変わるかをリアルタイムに示す
- 実務向け IFC パーサー実装の前段として、概念理解に集中できる教材・検証環境を作る

## プロダクト方針

- **学習重視**: 初期フェーズでは IFC を厳密にフルパースしない（学習向け抽象化モデルを使用）
- **例題中心**: `samples` を増やすだけで、UI・3D 表示・説明を拡張できる構成
- **可視化重視**: 法線、押出し方向、局所座標系、演算順序などのデバッグ表示を標準化
- **段階的拡張**: 学習用モデル → 一部 IFC エンティティ対応 → 実 IFC の取り込み、の順で拡張

## 想定技術スタック

- フロントエンド: TypeScript + Vite
- 3D 描画: Babylon.js
- UI: React（または軽量 UI ライブラリ）
- 配布: GitHub Pages（`dist` 配布 or `docs/` 運用）

## 推奨ディレクトリ構成

```txt
/
  README.md
  AGENTS.md
  package.json
  vite.config.ts
  /public
    /assets
  /docs
  /src
    /app
      routes.ts
      App.tsx
    /engine
      scene.ts
      camera.ts
      gizmos.ts
      materials.ts
      debugOverlay.ts
    /ifc
      schema.ts
      /operations
        extrusion.ts
        boolean.ts
        sweep.ts
        revolved.ts
        mappedItem.ts
        placement.ts
      /samples
        extrusion.basic.ts
        extrusion.hole.ts
        boolean.union.ts
        boolean.difference.ts
    /ui
      ParameterPanel.tsx
      TreeView.tsx
      CodeView.tsx
    /pages
      ExamplePage.tsx
```

## 例題（Sample）駆動設計

各例題ファイル（`src/ifc/samples/*.ts`）に以下を含めます。

1. メタ情報: タイトル、説明、対象 IFC 概念
2. パラメータ定義: 型、初期値、最小/最大、UI コンポーネント種別
3. 生成パイプライン: `operations/*` を組み合わせた形状生成ステップ
4. 可視化補助: 法線・ベクトル・操作順序の注釈情報

この設計により、UI 側は定義から自動構築し、学習コンテンツ追加コストを下げます。

## 画面構成（1画面で理解できる構造）

- 左ペイン: Parameter Panel（数値/ベクトル/トグル）
- 中央: Babylon.js 3D ビュー
- 右ペイン: IFC 構造ツリー + ステップ表示（任意）
- 下部: 擬似 IFC / JSON / TypeScript の対応表示

## GitHub Pages 前提の運用

- Vite の `base` を `/<repo-name>/` に設定
- ルーティングは Hash Router を優先（`#/examples/extrusion`）
- デプロイ方式:
  - GitHub Actions で `npm ci && npm run build` → Pages デプロイ
  - または `gh-pages` ブランチに `dist` を配置

## ロードマップ（初期案）

- [ ] M1: 押出し（`IfcExtrudedAreaSolid` 相当）可視化
- [ ] M2: Boolean（union / difference）可視化
- [ ] M3: Sweep / Revolved 可視化
- [ ] M4: 局所座標系 (`IfcAxis2Placement3D`) 表示
- [ ] M5: MappedItem の参照配置
- [ ] M6: 実 IFC 断片の取り込み（限定対応）

## 開発メモ

- まずは現行の Vite テンプレートを段階的に置き換える
- 変更は「1 例題 1 PR」単位で進めるとレビューしやすい
- ドキュメントと実装を常にペアで更新する（`README` / `docs` / `samples`）
