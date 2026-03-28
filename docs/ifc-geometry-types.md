# IFC ジオメトリ種類 総覧

IfcOpenShell のスキーマを基に、IFC で扱われるジオメトリ種類を整理したドキュメントです。

---

## 凡例

| 記号 | 意味 |
|------|------|
| ✅ | このプレイグラウンドに実装済み |
| 🔨 | 実装予定 |
| 📋 | 将来実装候補 |
| ⛔ | 実装対象外 |

---

## 1. Swept Solid（スイープソリッド）

### 1.1 IfcSweptAreaSolid（抽象）

断面プロファイル（`IfcProfileDef`）をスイープして立体を生成する抽象基底型。

#### IfcExtrudedAreaSolid ✅

断面プロファイルを直線方向に押し出してソリッドを生成する。

**属性**
- `SweptArea` – 断面プロファイル（`IfcProfileDef`）
- `Position` – 配置（`IfcAxis2Placement3D`）
- `ExtrudedDirection` – 押し出し方向（`IfcDirection`）
- `Depth` – 押し出し深さ

**使用例**
壁・梁・柱など、一定形状の断面を持つ部材全般。

---

#### IfcExtrudedAreaSolidTapered 🔨

始端と終端で異なるプロファイルを持ち、テーパー状に押し出すソリッド。

**属性**
- `SweptArea` – 始端プロファイル（`IfcProfileDef`）
- `Position` – 配置（`IfcAxis2Placement3D`）
- `ExtrudedDirection` – 押し出し方向（`IfcDirection`）
- `Depth` – 深さ
- `EndSweptArea` – 終端プロファイル（`IfcProfileDef`）

**使用例**
テーパー梁・ピラミッド状部材・先細り形状。

---

#### IfcRevolvedAreaSolid 🔨

断面プロファイルを軸周りに回転スイープしてソリッドを生成する。

**属性**
- `SweptArea` – 断面プロファイル（`IfcProfileDef`）
- `Position` – 配置（`IfcAxis2Placement3D`）
- `Axis` – 回転軸（`IfcAxis1Placement`）
- `Angle` – 回転角度（ラジアン）

**使用例**
円筒・ドーム・回転体形状（パイプフランジなど）。完全な回転（2π）で閉じた回転体になる。

---

#### IfcRevolvedAreaSolidTapered 🔨

始端と終端で異なるプロファイルを持ち、軸周りに回転スイープするソリッド（`IfcRevolvedAreaSolid` のサブタイプ）。

**属性**
- `SweptArea` – 始端プロファイル（`IfcProfileDef`）
- `Position` – 配置（`IfcAxis2Placement3D`）
- `Axis` – 回転軸（`IfcAxis1Placement`）
- `Angle` – 回転角度（ラジアン）
- `EndSweptArea` – 終端プロファイル（`IfcProfileDef`）

---

#### IfcFixedReferenceSweptAreaSolid 📋

3D 曲線（Directrix）に沿って断面をスイープするソリッド。断面の向きが固定参照方向を基準に決まる。

**属性**
- `SweptArea` – 断面プロファイル（`IfcProfileDef`）
- `Position` – 配置（`IfcAxis2Placement3D`）
- `Directrix` – ガイド曲線（`IfcCurve`）
- `StartParam` / `EndParam` – トリムパラメータ
- `FixedReference` – 固定参照方向（`IfcDirection`）

**使用例**
曲線梁・曲線状の構造部材。

---

### 1.2 IfcSweptDiskSolid 🔨

3D 曲線（Directrix）に沿って円形断面をスイープする。パイプ形状に特化。

**属性**
- `Directrix` – 中心線となる 3D 曲線（`IfcCurve`）
- `Radius` – 外径
- `InnerRadius` – 内径（オプション、中空パイプ用）
- `StartParam` / `EndParam` – 曲線の開始・終了パラメータ

**使用例**
配管・ケーブルダクト・曲がりパイプ。

---

### 1.3 IfcSectionedSolidHorizontal 📋

水平アライメント曲線上に複数断面を配置し、補間して立体を生成する（`IfcSectionedSolid` のサブタイプ）。インフラ（道路・鉄道）用。

**属性**
- `Directrix` – 基準曲線（`IfcCurve`）
- `CrossSections` – 断面プロファイルのリスト（`IfcProfileDef[]`）
- `CrossSectionPositions` – 各断面の配置位置リスト

**使用例**
橋梁・道路断面・鉄道線形に沿った部材。

---

---

## 2. CSGプリミティブ（IfcCsgPrimitive3D）

単純な幾何形状の基本立体。`IfcCsgPrimitive3D` の具象サブタイプ。ブーリアン演算のオペランドとしても使える。

### IfcBlock 📋

直方体プリミティブ。

**属性**
- `Position` – 配置（`IfcAxis2Placement3D`）
- `XLength` / `YLength` / `ZLength` – 各辺の長さ

---

### IfcRectangularPyramid 📋

四角錐プリミティブ。

**属性**
- `Position` – 配置（`IfcAxis2Placement3D`）
- `XLength` / `YLength` – 底面の辺の長さ
- `Height` – 高さ

---

### IfcRightCircularCone 📋

直円錐プリミティブ。

**属性**
- `Position` – 配置（`IfcAxis2Placement3D`）
- `Height` – 高さ
- `BottomRadius` – 底面半径

---

### IfcRightCircularCylinder 🔨

直円柱プリミティブ。

**属性**
- `Position` – 配置（`IfcAxis2Placement3D`）
- `Height` – 高さ
- `Radius` – 半径

---

### IfcSphere 🔨

球体プリミティブ。

**属性**
- `Position` – 中心と姿勢（`IfcAxis2Placement3D`）
- `Radius` – 半径

---

---

## 3. ブーリアン演算（IfcBooleanResult）

複数のソリッドを論理演算で合成する。

### IfcBooleanResult ✅

2 つのオペランドに対してブーリアン演算を行う。

**属性**
- `Operator` – 演算種別: `DIFFERENCE` / `UNION` / `INTERSECTION`
- `FirstOperand` – 第1オペランド（ソリッドまたは別の `IfcBooleanResult`）
- `SecondOperand` – 第2オペランド（ソリッドまたは `IfcHalfSpaceSolid` 系）

**演算種別**

| 演算 | 説明 | 実装状況 |
|------|------|--------|
| `DIFFERENCE` | 第1から第2を切り取る | ✅ |
| `UNION` | 2 つを結合する | 🔨 |
| `INTERSECTION` | 共通部分を取り出す | 📋 |

---

### IfcHalfSpaceSolid 🔨

平面で分割された半無限空間。ブーリアン演算の第2オペランドとして使われる。

**属性**
- `BaseSurface` – 境界サーフェス（通常 `IfcPlane`）
- `AgreementFlag` – `true` で法線方向側、`false` で逆側

**使用例**
壁や床で部材をクリップする場合。

---

### IfcPolygonalBoundedHalfSpace 🔨

`IfcHalfSpaceSolid` の特殊化。ポリゴンで境界を限定した半空間。

**属性**
- `BaseSurface` – 境界サーフェス（`IfcPlane`）
- `AgreementFlag` – 法線方向選択
- `Position` – ポリゴンの配置（`IfcAxis2Placement3D`）
- `PolygonalBoundary` – 2D 境界ポリゴン（`IfcBoundedCurve`）

**使用例**
窓・ドアの開口クリッピング。

---

---

## 4. BRep・テッセレーション（実装対象外）

以下の形状表現は頂点・辺・フェースを直接指定する必要があり、パラメータベースの UI との相性が悪いため、このプレイグラウンドでは実装対象外とします。

| 分類 | 型名 |
|------|------|
| BRep | `IfcFacetedBrep`, `IfcAdvancedBrep` |
| サーフェスモデル | `IfcFaceBasedSurfaceModel`, `IfcShellBasedSurfaceModel` |
| テッセレーション | `IfcTriangulatedFaceSet`, `IfcPolygonalFaceSet` 等 |

将来的に何らかの形で対応する可能性はありますが、現時点では実装しない方針です。

---

---

## 5. プロファイル（IfcProfileDef）

スイープや押し出しに使われる 2D 断面形状。`IfcSweptAreaSolid` の `SweptArea` 属性として参照される形状構成パーツ。

### 5.1 基本プロファイル

| 型名 | 形状 | 主な属性 | 実装状況 |
|------|------|---------|--------|
| `IfcRectangleProfileDef` | 矩形 | `XDim`, `YDim` | ✅ |
| `IfcRectangleHollowProfileDef` | 角形中空（角パイプ） | `XDim`, `YDim`, `WallThickness`, `InnerFilletRadius`, `OuterFilletRadius` | 🔨 |
| `IfcCircleProfileDef` | 円形 | `Radius` | 🔨 |
| `IfcCircleHollowProfileDef` | 円形中空（丸パイプ） | `Radius`, `WallThickness` | 🔨 |
| `IfcRoundedRectangleProfileDef` | 角丸矩形 | `XDim`, `YDim`, `RoundingRadius` | 📋 |
| `IfcEllipseProfileDef` | 楕円形 | `SemiAxis1`, `SemiAxis2` | 📋 |
| `IfcTrapeziumProfileDef` | 台形 | `BottomXDim`, `TopXDim`, `YDim`, `TopXOffset` | 📋 |

### 5.2 鋼材断面プロファイル

| 型名 | 形状 | 主な属性 | 実装状況 |
|------|------|---------|--------|
| `IfcIShapeProfileDef` | I形 (H鋼) | `OverallWidth`, `OverallDepth`, `WebThickness`, `FlangeThickness` | 🔨 |
| `IfcLShapeProfileDef` | L形 (アングル) | `Depth`, `Width`, `Thickness` | 🔨 |
| `IfcTShapeProfileDef` | T形 | `Depth`, `FlangeWidth`, `WebThickness`, `FlangeThickness` | 📋 |
| `IfcUShapeProfileDef` | U形 (チャンネル) | `Depth`, `FlangeWidth`, `WebThickness`, `FlangeThickness` | 📋 |
| `IfcCShapeProfileDef` | C形 (リップ付き) | `Depth`, `Width`, `WallThickness`, `Girth` | 📋 |
| `IfcZShapeProfileDef` | Z形 | `Depth`, `FlangeWidth`, `WebThickness`, `FlangeThickness` | 📋 |
| `IfcAsymmetricIShapeProfileDef` | 非対称 I形 | 上下フランジを個別指定 | 📋 |

### 5.3 汎用プロファイル

| 型名 | 形状 | 主な属性 | 実装状況 |
|------|------|---------|--------|
| `IfcArbitraryClosedProfileDef` | 任意閉曲線 | `OuterCurve` (`IfcCurve`) | ✅ |
| `IfcArbitraryProfileDefWithVoids` | 穴あき任意閉曲線 | `OuterCurve`, `InnerCurves[]` | 🔨 |
| `IfcArbitraryOpenProfileDef` | 任意開曲線 | `Curve` (`IfcCurve`) | 📋 |

### 5.4 複合・変換プロファイル

| 型名 | 説明 | 実装状況 |
|------|------|--------|
| `IfcCompositeProfileDef` | 複数プロファイルの結合 | 📋 |
| `IfcDerivedProfileDef` | 別プロファイルを変換（回転・移動・鏡像）した派生 | 📋 |

---

---

## 6. 曲線（IfcCurve）

スイープパス・断面輪郭などで参照される形状構成パーツ。`IfcSweptDiskSolid` の `Directrix` や `IfcArbitraryClosedProfileDef` の `OuterCurve` として使われる。

| 型名 | 説明 |
|------|------|
| `IfcPolyline` | 折れ線（直線セグメントの連結） |
| `IfcIndexedPolyCurve` | 座標リストとインデックスで定義されるポリカーブ（直線・円弧セグメント混在可） |
| `IfcCircle` | 円曲線（`IfcTrimmedCurve` でトリム可能） |
| `IfcEllipse` | 楕円曲線 |
| `IfcTrimmedCurve` | 他の曲線をパラメータまたは点でトリムした曲線 |
| `IfcCompositeCurve` | 複数セグメントを連結した複合曲線 |
| `IfcBSplineCurveWithKnots` | Bスプライン曲線（ノット明示） |

---

---

## 参考リソース

- [IFC4 Specification – buildingSMART](https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/HTML/)
- [IFC4.3 Specification](https://ifc43-docs.buildingsmart.org/)
- [IfcOpenShell GitHub](https://github.com/IfcOpenShell/IfcOpenShell)
