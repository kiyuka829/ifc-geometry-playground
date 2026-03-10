# operation-implementation

IFC 形状オペレーション（`src/ifc/operations/*.ts`）を追加実装するための手順。

## いつ使うか

- 新しい IFC 形状概念（例: `IfcRevolvedAreaSolid`）を実装するとき
- 既存 operation を共通 API に合わせて改善するとき

## 入力

- IFC エンティティ名
- 必要パラメータ（座標系、断面、方向、角度/深さなど）
- 期待される可視化要素（軸、断面、結果形状）

## 手順

1. `src/ifc/schema.ts` に必要最小限の型を追加
2. `src/ifc/operations/<name>.ts` に operation 本体を実装
3. 入力検証（範囲、ゼロ長ベクトル、角度制約）を追加
4. Babylon.js メッシュ生成処理を実装
5. 可視化用補助情報（gizmo 用データ）を返す
6. 対応 sample を最低 1 件追加
7. README の対応形状リストを更新

## 完了条件

- operation 単体で shape 生成が再現できる
- sample 経由で UI から操作できる
- 説明文と IFC 用語が一致している
