# IFC ジオメトリ種類 総覧

web-ifc の C++ ソース（`IfcGeometryProcessor.cpp` / `IfcGeometryLoader.cpp`）を基に、IFC で扱われるジオメトリ種類を網羅的に整理したドキュメントです。

---

## 凡例

| 記号 | 意味 |
|------|------|
| ✅ | このプレイグラウンドに実装済み |
| 🔨 | 優先的に実装したい（効果が高い） |
| 📋 | 実装候補（余力あれば） |
| ⚙️ | 内部処理用・単体サンプル化は不要 |
| ❌ | web-ifc 未対応（パース・変換されない） |

---

## 1. ソリッド形状（Swept Solid）

プロファイル（断面）を何らかの方法でスイープして立体を作るタイプ。最もよく使われる。

### 1.1 IfcExtrudedAreaSolid ✅
断面プロファイルを直線方向に押し出してソリッドを生成する。

**属性**
- `SweptArea` – 断面プロファイル（`IfcProfileDef`）
- `Position` – 配置（`IfcAxis2Placement3D`）
- `ExtrudedDirection` – 押し出し方向（`IfcDirection`）
- `Depth` – 押し出し深さ

**使用例**
壁・梁・柱など、一定形状の断面を持つ部材全般。

```
IFCEXTRUDEDAREASOLID(#10, #20, #30, 3.0);
  #10 = IFCRECTANGLEPROFILEDEF('AREA', $, $, 0.3, 0.5);
  #30 = IFCDIRECTION((0., 0., 1.));
```

---

### 1.2 IfcExtrudedAreaSolidTapered 🔨
始端と終端で異なるプロファイルを持ち、テーパー状に押し出すソリッド。

**属性**
- `SweptArea` – 始端プロファイル
- `Position` – 配置
- `ExtrudedDirection` – 押し出し方向
- `Depth` – 深さ
- `EndSweptArea` – 終端プロファイル（始端と形状が対応）

**使用例**
テーパー梁・ピラミッド状部材・先細り形状。

---

### 1.3 IfcRevolvedAreaSolid 🔨
断面プロファイルを軸周りに回転スイープしてソリッドを生成する。

**属性**
- `SweptArea` – 断面プロファイル
- `Position` – 配置
- `Axis` – 回転軸（`IfcAxis1Placement`）
- `Angle` – 回転角度（ラジアン）

**使用例**
円筒・ドーム・回転体形状（パイプフランジなど）。完全な回転（2π）で閉じた回転体になる。

---

### 1.4 IfcSweptDiskSolid 🔨
3D 曲線（ディレクトリクス）に沿って円形断面をスイープする。パイプ形状に特化。

**属性**
- `Directrix` – 中心線となる 3D 曲線（`IfcCurve`）
- `Radius` – 外径
- `InnerRadius` – 内径（オプション、中空パイプ用）
- `StartParam` / `EndParam` – 曲線の開始・終了パラメータ

**使用例**
配管・ケーブルダクト・曲がりパイプ。

---

### 1.5 IfcSurfaceCurveSweptAreaSolid 📋
サーフェス上の曲線（ディレクトリクス）に沿って断面をスイープする。

**属性**
- `SweptArea` – 断面プロファイル
- `Position` – 配置
- `Directrix` – ガイド曲線（`IfcCurve`）
- `StartParam` / `EndParam` – トリムパラメータ
- `ReferenceSurface` – 参照サーフェス

**使用例**
曲面上を走る梁や手摺。`IfcSweptDiskSolid` の一般化。

---

### 1.6 IfcFixedReferenceSweptAreaSolid 📋
固定参照方向を持つスイープソリッド。断面の向きが固定方向を基準に決まる。

**属性**
- `SweptArea` – 断面プロファイル
- `Position` – 配置
- `Directrix` – ガイド曲線
- `StartParam` / `EndParam` – トリムパラメータ
- `FixedReference` – 固定参照方向（`IfcDirection`）

---

### 1.7 IfcDirectrixDerivedReferenceSweptAreaSolid 📋
ディレクトリクスの接線ベクトルから参照方向を導くスイープソリッド（`IfcFixedReferenceSweptAreaSolid` のサブタイプ）。

---

### 1.8 IfcSectionedSolid 📋
複数断面を 3D 曲線上の位置に配置し、それらを補間して立体を生成する。

**属性**
- `Directrix` – 基準曲線
- `CrossSections` – 断面プロファイルのリスト
- `CrossSectionPositions` – 各断面の配置位置リスト

**使用例**
水平方向に断面が変化する橋梁・不均一な構造部材。

---

### 1.9 IfcSectionedSolidHorizontal 📋
水平アライメント曲線上における `IfcSectionedSolid`。インフラ（道路・鉄道）用。

---

---

## 2. CSG プリミティブ（Primitive Solids）

単純な幾何形状の基本立体。

### 2.1 IfcSphere 🔨
球体プリミティブ。

**属性**
- `Position` – 中心と姿勢（`IfcAxis2Placement3D`）
- `Radius` – 半径

---

### 2.2 IfcRightCircularCylinder 🔨
直円柱プリミティブ。

**属性**
- `Position` – 配置（`IfcAxis2Placement3D`）
- `Height` – 高さ
- `Radius` – 半径

web-ifc では内部的に円形プロファイルの Extrude として処理される。

---

### 2.3 IfcBlock 📋
直方体プリミティブ（IFC2x3では未実装が多い）。`IfcExtrudedAreaSolid` + 矩形プロファイルで代替される場合が多い。

---

### 2.4 IfcRightCircularCone 📋
直円錐プリミティブ（web-ifc での実装状況: ソースに case なし → 未対応）。

---

---

## 3. ブーリアン演算（Boolean Operations）

複数のソリッドを論理演算で合成する。

### 3.1 IfcBooleanResult ✅
2 つのオペランドに対してブーリアン演算を行う。

**属性**
- `Operator` – 演算種別: `DIFFERENCE` / `UNION` / `INTERSECTION`
- `FirstOperand` – 第1オペランド（ソリッドまたは別の IfcBooleanResult）
- `SecondOperand` – 第2オペランド

**演算種別**

| 演算 | 説明 | 実装状況 |
|------|------|--------|
| DIFFERENCE | 第1から第2を切り取る | ✅ |
| UNION | 2 つを結合する | 🔨 |
| INTERSECTION | 共通部分を取り出す | 📋 |

---

### 3.2 IfcBooleanClippingResult 📋
`IfcBooleanResult` の特殊ケース。`DIFFERENCE` 演算に限定されるが、第2オペランドが必ず半空間（`IfcHalfSpaceSolid` 系）であることが保証される。

---

### 3.3 IfcHalfSpaceSolid 📋
平面で分割された半無限空間。主にブーリアン演算の第2オペランドとして使われる。

**属性**
- `BaseSurface` – 境界サーフェス（通常 `IfcPlane`）
- `AgreementFlag` – true で法線方向側、false で逆側

**使用例**
壁や床で部材をクリップする場合。

---

### 3.4 IfcPolygonalBoundedHalfSpace 📋
`IfcHalfSpaceSolid` の特殊化。ポリゴンで境界を限定した半空間。

**属性**
- `BaseSurface` – 境界サーフェス
- `AgreementFlag` – 法線方向選択
- `Position` – ポリゴンの配置
- `PolygonalBoundary` – 2D 境界ポリゴン（`IfcBoundedCurve`）

---

---

## 4. BRep（境界表現 / Boundary Representation）

フェース・エッジ・頂点で形状を記述する高精度表現。

### 4.1 IfcFacetedBrep ⚙️
平面フェースのみで形成されたBRep。フェースはポリゴンのみ（曲面フェースなし）。

**属性**
- `Outer` – 外側シェル（`IfcClosedShell`）

構成要素: `IfcClosedShell` → `IfcFace` → `IfcFaceBound` / `IfcFaceOuterBound` → `IfcPolyLoop`

---

### 4.2 IfcAdvancedBrep ⚙️
`IfcFacetedBrep` の高度版。曲面フェース（`IfcAdvancedFace`）を含み、NURBS等の精密なサーフェスを持てる。

**属性**
- `Outer` – 外側シェル（`IfcClosedShell`）

構成要素: `IfcClosedShell` → `IfcAdvancedFace` → `IfcFaceBound` → `IfcEdgeLoop` → `IfcOrientedEdge` → `IfcEdgeCurve`

---

### 4.3 IfcFaceBasedSurfaceModel ⚙️
フェースのリストで形成されたサーフェスモデル（閉じていなくてもよい）。

---

### 4.4 IfcShellBasedSurfaceModel ⚙️
シェルのリストで形成されたサーフェスモデル（開いたシェルも可）。

---

---

## 5. テッセレーション（Tessellated Geometry）

三角形や多角形の頂点インデックスで定義される軽量な表現。ゲームエンジン・汎用3Dフォーマットに近い形式。

### 5.1 IfcTriangulatedFaceSet 🔨
三角形ポリゴンの頂点インデックスリストで表現されるメッシュ。

**属性**
- `Coordinates` – 頂点座標リスト（`IfcCartesianPointList3D`）
- `Normals` – 法線リスト（オプション）
- `Closed` – 閉じたメッシュかどうか
- `CoordIndex` – 三角形インデックスリスト（1-indexed）
- `PnIndex` – 法線インデックス（オプション）

**使用例**
3D ソフトウェアからエクスポートされたメッシュデータ。

---

### 5.2 IfcTriangulatedIrregularNetwork 📋
`IfcTriangulatedFaceSet` と同形式。地形メッシュ（TIN: Triangulated Irregular Network）に特化。フラグ情報なども持てる。

---

### 5.3 IfcPolygonalFaceSet 🔨
多角形（ポリゴン）インデックスリストで表現されるメッシュ。三角形に限らず任意のポリゴン数。

**属性**
- `Coordinates` – 頂点座標リスト（`IfcCartesianPointList3D`）
- `Closed` – メッシュが閉じているか（オプション）
- `Faces` – 多角形フェースリスト（`IfcIndexedPolygonalFace`）
- `PnIndex` – 法線インデックス（オプション）

---

### 5.4 IfcIndexedPolygonalFace ⚙️
`IfcPolygonalFaceSet` の各フェース要素。多角形の頂点インデックスを保持。

---

### 5.5 IfcIndexedPolygonalFaceWithVoids ⚙️
`IfcIndexedPolygonalFace` のサブタイプ。内側に穴（ボイド）を持てる。

---

---

## 6. サーフェス（Surfaces）

ソリッドの境界面として利用されるサーフェス表現。主に BRep の `IfcAdvancedFace` で参照される。

### 6.1 IfcPlane ⚙️
平面サーフェス。`IfcHalfSpaceSolid` の境界や BRep のフェースとして使われる。

**属性**
- `Position` – 配置（`IfcAxis2Placement3D`）

---

### 6.2 IfcCylindricalSurface ⚙️
円筒サーフェス。`IfcAdvancedFace` で参照される円柱側面。

**属性**
- `Position` – 配置
- `Radius` – 半径

---

### 6.3 IfcSurfaceOfRevolution ⚙️
プロファイル曲線を軸周りに回転させたサーフェス。

**属性**
- `SweptCurve` – プロファイル曲線（`IfcProfileDef`）
- `Position` – 配置
- `AxisPosition` – 回転軸（`IfcAxis1Placement`）

---

### 6.4 IfcSurfaceOfLinearExtrusion ⚙️
プロファイル曲線を直線方向に押し出したサーフェス。

**属性**
- `SweptCurve` – プロファイル曲線
- `Position` – 配置
- `ExtrudedDirection` – 押し出し方向
- `Depth` – 深さ

---

### 6.5 IfcBSplineSurface ⚙️
Bスプライン曲面。自由曲面の基本形。

**属性**
- `UDegree` / `VDegree` – U/V 方向次数
- `ControlPointsList` – 制御点グリッド
- `SurfaceForm` – 曲面形状種別
- `UClosed` / `VClosed` – 閉じているか

---

### 6.6 IfcBSplineSurfaceWithKnots ⚙️
ノットベクトルを明示した Bスプライン曲面。

追加属性: `UMultiplicities`, `VMultiplicities`, `UKnots`, `VKnots`, `KnotSpec`

---

### 6.7 IfcRationalBSplineSurfaceWithKnots ⚙️
有理 Bスプライン（NURBS）曲面。重みを持つため、正確な二次曲面（球・円柱など）を表現できる。

追加属性: `WeightsData`

---

### 6.8 IfcSectionedSurface 📋
曲線上の複数断面で定義されるサーフェス（道路インフラ等）。

---

---

## 7. 曲線（Curves）

断面輪郭・スイープパス・アライメントなどに使用される曲線形状。

### 7.1 IfcPolyline ⚙️
直線セグメントを繋いだポリライン。

**属性**
- `Points` – 点のリスト（`IfcCartesianPoint`）

---

### 7.2 IfcCompositeCurve ⚙️
複数のセグメントを連結した複合曲線。

**属性**
- `Segments` – セグメントリスト（`IfcCompositeCurveSegment`）
- `SelfIntersect` – 自己交差の有無

---

### 7.3 IfcTrimmedCurve ⚙️
カーブをパラメータまたは点でトリムした曲線。

**属性**
- `BasisCurve` – 元となる曲線
- `Trim1` / `Trim2` – トリム位置（パラメータ値または点座標）
- `SenseAgreement` – 向きの一致/反転
- `MasterRepresentation` – どちらの表現を優先するか

---

### 7.4 IfcCircle ⚙️
円曲線（完全円または IfcTrimmedCurve でトリム可能）。

**属性**
- `Position` – 配置（`IfcAxis2Placement2D` または 3D）
- `Radius` – 半径

---

### 7.5 IfcEllipse ⚙️
楕円曲線。

**属性**
- `Position` – 配置
- `SemiAxis1` – 長半径
- `SemiAxis2` – 短半径

---

### 7.6 IfcLine ⚙️
無限直線。`IfcTrimmedCurve` と組み合わせて有限線分として使う。

**属性**
- `Pnt` – 基点（`IfcCartesianPoint`）
- `Dir` – 方向ベクトル（`IfcVector`、長さを含む）

---

### 7.7 IfcIndexedPolyCurve ⚙️
座標リストとセグメントインデックスで定義されるポリカーブ。直線セグメントと弧セグメントを混在できる。

**属性**
- `Points` – 座標リスト（`IfcCartesianPointList2D`）
- `Segments` – インデックスセグメントリスト（`IfcLineIndex` / `IfcArcIndex`）
- `SelfIntersect` – 自己交差の有無

---

### 7.8 IfcBSplineCurve ⚙️
Bスプライン曲線。自由曲線の基本形。

**属性**
- `Degree` – 次数
- `ControlPointsList` – 制御点リスト
- `CurveForm` – 曲線形状種別
- `ClosedCurve` – 閉じているか
- `SelfIntersect` – 自己交差の有無

---

### 7.9 IfcBSplineCurveWithKnots ⚙️
ノットベクトルを明示した Bスプライン曲線。

---

### 7.10 IfcRationalBSplineCurveWithKnots ⚙️
有理 Bスプライン（NURBS）曲線。重みを持ち、正確な円弧等を表現できる。

---

### 7.11 IfcPolynomialCurve ⚙️
多項式で定義される曲線（アライメント計算用）。

---

### 7.12 IfcClothoid ⚙️
クロソイド曲線（コルニュスパイラル）。高速道路・鉄道の線形計算で使用。

**属性**
- `Position` – 配置
- `ClothoidConstant` – クロソイド定数 A（A² = R × L）

---

### 7.13 IfcGradientCurve ⚙️
水平曲線と垂直プロファイルを組み合わせた 3D アライメント曲線。IFC 4.3 インフラ向け。

---

### 7.14 IfcCurveSegment ⚙️
`IfcGradientCurve` や `IfcSegmentedReferenceCurve` を構成する個別セグメント。

---

### 7.15 IfcSegmentedReferenceCurve ⚙️
複数セグメントから成る参照曲線。アライメントの各区間を表現。

---

---

## 8. プロファイル（Profile Definitions）

スイープや押し出しに使われる 2D 断面形状。

### 8.1 基本プロファイル

| 型名 | 形状 | 主な属性 | 実装状況 |
|------|------|---------|--------|
| `IfcRectangleProfileDef` | 矩形 | `XDim`, `YDim` | ✅ |
| `IfcRoundedRectangleProfileDef` | 角丸矩形 | `XDim`, `YDim`, `RoundingRadius` | 🔨 |
| `IfcRectangleHollowProfileDef` | 角形中空（角パイプ） | `XDim`, `YDim`, `WallThickness`, `InnerFilletRadius`, `OuterFilletRadius` | 🔨 |
| `IfcCircleProfileDef` | 円形 | `Radius` | 🔨 |
| `IfcCircleHollowProfileDef` | 円形中空（丸パイプ） | `Radius`, `WallThickness` | 🔨 |
| `IfcEllipseProfileDef` | 楕円形 | `SemiAxis1`, `SemiAxis2` | 📋 |
| `IfcTrapeziumProfileDef` | 台形 | `BottomXDim`, `TopXDim`, `YDim`, `TopXOffset` | 📋 |

### 8.2 鋼材断面プロファイル

| 型名 | 形状 | 主な属性 | 実装状況 |
|------|------|---------|--------|
| `IfcIShapeProfileDef` | I形 (H鋼) | `OverallWidth`, `OverallDepth`, `WebThickness`, `FlangeThickness` | 🔨 |
| `IfcAsymmetricIShapeProfileDef` | 非対称 I形 | 上下フランジを個別指定 | 📋 |
| `IfcLShapeProfileDef` | L形 (アングル) | `Depth`, `Width`, `Thickness` | 🔨 |
| `IfcTShapeProfileDef` | T形 | `Depth`, `FlangeWidth`, `WebThickness`, `FlangeThickness` | 📋 |
| `IfcUShapeProfileDef` | U形 (チャンネル) | `Depth`, `FlangeWidth`, `WebThickness`, `FlangeThickness` | 📋 |
| `IfcCShapeProfileDef` | C形 (リップ付き) | `Depth`, `Width`, `WallThickness`, `Girth` | 📋 |
| `IfcZShapeProfileDef` | Z形 | `Depth`, `FlangeWidth`, `WebThickness`, `FlangeThickness` | 📋 |

### 8.3 汎用プロファイル

| 型名 | 形状 | 主な属性 | 実装状況 |
|------|------|---------|--------|
| `IfcArbitraryClosedProfileDef` | 任意閉曲線 | `OuterCurve` (IfcCurve) | ✅ |
| `IfcArbitraryOpenProfileDef` | 任意開曲線 | `Curve` (IfcCurve) | 📋 |
| `IfcArbitraryProfileDefWithVoids` | 穴あき任意閉曲線 | `OuterCurve`, `InnerCurves[]` | 🔨 |
| `IfcOpenCrossProfileDef` | 開放断面（インフラ用） | `HorizontalWidths`, `Slopes` | 📋 |

### 8.4 複合・変換プロファイル

| 型名 | 説明 | 実装状況 |
|------|------|--------|
| `IfcCompositeProfileDef` | 複数プロファイルの結合 | 📋 |
| `IfcDerivedProfileDef` | 別プロファイルを変換（回転・移動・鏡像）した派生 | 📋 |

---

---

## 9. アライメント（Alignment / 線形）

インフラ（道路・鉄道）特有の 3D 線形を記述するエンティティ群（IFC 4.1 / 4.3 で追加）。

### 9.1 IfcAlignment ⚙️
水平・垂直の線形セグメントをまとめるルートエンティティ。

### 9.2 IfcAlignmentHorizontal ⚙️
水平方向の線形定義。`IfcAlignmentSegment` のリストを持つ。

### 9.3 IfcAlignmentVertical ⚙️
垂直（縦断）方向の線形定義。

### 9.4 IfcAlignmentSegment ⚙️
線形の各区間。実際の幾何情報は `IfcAlignmentHorizontalSegment` / `IfcAlignmentVerticalSegment` が持つ。

### 9.5 IfcAlignmentHorizontalSegment ⚙️
水平セグメントの幾何定義。

| `PredefinedType` | 説明 |
|-----------------|------|
| `LINE` | 直線 |
| `CIRCULARARC` | 円弧 |
| `CLOTHOID` | クロソイド（緩和曲線） |
| `CUBICSPIRAL` | 三次曲線（未実装）|
| その他 | `BIQUADRATICPARABOLA`, `BLOSSCURVE` 等（未実装）|

### 9.6 IfcAlignmentVerticalSegment ⚙️
縦断セグメントの幾何定義。

| `PredefinedType` | 説明 |
|-----------------|------|
| `CONSTANTGRADIENT` | 定勾配 |
| `CIRCULARARC` | 円弧 |
| `PARABOLICARC` | 放物線（縦曲線） |
| `CLOTHOID` | クロソイド（未実装）|

---

---

## 10. 表現コンテナ（Representation）

ジオメトリを IFC エレメントにバインドするコンテナ型。

| 型名 | 説明 | 実装状況 |
|------|------|--------|
| `IfcProductDefinitionShape` | 製品形状の定義 | ⚙️ |
| `IfcProductRepresentation` | 製品表現の基底 | ⚙️ |
| `IfcShapeRepresentation` | 個別の形状表現 | ⚙️ |
| `IfcTopologyRepresentation` | トポロジ表現 | ⚙️ |
| `IfcRepresentationMap` | 再利用可能な形状マップ | ⚙️ |
| `IfcMappedItem` | 配置変換付き形状参照 | 📋 |
| `IfcGeometricSet` | 幾何要素のセット | ⚙️ |
| `IfcGeometricCurveSet` | 曲線要素のセット | ⚙️ |
| `IfcBoundingBox` | バウンディングボックス（表示には使わない）| ⚙️ |

---

---

## 11. その他のジオメトリ要素

| 型名 | 説明 | 実装状況 |
|------|------|--------|
| `IfcCartesianPoint` | 3D 点（表現アイテムとして直接使用可） | ⚙️ |
| `IfcEdge` / `IfcEdgeCurve` | 辺要素（ポリライン的出力） | ⚙️ |
| `IfcTextLiteral` | テキスト注記 | ❌（未実装）|
| `IfcTextLiteralWithExtent` | 境界付きテキスト注記 | ❌（未実装）|

---

---

## 12. 配置・座標系

ジオメトリの位置・姿勢を定義するエンティティ。

| 型名 | 説明 |
|------|------|
| `IfcAxis2Placement3D` | 3D 配置（原点 + 軸方向 + 参照方向） |
| `IfcAxis2Placement2D` | 2D 配置 |
| `IfcAxis1Placement` | 1軸配置（回転軸用） |
| `IfcLocalPlacement` | 相対ローカル配置 |
| `IfcLinearPlacement` | 線形参照配置（インフラ用） |
| `IfcAxis2PlacementLinear` | 線形上の 2D 配置 |
| `IfcCartesianTransformationOperator3D` | 3D アフィン変換 |
| `IfcCartesianTransformationOperator3DNonUniform` | 非一様スケーリングあり 3D 変換 |
| `IfcCartesianTransformationOperator2D` | 2D アフィン変換 |
| `IfcPointByDistanceExpression` | 曲線上の距離パラメータで指定した点 |

---

---

## 13. 実装優先度まとめ

このプレイグラウンドへの実装優先度を整理します。

### フェーズ 1（基礎強化）

| 型名 | カテゴリ | 理由 |
|------|---------|------|
| `IfcRevolvedAreaSolid` | Swept Solid | 建築部材で頻出（フランジ、アーチ）|
| `IfcExtrudedAreaSolidTapered` | Swept Solid | テーパー梁・テーパーコラムで多用 |
| `IfcCircleProfileDef` | Profile | 丸柱・パイプに必要 |
| `IfcCircleHollowProfileDef` | Profile | 鋼管 |
| `IfcRectangleHollowProfileDef` | Profile | 角形鋼管 |
| `IfcIShapeProfileDef` | Profile | H形鋼（最も代表的な鋼材断面） |
| `IfcLShapeProfileDef` | Profile | アングル材 |
| `IfcArbitraryProfileDefWithVoids` | Profile | 穴あきスラブ等 |

### フェーズ 2（形状バリエーション拡充）

| 型名 | カテゴリ | 理由 |
|------|---------|------|
| `IfcSweptDiskSolid` | Swept Solid | 配管・ケーブル |
| `IfcSphere` | Primitive | CSG デモ |
| `IfcRightCircularCylinder` | Primitive | CSG デモ |
| `IfcBooleanResult` (UNION) | Boolean | ブーリアン UNION の追加 |
| `IfcHalfSpaceSolid` | Boolean | クリッピング演算 |
| `IfcPolygonalBoundedHalfSpace` | Boolean | 窓開口クリッピング |
| `IfcTriangulatedFaceSet` | Tessellation | 外部メッシュ取り込み |
| `IfcPolygonalFaceSet` | Tessellation | 外部メッシュ取り込み |
| `IfcMappedItem` | Representation | 繰り返し配置 |

### フェーズ 3（高度・専門用途）

| 型名 | カテゴリ | 理由 |
|------|---------|------|
| `IfcFixedReferenceSweptAreaSolid` | Swept Solid | 曲線梁 |
| `IfcSectionedSolid` | Swept Solid | 変断面部材 |
| `IfcSectionedSolidHorizontal` | Swept Solid | 道路・鉄道インフラ |
| `IfcTShapeProfileDef` / `IfcUShapeProfileDef` 等 | Profile | 各種鋼材断面 |
| `IfcAlignment` 系 | Alignment | インフラ線形 |
| `IfcBSplineSurface` / `IfcAdvancedFace` | Surface / BRep | 高精度 NURBS 形状 |

---

---

## 参考リソース

- [IFC4 Specification – buildingSMART](https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/HTML/)
- [IFC4.3 Specification](https://ifc43-docs.buildingsmart.org/)
- [web-ifc GitHub](https://github.com/ThatOpen/engine_web-ifc)
- [`IfcGeometryProcessor.cpp`](https://github.com/ThatOpen/engine_web-ifc/blob/main/src/cpp/web-ifc/geometry/IfcGeometryProcessor.cpp)
- [`IfcGeometryLoader.cpp`](https://github.com/ThatOpen/engine_web-ifc/blob/main/src/cpp/web-ifc/geometry/IfcGeometryLoader.cpp)
