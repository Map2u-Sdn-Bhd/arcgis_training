import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "@arcgis/core/assets/esri/themes/light/main.css";
import MapView from "@arcgis/core/views/MapView";
import Map from "@arcgis/core/Map";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import LayerList from "@arcgis/core/widgets/LayerList";
import Legend from "@arcgis/core/widgets/Legend";
import Expand from "@arcgis/core/widgets/Expand";
import Search from "@arcgis/core/widgets/Search";
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery";
import Fullscreen from "@arcgis/core/widgets/Fullscreen";
import Home from "@arcgis/core/widgets/Home";
import Locate from "@arcgis/core/widgets/Locate";
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";

interface LayerInfo {
  id: string;
  title: string;
  url?: string;
  type: string;
}

function ChangeDetectionPage() {
  const mapDiv = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<MapView | null>(null);

  // ── Feature layer CD state ──
  const [featureAvailableLayers, setFeatureAvailableLayers] = useState<LayerInfo[]>([]);
  const [beforeFeatureLayer, setBeforeFeatureLayer] = useState<string>("");
  const [afterFeatureLayer, setAfterFeatureLayer] = useState<string>("");
  const [compareField, setCompareField] = useState<string>("gridcode");
  const [featureLayerFields, setFeatureLayerFields] = useState<string[]>([]);
  const [featureChangeActive, setFeatureChangeActive] = useState<boolean>(false);
  const [featureChangeLoading, setFeatureChangeLoading] = useState<boolean>(false);
  const [featureChangeProgress, setFeatureChangeProgress] = useState<string>("");
  const [featureQueryLimit, setFeatureQueryLimit] = useState<number>(0);
  const [featureChangeStats, setFeatureChangeStats] = useState<{
    totalArea: number;
    changesByType: Record<string, number>;
    featureCount: number;
  } | null>(null);
  const featureChangeResultRef = useRef<FeatureLayer | null>(null);

  // ── Expand widget portal ref ──
  const featureCDContainerRef = useRef<HTMLDivElement | null>(null);
  const [featureCDWidgetReady, setFeatureCDWidgetReady] = useState(false);

  // ── Map setup ──
  useEffect(() => {
    if (!mapDiv.current) return;

    const map = new Map({ basemap: "hybrid" });

    const view = new MapView({
      container: mapDiv.current,
      map,
      center: [102.52711221450218, 5.7326080728403],
      zoom: 10,
      popup: { dockEnabled: false },
    });

    viewRef.current = view;

    // ── Pre-loaded polygon layers (LULC 2021 & 2023) ──
    const lulc21PolygonLayer = new FeatureLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/Hosted/Lulc21_Polygon/FeatureServer",
      title: "LULC 2021 Polygon",
      outFields: ["*"],
      popupEnabled: true,
      visible: true,
    });

    const lulc23PolygonLayer = new FeatureLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/Hosted/Lulc23_Polygon/FeatureServer",
      title: "LULC 2023 Polygon",
      outFields: ["*"],
      popupEnabled: true,
      visible: true,
    });

    map.addMany([lulc21PolygonLayer, lulc23PolygonLayer]);

    // ── Tab button CSS ──
    if (!document.getElementById("cd-tab-style")) {
      const style = document.createElement("style");
      style.id = "cd-tab-style";
      style.textContent = `
        .cd-tab-btn {
          flex: 1; padding: 6px 4px; cursor: pointer; border: none;
          background: #e7e7e7; color: #000; font-size: 13px;
        }
        .cd-tab-btn:hover { background: #d0d0d0; }
        .cd-tab-btn.active { background: #0079c1; color: #fff; }
      `;
      document.head.appendChild(style);
    }

    // ── LayerList + Legend combined Expand ──
    const tabContainer = document.createElement("div");
    tabContainer.style.background = "white";

    const tabButtons = document.createElement("div");
    tabButtons.style.display = "flex";
    tabButtons.style.padding = "5px";

    const layerListTab = document.createElement("button");
    layerListTab.textContent = "Layers";
    layerListTab.classList.add("cd-tab-btn", "active");

    const legendTab = document.createElement("button");
    legendTab.textContent = "Legend";
    legendTab.classList.add("cd-tab-btn");

    tabButtons.appendChild(layerListTab);
    tabButtons.appendChild(legendTab);

    const layerListContent = document.createElement("div");
    layerListContent.style.width = "320px";
    layerListContent.style.display = "block";

    const legendContent = document.createElement("div");
    legendContent.style.width = "320px";
    legendContent.style.display = "none";

    new LayerList({ view, container: layerListContent });
    new Legend({ view, container: legendContent });

    layerListTab.addEventListener("click", () => {
      layerListContent.style.display = "block";
      legendContent.style.display = "none";
      layerListTab.classList.add("active");
      legendTab.classList.remove("active");
    });
    legendTab.addEventListener("click", () => {
      layerListContent.style.display = "none";
      legendContent.style.display = "block";
      legendTab.classList.add("active");
      layerListTab.classList.remove("active");
    });

    tabContainer.appendChild(tabButtons);
    tabContainer.appendChild(layerListContent);
    tabContainer.appendChild(legendContent);

    const layerListExpand = new Expand({
      view,
      content: tabContainer,
      expandTooltip: "Layer List & Legend",
      expandIcon: "legend",
    });
    view.ui.add(layerListExpand, "top-left");

    // ── Basic navigation widgets ──
    const home = new Home({ view });
    view.ui.add(home, "top-left");

    const locate = new Locate({ view });
    view.ui.add(locate, "top-left");

    const search = new Search({ view, includeDefaultSources: true });
    view.ui.add(search, { position: "top-left", index: 0 });

    const fullscreen = new Fullscreen({ view });
    view.ui.add(fullscreen, "top-right");

    const basemapGallery = new BasemapGallery({ view });
    const basemapExpand = new Expand({
      view,
      content: basemapGallery,
      expanded: false,
      expandTooltip: "Basemap Gallery",
    });
    view.ui.add(basemapExpand, "top-right");

    // ── Feature Layer CD Expand widget ──
    const featureCDDiv = document.createElement("div");
    featureCDDiv.style.backgroundColor = "white";
    featureCDContainerRef.current = featureCDDiv;

    const featureCDExpand = new Expand({
      view,
      content: featureCDDiv,
      expandTooltip: "Feature Layer Change Detection",
      expandIcon: "analysis",
      collapseTooltip: "Close Feature Layer Change Detection",
    });
    view.ui.add(featureCDExpand, "top-right");
    setFeatureCDWidgetReady(true);

    // ── Track feature layers on map ──
    const updateFeatureLayers = () => {
      const fLayers: LayerInfo[] = [];
      map.allLayers.forEach((layer) => {
        if (layer.type === "feature") {
          fLayers.push({
            id: layer.id,
            title: layer.title || "Untitled Layer",
            url: (layer as any).url,
            type: layer.type,
          });
        }
      });
      setFeatureAvailableLayers(fLayers);
    };

    view.when(() => {
      updateFeatureLayers();
      map.allLayers.on("change", updateFeatureLayers);
      if (view.popup) view.popup.defaultPopupTemplateEnabled = true;
    });

    return () => {
      view.destroy();
    };
  }, []);

  // ── Refresh feature layer list ──
  const refreshFeatureLayers = () => {
    if (!viewRef.current) return;
    const map = viewRef.current.map as __esri.Map;
    const fLayers: LayerInfo[] = [];
    map.allLayers.forEach((layer) => {
      if (layer.type === "feature") {
        fLayers.push({
          id: layer.id,
          title: layer.title || "Untitled Layer",
          url: (layer as any).url,
          type: layer.type,
        });
      }
    });
    setFeatureAvailableLayers(fLayers);
  };

  // ── Add feature layer from URL ──
  const addLayerFromUrl = async (url: string) => {
    if (!viewRef.current || !url.trim()) return;
    try {
      const layer = new FeatureLayer({ url: url.trim(), outFields: ["*"], popupEnabled: true });
      (viewRef.current.map as __esri.Map).add(layer);
    } catch (err) {
      console.error("Failed to add layer:", err);
      alert("❌ Could not add layer. Check the URL and try again.");
    }
  };

  // ── Load fields from before-layer for the compare-field dropdown ──
  const loadFeatureLayerFields = async (layerId: string) => {
    if (!viewRef.current || !layerId) {
      setFeatureLayerFields([]);
      return;
    }
    const layer = (viewRef.current.map as __esri.Map)?.allLayers.find(
      (l) => l.id === layerId
    ) as FeatureLayer | undefined;
    if (!layer) return;
    try {
      await layer.load();
      const allowed = ["oid", "integer", "small-integer", "double", "single", "big-integer", "string"];
      const fields = layer.fields.filter((f) => allowed.includes(f.type)).map((f) => f.name);
      setFeatureLayerFields(fields);
      if (fields.includes("gridcode")) setCompareField("gridcode");
      else if (fields.length > 0) setCompareField(fields[0]);
    } catch {
      /* ignore */
    }
  };

  // ── Feature Layer Change Detection ──
  const runFeatureLayerChangeDetection = async () => {
    if (!viewRef.current || !beforeFeatureLayer || !afterFeatureLayer) {
      alert("Please select both Before and After feature layers.");
      return;
    }
    if (beforeFeatureLayer === afterFeatureLayer) {
      alert("Please select two different layers.");
      return;
    }
    if (!compareField.trim()) {
      alert("Please enter a field name to compare (e.g. gridcode).");
      return;
    }

    const view = viewRef.current;
    const map = view.map as __esri.Map;

    if (featureChangeResultRef.current) {
      map.remove(featureChangeResultRef.current);
      featureChangeResultRef.current = null;
    }

    setFeatureChangeLoading(true);
    setFeatureChangeStats(null);

    try {
      const beforeFL = map.allLayers.find((l) => l.id === beforeFeatureLayer) as FeatureLayer | undefined;
      const afterFL = map.allLayers.find((l) => l.id === afterFeatureLayer) as FeatureLayer | undefined;

      if (!beforeFL || !afterFL) {
        alert("Selected layers not found on the map.");
        setFeatureChangeLoading(false);
        return;
      }

      const fetchAllFeatures = async (layer: FeatureLayer): Promise<__esri.Graphic[]> => {
        await layer.load();
        const pageSize = (layer as any).maxRecordCount || 2000;
        const totalCount = await layer.queryFeatureCount({ where: "1=1" });
        const fetchLimit = featureQueryLimit > 0 ? Math.min(featureQueryLimit, totalCount) : totalCount;
        const all: __esri.Graphic[] = [];
        for (let start = 0; start < fetchLimit; start += pageSize) {
          const result = await layer.queryFeatures({
            where: "1=1",
            outFields: ["*"],
            returnGeometry: true,
            num: Math.min(pageSize, fetchLimit - start),
            start,
            orderByFields: ["objectid"],
          });
          all.push(...result.features);
          setFeatureChangeProgress(`Fetching ${layer.title}: ${all.length} / ${fetchLimit}…`);
        }
        return all;
      };

      const [beforeFeatures, afterFeatures] = await Promise.all([
        fetchAllFeatures(beforeFL),
        fetchAllFeatures(afterFL),
      ]);

      if (!beforeFeatures.length || !afterFeatures.length) {
        alert("One or both layers returned no features. Check visibility and filters.");
        setFeatureChangeLoading(false);
        return;
      }

      const field = compareField.trim();

      await Promise.all([beforeFL.load(), afterFL.load()]);

      let fieldDef = beforeFL.fields.find((f) => f.name === field);
      if (!fieldDef) fieldDef = afterFL.fields.find((f) => f.name === field);

      const domain = fieldDef?.domain;
      const isCodedValueDomain = domain?.type === "coded-value";
      const layerTypes = (beforeFL as any).types || (afterFL as any).types;
      const typeIdField = (beforeFL as any).typeIdField || (afterFL as any).typeIdField;
      const hasTypes = layerTypes && layerTypes.length > 0 && typeIdField === field;

      const getDomainAlias = (value: any): string => {
        if (value == null) return "N/A";
        if (hasTypes) {
          const t = layerTypes.find(
            (t: any) =>
              t.id === value || String(t.id) === String(value) || Number(t.id) === Number(value)
          );
          if (t) return t.name;
        }
        if (isCodedValueDomain) {
          const cv = (domain as __esri.CodedValueDomain).codedValues?.find(
            (cv) =>
              cv.code === value || String(cv.code) === String(value) || Number(cv.code) === Number(value)
          );
          if (cv) return cv.name;
        }
        return String(value);
      };

      const changedFeatures: __esri.Graphic[] = [];
      const changesByType: Record<string, number> = {};
      let totalAreaSqm = 0;

      const yieldToUI = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
      const CHUNK_SIZE = 20;

      for (let chunkStart = 0; chunkStart < afterFeatures.length; chunkStart += CHUNK_SIZE) {
        const chunk = afterFeatures.slice(chunkStart, chunkStart + CHUNK_SIZE);

        for (const afterFeat of chunk) {
          const afterGeom = afterFeat.geometry;
          if (!afterGeom || afterGeom.type !== "polygon") continue;
          const afterVal = afterFeat.attributes?.[field];

          for (const beforeFeat of beforeFeatures) {
            const beforeGeom = beforeFeat.geometry;
            if (!beforeGeom || beforeGeom.type !== "polygon") continue;
            const beforeVal = beforeFeat.attributes?.[field];

            if (String(afterVal) === String(beforeVal)) continue;

            const aExt = (afterGeom as __esri.Polygon).extent;
            const bExt = (beforeGeom as __esri.Polygon).extent;
            if (aExt && bExt) {
              if (
                aExt.xmax < bExt.xmin ||
                aExt.xmin > bExt.xmax ||
                aExt.ymax < bExt.ymin ||
                aExt.ymin > bExt.ymax
              )
                continue;
            }

            const intersection = geometryEngine.intersect(afterGeom, beforeGeom);
            if (!intersection) continue;

            const areaSqm = geometryEngine.geodesicArea(intersection as __esri.Polygon, "square-meters");
            if (!areaSqm || areaSqm <= 0) continue;

            const beforeAlias = getDomainAlias(beforeVal);
            const afterAlias = getDomainAlias(afterVal);
            const changeKey = `${beforeAlias} → ${afterAlias}`;
            changesByType[changeKey] = (changesByType[changeKey] || 0) + areaSqm;
            totalAreaSqm += areaSqm;

            changedFeatures.push({
              geometry: intersection,
              attributes: {
                OBJECTID: changedFeatures.length + 1,
                change_from: beforeAlias,
                change_to: afterAlias,
                change_type: changeKey,
                area_sqm: Math.round(areaSqm * 100) / 100,
                area_ha: Math.round((areaSqm / 10000) * 10000) / 10000,
              },
            } as any);
          }
        }

        const pct = Math.round(((chunkStart + CHUNK_SIZE) / afterFeatures.length) * 100);
        setFeatureChangeProgress(`Processing… ${Math.min(pct, 100)}% (${changedFeatures.length} changes found)`);
        await yieldToUI();
      }
      setFeatureChangeProgress("");

      if (changedFeatures.length === 0) {
        alert(
          "No changed areas detected.\n\nCheck that:\n• Both layers cover the same area\n• The compare field name is correct\n• The layers use the same coordinate system"
        );
        setFeatureChangeLoading(false);
        return;
      }

      const palette = [
        [255, 0, 0, 0.7], [255, 165, 0, 0.7], [128, 0, 128, 0.7], [0, 128, 0, 0.7],
        [0, 0, 255, 0.7], [255, 20, 147, 0.7], [0, 206, 209, 0.7], [139, 69, 19, 0.7],
      ];
      const uniqueTypes = Object.keys(changesByType);
      const uniqueValueInfos = uniqueTypes.map((type, i) => {
        const c = palette[i % palette.length] as number[];
        return {
          value: type,
          symbol: {
            type: "simple-fill",
            color: [c[0], c[1], c[2], c[3]],
            outline: { color: [255, 255, 255, 0.6], width: 0.5 },
          },
          label: type,
        };
      });

      const resultLayer = new FeatureLayer({
        source: changedFeatures,
        objectIdField: "OBJECTID",
        geometryType: "polygon",
        spatialReference: afterFeatures[0].geometry?.spatialReference ?? ({ wkid: 102100 } as any),
        title: `Change Detection Result (${beforeFL.title} → ${afterFL.title})`,
        fields: [
          { name: "OBJECTID", type: "oid" },
          { name: "change_from", type: "string", alias: "From (Before)" },
          { name: "change_to", type: "string", alias: "To (After)" },
          { name: "change_type", type: "string", alias: "Change Type" },
          { name: "area_sqm", type: "double", alias: "Area (m²)" },
          { name: "area_ha", type: "double", alias: "Area (ha)" },
        ],
        renderer: {
          type: "unique-value",
          field: "change_type",
          uniqueValueInfos,
          defaultSymbol: {
            type: "simple-fill",
            color: [200, 200, 200, 0.5],
            outline: { color: [255, 255, 255, 0.4], width: 0.5 },
          },
        } as any,
        popupTemplate: {
          title: "Change Detected",
          content: [
            {
              type: "fields",
              fieldInfos: [
                { fieldName: "change_from", label: "From (Before)" },
                { fieldName: "change_to", label: "To (After)" },
                { fieldName: "change_type", label: "Change Type" },
                { fieldName: "area_sqm", label: "Area (m²)" },
                { fieldName: "area_ha", label: "Area (ha)" },
              ],
            },
          ],
        },
      });

      map.add(resultLayer);
      featureChangeResultRef.current = resultLayer;
      setFeatureChangeActive(true);
      setFeatureChangeStats({
        totalArea: Math.round(totalAreaSqm),
        changesByType: Object.fromEntries(
          Object.entries(changesByType).map(([k, v]) => [k, Math.round(v)])
        ),
        featureCount: changedFeatures.length,
      });

      resultLayer.when(() => {
        if (resultLayer.fullExtent) {
          viewRef.current?.goTo(resultLayer.fullExtent).catch(console.error);
        }
      });
    } catch (err) {
      console.error("Feature layer change detection failed:", err);
      alert("Change detection failed. See console for details.");
    } finally {
      setFeatureChangeLoading(false);
      setFeatureChangeProgress("");
    }
  };

  const removeFeatureChangeDetection = () => {
    if (viewRef.current && featureChangeResultRef.current) {
      (viewRef.current.map as __esri.Map).remove(featureChangeResultRef.current);
      featureChangeResultRef.current = null;
    }
    setFeatureChangeActive(false);
    setFeatureChangeStats(null);
    setBeforeFeatureLayer("");
    setAfterFeatureLayer("");
  };

  const exportResultToGeoJSON = async () => {
    const layer = featureChangeResultRef.current;
    if (!layer) return;
    try {
      const result = await layer.queryFeatures({
        where: "1=1",
        outFields: ["*"],
        returnGeometry: true,
        num: 10000,
      });
      const features = result.features.map((f) => {
        const geom = f.geometry as __esri.Polygon;
        const sr = geom.spatialReference;
        const isWebMercator =
          sr?.wkid === 102100 || sr?.wkid === 3857 || (sr as any)?.latestWkid === 3857;
        const rings = geom.rings.map((ring) =>
          ring.map(([x, y]) => {
            if (isWebMercator) {
              const pt = webMercatorUtils.xyToLngLat(x, y);
              return [Math.round(pt[0] * 1e7) / 1e7, Math.round(pt[1] * 1e7) / 1e7];
            }
            return [Math.round(x * 1e7) / 1e7, Math.round(y * 1e7) / 1e7];
          })
        );
        return {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: rings },
          properties: { ...f.attributes },
        };
      });
      const blob = new Blob(
        [JSON.stringify({ type: "FeatureCollection", features }, null, 2)],
        { type: "application/geo+json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `change_detection_result_${new Date().toISOString().slice(0, 10)}.geojson`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("GeoJSON export failed:", err);
      alert("Export failed. See console for details.");
    }
  };

  // ── JSX ──
  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <div ref={mapDiv} style={{ width: "100%", height: "100%" }} />

      {/* Feature Layer CD – Expand Widget Portal */}
      {featureCDWidgetReady &&
        featureCDContainerRef.current &&
        createPortal(
          <div
            style={{
              width: "370px",
              maxHeight: "calc(100vh - 160px)",
              overflowY: "auto",
              backgroundColor: "white",
            }}
          >
            {/* ── Header ── */}
            <div
              style={{
                padding: "14px 15px 12px",
                borderBottom: "3px solid #2196f3",
                position: "sticky",
                top: 0,
                backgroundColor: "white",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <h3 style={{ margin: 0, color: "#2196f3", fontSize: "15px" }}>
                  🗺️ Feature Layer Change Detection
                </h3>
                <button
                  onClick={refreshFeatureLayers}
                  title="Refresh layer list"
                  style={{
                    padding: "4px 10px",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "bold",
                  }}
                >
                  🔄 Refresh
                </button>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
                Detect changes between two polygon feature layers
              </p>
            </div>

            <div style={{ padding: "15px" }}>
              {/* ── Add layer from URL ── */}
              <details style={{ marginBottom: "15px" }}>
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "13px",
                    color: "#555",
                    userSelect: "none",
                    padding: "6px 8px",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                >
                  ➕ Add Feature Layer from URL
                </summary>
                <div style={{ marginTop: "8px" }}>
                  <input
                    id="cd-add-url"
                    type="text"
                    placeholder="https://…/FeatureServer/0"
                    style={{
                      width: "100%",
                      padding: "7px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      fontSize: "12px",
                      boxSizing: "border-box",
                      marginBottom: "6px",
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById("cd-add-url") as HTMLInputElement;
                      addLayerFromUrl(input.value);
                      input.value = "";
                    }}
                    style={{
                      width: "100%",
                      padding: "7px",
                      backgroundColor: "#0079c1",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Add Layer
                  </button>
                </div>
              </details>

              {/* ── Before layer ── */}
              <label
                style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}
              >
                Before Feature Layer (Time 1):
              </label>
              <select
                value={beforeFeatureLayer}
                onChange={(e) => {
                  setBeforeFeatureLayer(e.target.value);
                  loadFeatureLayerFields(e.target.value);
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginBottom: "15px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "13px",
                }}
                disabled={featureChangeActive}
              >
                <option value="">Select a polygon feature layer…</option>
                {featureAvailableLayers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.title}
                  </option>
                ))}
              </select>

              {/* ── After layer ── */}
              <label
                style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}
              >
                After Feature Layer (Time 2):
              </label>
              <select
                value={afterFeatureLayer}
                onChange={(e) => setAfterFeatureLayer(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginBottom: "15px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "13px",
                }}
                disabled={featureChangeActive}
              >
                <option value="">Select a polygon feature layer…</option>
                {featureAvailableLayers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.title}
                  </option>
                ))}
              </select>

              {/* ── Fetch limit ── */}
              <label
                style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}
              >
                Feature Fetch Limit{" "}
                <span style={{ fontWeight: "normal", color: "#888", fontSize: "12px" }}>
                  (0 = all)
                </span>
                :
              </label>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px" }}
              >
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={featureQueryLimit}
                  onChange={(e) =>
                    setFeatureQueryLimit(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  style={{
                    flex: 1,
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "13px",
                  }}
                  disabled={featureChangeActive}
                />
                <span style={{ fontSize: "12px", color: "#666", whiteSpace: "nowrap" }}>
                  {featureQueryLimit === 0
                    ? "Fetch all (slower)"
                    : `~${featureQueryLimit.toLocaleString()} rows`}
                </span>
              </div>

              {/* ── Compare field ── */}
              <label
                style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}
              >
                Compare Field:
              </label>
              {featureLayerFields.length > 0 ? (
                <select
                  value={compareField}
                  onChange={(e) => setCompareField(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    marginBottom: "15px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "13px",
                  }}
                  disabled={featureChangeActive}
                >
                  {featureLayerFields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={compareField}
                  onChange={(e) => setCompareField(e.target.value)}
                  placeholder="e.g. gridcode"
                  style={{
                    width: "100%",
                    padding: "8px",
                    marginBottom: "15px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                  disabled={featureChangeActive}
                />
              )}

              {/* ── Action buttons ── */}
              {!featureChangeActive ? (
                <button
                  onClick={runFeatureLayerChangeDetection}
                  disabled={!beforeFeatureLayer || !afterFeatureLayer || featureChangeLoading}
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor:
                      beforeFeatureLayer && afterFeatureLayer ? "#28a745" : "#ccc",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor:
                      beforeFeatureLayer && afterFeatureLayer ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  {featureChangeLoading
                    ? featureChangeProgress || "⏳ Fetching features…"
                    : "🔍 Detect Changes"}
                </button>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={exportResultToGeoJSON}
                    style={{
                      flex: 1,
                      padding: "10px",
                      backgroundColor: "#0079c1",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    ⬇️ Export GeoJSON
                  </button>
                  <button
                    onClick={removeFeatureChangeDetection}
                    style={{
                      flex: 1,
                      padding: "10px",
                      backgroundColor: "#d32f2f",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    ❌ Remove Result
                  </button>
                </div>
              )}

              {/* ── Results summary ── */}
              {featureChangeStats && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "12px",
                    backgroundColor: "#f0fff4",
                    borderRadius: "4px",
                    borderLeft: "4px solid #28a745",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "13px",
                      fontWeight: "bold",
                      color: "#155724",
                    }}
                  >
                    ✅ Change Detection Results
                  </p>
                  <p style={{ margin: "0 0 4px 0", fontSize: "12px" }}>
                    <strong>Changed polygons:</strong>{" "}
                    {featureChangeStats.featureCount.toLocaleString()}
                  </p>
                  <p style={{ margin: "0 0 8px 0", fontSize: "12px" }}>
                    <strong>Total changed area:</strong>{" "}
                    {featureChangeStats.totalArea.toLocaleString()} m²&nbsp;(
                    {(featureChangeStats.totalArea / 10000).toFixed(2)} ha)
                  </p>
                  <p style={{ margin: "0 0 4px 0", fontSize: "12px", fontWeight: "bold" }}>
                    By change type:
                  </p>
                  <div style={{ maxHeight: "160px", overflowY: "auto" }}>
                    {Object.entries(featureChangeStats.changesByType).map(([type, area]) => (
                      <div
                        key={type}
                        style={{
                          fontSize: "11px",
                          padding: "3px 0",
                          borderBottom: "1px solid #d4edda",
                        }}
                      >
                        <strong>{type}:</strong>&nbsp;
                        {area.toLocaleString()} m² ({(area / 10000).toFixed(4)} ha)
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── How it works ── */}
              <details style={{ marginTop: "15px" }}>
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "bold",
                    color: "#2196f3",
                    padding: "6px 8px",
                    backgroundColor: "#f0f8ff",
                    borderRadius: "4px",
                    border: "1px solid #bbdefb",
                    userSelect: "none",
                  }}
                >
                  📌 How it works
                </summary>
                <ul
                  style={{
                    margin: "8px 0 0 0",
                    paddingLeft: "20px",
                    fontSize: "12px",
                    lineHeight: "1.7",
                    color: "#333",
                  }}
                >
                  <li>Select two polygon FeatureLayers (Before / After)</li>
                  <li>
                    Choose the field that holds the class value (e.g.{" "}
                    <code>gridcode</code>)
                  </li>
                  <li>
                    Unchanged areas (same class) are <strong>removed</strong>
                  </li>
                  <li>Changed areas are intersected and shown in a new result layer</li>
                  <li>Area (m² and ha) is calculated for each change type</li>
                  <li>Click a polygon on the map to see change details in the popup</li>
                  <li>Export the result as GeoJSON for further analysis</li>
                </ul>
              </details>

              {/* ── No layers warning ── */}
              {featureAvailableLayers.length === 0 && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "12px",
                    backgroundColor: "#fff3cd",
                    borderRadius: "4px",
                    borderLeft: "4px solid #ffc107",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "12px", color: "#856404" }}>
                    ⚠️ No FeatureLayers found on the map. Use the "Add Feature Layer from
                    URL" section above to load your layers.
                  </p>
                </div>
              )}
            </div>
          </div>,
          featureCDContainerRef.current
        )}
    </div>
  );
}

export default ChangeDetectionPage;
