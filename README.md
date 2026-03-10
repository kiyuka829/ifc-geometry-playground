# IFC Geometry Playground

IFCの形状生成をインタラクティブに学習できるWebアプリケーションです。
Babylon.jsを使って3Dビジュアライゼーションを行い、パラメータをリアルタイムに変更しながらIFCの形状がどのように構成されているかを理解できます。

## デモ

[![Home Page](https://github.com/user-attachments/assets/dd87f9f2-1ac0-438f-9c8f-f57f5f737f3c)](https://kiyuka829.github.io/ifc-geometry-playground/)

## 目的

開発者やIFCについて理解を深めたい方に向けて、以下を可視化します：

- IFCの形状生成オペレーション（押出し、ブール演算など）
- 各オペレーションのパラメータとその効果
- IFC表現（疑似JSON形式）と3D形状の対応関係

## 対応形状タイプ

- [x] **IfcExtrudedAreaSolid** – 押出し（基本的な矩形プロファイル）
- [x] **IfcBooleanResult** – ブール差演算（DIFFERENCE）
- [ ] IfcRevolvedAreaSolid – 回転体
- [ ] IfcSweptDiskSolid – スイープ
- [ ] IfcBooleanResult (UNION / INTERSECTION)
- [ ] IfcMappedItem – 繰り返し配置
- [ ] IfcArbitraryClosedProfileDef – 任意形状プロファイル

## 方針

- **IFCを厳密にパースする**のではなく、**学習用に抽象化した表現**を扱います
- 各例題は独立したサンプル定義（`src/ifc/samples/`）として実装
- UIはサンプル定義から自動生成

## 画面構成

| エリア | 内容 |
|--------|------|
| 左パネル | パラメータスライダー、例題の説明 |
| 右（3Dビュー） | Babylon.js による3Dビジュアライゼーション |
| 左下 | ステッパー（形状生成の手順を段階的に追える） |
| 右下 | IFC Code（疑似JSON表現）/ Tree View（IFC構造ツリー） |

## ディレクトリ構成

```
src/
  engine/         Babylon.js ラッパ・共通3Dユーティリティ
    scene.ts      シーン・エンジン・ライト
    camera.ts     カメラ設定
    materials.ts  マテリアル定義
    gizmos.ts     方向ベクトル・軸ギズモ
  ifc/
    schema.ts     IFC型定義（学習用）
    operations/   IFC形状オペレーションの実装
      extrusion.ts
      boolean.ts
      placement.ts
    samples/      例題定義（パラメータ・生成パイプライン・説明文）
      extrusion.basic.ts
      boolean.difference.ts
  ui/
    ParameterPanel.ts   スライダー・数値入力UI
    Stepper.ts          ステップ表示UI
    TreeView.ts         IFC構造ツリー
    CodeView.ts         IFCコード表示
  pages/
    HomePage.ts         トップページ
    ExamplePage.ts      例題ページ（3パネルレイアウト）
  app/
    routes.ts           ハッシュルーティング定義
    App.ts              アプリケーションコントローラ
  types.ts              共通型定義
```

## 開発

```bash
npm install
npm run dev
```

## ビルド（GitHub Pages）

```bash
npm run build
# dist/ を GitHub Pages にデプロイ
```

## 技術スタック

- [Vite](https://vitejs.dev/) + TypeScript
- [Babylon.js](https://www.babylonjs.com/) v8 – 3Dレンダリング
- GitHub Pages（ハッシュルーティング）
