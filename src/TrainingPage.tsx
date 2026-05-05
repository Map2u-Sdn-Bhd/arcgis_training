import { useEffect, useRef, useState } from "react";
import "@arcgis/core/assets/esri/themes/light/main.css";
import MapView from "@arcgis/core/views/MapView";
import Map from "@arcgis/core/Map";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import ImageryLayer from "@arcgis/core/layers/ImageryLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import LayerList from "@arcgis/core/widgets/LayerList";
import Legend from "@arcgis/core/widgets/Legend";
import Expand from "@arcgis/core/widgets/Expand";
import Search from "@arcgis/core/widgets/Search";
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery";
import Fullscreen from "@arcgis/core/widgets/Fullscreen";
import Home from "@arcgis/core/widgets/Home";
import Locate from "@arcgis/core/widgets/Locate";
import Measurement from "@arcgis/core/widgets/Measurement";
import ImageryTileLayer from "@arcgis/core/layers/ImageryTileLayer";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer";
import TileLayer from "@arcgis/core/layers/TileLayer";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import esriRequest from "@arcgis/core/request";
// import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils";
// import * as projection from "@arcgis/core/geometry/projection";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
// import PortalItem from "@arcgis/core/portal/PortalItem";
// import Portal from "@arcgis/core/portal/Portal";

// Global element/widget references (typed) used by switchTab helper 
let distanceTab: HTMLButtonElement;
let areaTab: HTMLButtonElement;
let clearTab: HTMLButtonElement;
let measurementWidget: Measurement;

interface LayerInfo {
  id: string;
  title: string;
  url?: string;
  type: string;
}

type ChangeDetectionMethod = 'difference' | 'ratio' | 'ndvi' | 'composite';
type TileBlendMode = 'difference' | 'multiply' | 'screen' | 'overlay' | 'exclusion';

function TrainingPage() {
  const mapDiv = useRef(null);
  const viewRef = useRef<MapView | null>(null);
  const [availableLayers, setAvailableLayers] = useState<LayerInfo[]>([]);
  const [beforeLayer, setBeforeLayer] = useState<string>('');
  const [afterLayer, setAfterLayer] = useState<string>('');
  const [changeDetectionActive, setChangeDetectionActive] = useState<boolean>(false);
  const changeDetectionLayerRef = useRef<ImageryLayer | __esri.TileLayer | null>(null);
  const [showChangePanel, setShowChangePanel] = useState<boolean>(false);
  const [detectionMethod, setDetectionMethod] = useState<ChangeDetectionMethod>('difference');
  const [useBlendMode, setUseBlendMode] = useState<boolean>(false);
  const [tileBlendMode, setTileBlendMode] = useState<TileBlendMode>('difference');
  const [hideDarkAreas, setHideDarkAreas] = useState<boolean>(false);
  const [changeOpacity, setChangeOpacity] = useState<number>(0.7);
  const [removeUnchanged, setRemoveUnchanged] = useState<boolean>(false);
  const [changeThreshold, setChangeThreshold] = useState<number>(30);
  const [cdLegend, setCdLegend] = useState<{
    type: 'classified' | 'blend';
    title: string;
    items?: { label: string; imageData: string; color?: [number, number, number] }[];
    blendDesc?: string;
  } | null>(null);
  const beforeLayerRefForCD = useRef<any>(null);
  const cdBlobUrlRef = useRef<string | null>(null);

  // ── Feature-layer (polygon) change detection state ──
  const [cdMode, setCdMode] = useState<'raster' | 'feature'>('raster');
  const [featureAvailableLayers, setFeatureAvailableLayers] = useState<LayerInfo[]>([]);
  const [beforeFeatureLayer, setBeforeFeatureLayer] = useState<string>('');
  const [afterFeatureLayer, setAfterFeatureLayer] = useState<string>('');
  const [compareField, setCompareField] = useState<string>('gridcode');
  const [featureLayerFields, setFeatureLayerFields] = useState<string[]>([]);
  const [featureChangeActive, setFeatureChangeActive] = useState<boolean>(false);
  const [featureChangeLoading, setFeatureChangeLoading] = useState<boolean>(false);
  const [featureChangeProgress, setFeatureChangeProgress] = useState<string>('');
  const [featureQueryLimit, setFeatureQueryLimit] = useState<number>(0); // 0 = fetch all
  const [featureChangeStats, setFeatureChangeStats] = useState<{
    totalArea: number;
    changesByType: Record<string, number>;
    featureCount: number;
  } | null>(null);
  const featureChangeResultRef = useRef<FeatureLayer | null>(null);

  // ── Swipe widget state ──
  const [showSwipePanel, setShowSwipePanel] = useState<boolean>(false);
  const [swipeBeforeLayer, setSwipeBeforeLayer] = useState<string>('');
  const [swipeAfterLayer, setSwipeAfterLayer] = useState<string>('');
  const [swipeActive, setSwipeActive] = useState<boolean>(false);
  const swipeWidgetRef = useRef<any>(null);

  // ── Raster CD statistics state ──
  const [cdRasterStats, setCdRasterStats] = useState<{
    greenPx: number; yellowPx: number; redPx: number;
    greenHa: number; yellowHa: number; redHa: number; totalChangedHa: number;
  } | null>(null);

  useEffect(() => {
    if (!mapDiv.current) return;
    const map = new Map({
      basemap: "hybrid",
    });
    const view = new MapView({
      container: mapDiv.current as any,
      map,
      center: [102.52711221450218, 5.7326080728403],
      zoom: 10,
      popup: {
        dockEnabled: false,
        // dockOptions: {
        //   buttonEnabled: true,
        //   breakpoint: false,
        // },
      },
    });

    viewRef.current = view;

    //------------------------MULA KOMPONEN MAP------------------------// 

    const popuptemplatetest = {
      title: "{nam}",
      content: [
        {
          type: "fields", fieldInfos: [
            { fieldName: "feature_code", label: "Feature Code" },
            { fieldName: "nam", label: "Feature Name" },
          ]
        },
      ],
    }

    const featureLayer = new FeatureLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/Hosted/MOBILE_APP_LAYER/FeatureServer/0",
      outFields: ["*"],
      popupEnabled: true,
      popupTemplate: popuptemplatetest,
      visible: false,
    });
    const featureLayer2 = new FeatureLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/Hosted/MOBILE_APP_LAYER/FeatureServer/1",
      outFields: ["*"],
      popupEnabled: true,
      popupTemplate: popuptemplatetest,
      visible: false,
    });
    const featureLayer3 = new FeatureLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/Hosted/MOBILE_APP_LAYER/FeatureServer/2",
      outFields: ["*"],
      popupEnabled: true,
      popupTemplate: popuptemplatetest,
      visible: false,
      renderer: {
        type: "simple",
        symbol: {
          type: "picture-marker",
          url:
            "https://img.icons8.com/?size=100&id=OvF2QB92bUkj&format=png&color=000000",
          width: "24px",
          height: "24px"
        }
      }
    });
    const changeDetectionLayer = new TileLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/Hosted/LULC23/MapServer",
      title: "LULC 2023",
      visible: false,
    });
    const changeDetectionLayer2 = new TileLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/Hosted/LULC21/MapServer",
      title: "LULC 2021",
      visible: false,
    });

    const lulc23TestLayer = new MapImageLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/LULC23_test/MapServer",
      title: "LULC 2023 Test",
      sublayers: [{ id: 0 }],
      visible: false,
    });
    const lulc21TestLayer = new MapImageLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/LandUse_2021/MapServer",
      title: "LULC 2021 Test",
      sublayers: [{ id: 0 }],
      visible: false,
    });

    const lulc23NdviLayer = new TileLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/Hosted/LULC23_ndvi/MapServer",
      title: "LULC 2023 NDVI",
      visible: false,
    });
    const lulc21NdviLayer = new TileLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/Hosted/LULC21_ndvi/MapServer",
      title: "LULC 2021 NDVI",
      visible: false,
    });
    const reclassNdviCdLayer = new TileLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/Hosted/Reclass_NDVI_cd/MapServer",
      title: "Reclass NDVI Change Detection",
      visible: false,
    });

    const lulc21PolygonLayer = new FeatureLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/Hosted/Lulc21_Polygon/FeatureServer",
      outFields: ["*"],
      popupEnabled: true,
      // popupTemplate: popuptemplatetest,
      visible: false,
    });
    const lulc23PolygonLayer = new FeatureLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/Hosted/Lulc23_Polygon/FeatureServer",
      outFields: ["*"],
      popupEnabled: true,
      // popupTemplate: popuptemplatetest,
      visible: false,
    });

    const lulc2021ImageryLayer = new ImageryLayer({
      url: "https://mygeoserve5.jupem.gov.my/imageserver/rest/services/Lulc2021/ImageServer",
      title: "LULC 2021 Imagery",
      visible: false,
    });

    const lulc2023ImageryLayer = new ImageryLayer({
      url: "https://mygeoserve5.jupem.gov.my/imageserver/rest/services/Lulc2023/ImageServer",
      title: "LULC 2023 Imagery",
      visible: false,
    });

    

    map.add(lulc23NdviLayer);
    map.add(lulc21NdviLayer);
    map.add(reclassNdviCdLayer);
    

    map.add(featureLayer);
    map.add(featureLayer2);
    map.add(featureLayer3);
    map.add(changeDetectionLayer);
    map.add(changeDetectionLayer2);
    map.add(lulc23TestLayer);
    map.add(lulc21TestLayer);

    map.add(lulc21PolygonLayer);
    map.add(lulc23PolygonLayer);

    map.add(lulc2021ImageryLayer);
    map.add(lulc2023ImageryLayer);


    // const imageryLayer = new ImageryLayer({
    //   url: "https://mygeoserve5.jupem.gov.my/imageserver/rest/services/PRODUCTION_IMAGERY/ORTOFOTO_2025/ImageServer",
    //   title: "Ortofoto 2025",
    //   opacity: 1.0,
    // });

    // map.add(imageryLayer);

    const tabContainer = document.createElement("div");
    tabContainer.style.background = "white";
    const tabButtons = document.createElement("div");
    tabButtons.style.display = "flex";
    tabButtons.style.padding = "5px";

    const layerListTab = document.createElement("button");
    layerListTab.textContent = "Layers";
    layerListTab.classList.add("tab-button", "active");

    const legendTab = document.createElement("button");
    legendTab.textContent = "Legend";
    legendTab.classList.add("tab-button");

    tabButtons.appendChild(layerListTab);
    tabButtons.appendChild(legendTab);

    // Create search box for layer filtering
    const layerSearchContainer = document.createElement("div");
    layerSearchContainer.style.padding = "10px";
    layerSearchContainer.style.borderBottom = "1px solid #ddd";
    layerSearchContainer.style.backgroundColor = "#f9f9f9";

    const layerSearchInput = document.createElement("input");
    layerSearchInput.type = "text";
    layerSearchInput.placeholder = "Search layers...";
    layerSearchInput.style.width = "100%";
    layerSearchInput.style.padding = "8px";
    layerSearchInput.style.border = "1px solid #ccc";
    layerSearchInput.style.borderRadius = "4px";
    layerSearchInput.style.fontSize = "14px";
    layerSearchInput.style.boxSizing = "border-box";

    layerSearchContainer.appendChild(layerSearchInput);

    const layerListContent = document.createElement("div");
    layerListContent.style.width = "400px";
    layerListContent.style.display = "block";

    const legendContent = document.createElement("div");
    legendContent.style.width = "400px";
    legendContent.style.display = "none";

    const observer = new MutationObserver(() => {
      document.querySelectorAll("calcite-action").forEach((listItem) => {
        const shadowRoot = listItem.shadowRoot;
        if (shadowRoot) {
          const questionBtn = shadowRoot.querySelector(
            'calcite-icon[icon="question"]'
          );
          if (questionBtn) {
            const infoIcon = document.createElement("calcite-icon");
            infoIcon.setAttribute("icon", "caret-down");
            infoIcon.setAttribute("scale", "s");
            questionBtn.replaceWith(infoIcon);
            // console.log("Removed question icon.");
          }
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    new LayerList({
      view: view,
      container: layerListContent,
      listItemCreatedFunction: function (event) {
        const item = event.item;

        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.alignItems = "center";

        // 🔍 Zoom Button (only for non-group layers)
        if (item.layer && item.layer.type !== "group") {
          const zoomButton = document.createElement("button");
          zoomButton.innerHTML = "🔍";
          zoomButton.title = "Zoom to Layer";
          zoomButton.style.marginRight = "10px";
          zoomButton.style.padding = "5px 10px";
          zoomButton.style.borderRadius = "4px";
          zoomButton.style.backgroundColor = "white";
          zoomButton.style.border = "none";
          zoomButton.style.cursor = "pointer";

          zoomButton.addEventListener("click", async function () {
            if (!item.layer) return;
            try {
              await item.layer.load();
              let ext: any = null;

              // For FeatureLayers, queryExtent() is more reliable than fullExtent
              // especially for source-based (uploaded) layers
              if (typeof (item.layer as any).queryExtent === "function") {
                try {
                  const result = await (item.layer as any).queryExtent();
                  if (result?.extent) ext = result.extent;
                } catch { /* fall through to fullExtent */ }
              }

              // Fallback to fullExtent
              if (!ext) ext = (item.layer as any).fullExtent;

              const isValid = (e: any) =>
                e &&
                isFinite(e.xmin) && isFinite(e.xmax) &&
                isFinite(e.ymin) && isFinite(e.ymax) &&
                e.xmin !== e.xmax && e.ymin !== e.ymax;

              if (isValid(ext)) {
                await view.goTo(ext);
              } else {
                alert("This layer does not have a valid extent to zoom to.");
              }
            } catch (error: any) {
              console.error("Error zooming to layer:", error);
            }
          });

          buttonContainer.appendChild(zoomButton);
        }

        if (item.layer && item.layer.type === "group") {
          const groupToggleButton = document.createElement("button");
          groupToggleButton.innerHTML = "🚫"; // Initial state, assume children are visible
          groupToggleButton.title = "Hide All Sub-layers";
          groupToggleButton.style.marginRight = "10px";
          groupToggleButton.style.padding = "5px 10px";
          groupToggleButton.style.borderRadius = "4px";
          groupToggleButton.style.backgroundColor = "transparent";
          groupToggleButton.style.border = "none";
          groupToggleButton.style.cursor = "pointer";

          const groupLayer = item.layer as __esri.GroupLayer;

          // Helper to update icon and title
          function updateGroupToggleIcon() {
            const allVisible = areAllChildrenVisible(groupLayer);
            groupToggleButton.innerHTML = allVisible
              ? `<span style="display:inline-block;width:32px;height:18px;background:#4caf50;border-radius:18px;vertical-align:middle;position:relative;">
                  <span style="display:inline-block;width:16px;height:16px;background:#eafbe7;border-radius:50%;position:absolute;left:14px;top:1px;transition:left 0.2s;"></span>
                  </span>`
              : `<span style="display:inline-block;width:32px;height:18px;background:#b0bec5;border-radius:18px;vertical-align:middle;position:relative;">
                  <span style="display:inline-block;width:16px;height:16px;background:#f5f7fa;border-radius:50%;position:absolute;left:2px;top:1px;transition:left 0.2s;"></span>
                  </span>`;
            groupToggleButton.title = allVisible
              ? "Sub-Lapisan Dipaparkan"
              : "Sub-Lapisan Tersembunyi";
          }

          groupToggleButton.addEventListener("click", function () {
            const shouldHide = areAllChildrenVisible(groupLayer);
            groupLayer.layers.forEach((childLayer) => {
              childLayer.visible = !shouldHide;
            });
            updateGroupToggleIcon();
          });

          // Update the icon initially
          updateGroupToggleIcon();
          buttonContainer.appendChild(groupToggleButton);
        }

        // ☁️ Transparency Toggle Button
        const transparencyToggleButton = document.createElement("button");
        transparencyToggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/></svg>`;
        transparencyToggleButton.title = "Transparency";
        transparencyToggleButton.style.padding = "5px 10px";
        transparencyToggleButton.style.borderRadius = "4px";
        transparencyToggleButton.style.backgroundColor = "white";
        transparencyToggleButton.style.border = "none";
        transparencyToggleButton.style.cursor = "pointer";

        const transparencySliderContainer = document.createElement("div");
        transparencySliderContainer.style.display = "none";
        transparencySliderContainer.style.marginTop = "5px";

        const transparencySliderLabel = document.createElement("label");
        transparencySliderLabel.textContent = "Transparency:";
        transparencySliderLabel.style.display = "block";
        transparencySliderLabel.style.marginBottom = "5px";

        const transparencySlider = document.createElement("input");
        transparencySlider.type = "range";
        transparencySlider.min = "0";
        transparencySlider.max = "1";
        transparencySlider.step = "0.1";
        transparencySlider.value = item.layer ? String(item.layer.opacity) : '1';
        transparencySlider.style.width = "100%";

        transparencySlider.addEventListener("input", function () {
          if (item.layer) {
            item.layer.opacity = parseFloat(transparencySlider.value);
          }
        });

        transparencySliderContainer.appendChild(transparencySliderLabel);
        transparencySliderContainer.appendChild(transparencySlider);

        transparencyToggleButton.addEventListener("click", function () {
          transparencySliderContainer.style.display =
            transparencySliderContainer.style.display === "none"
              ? "block"
              : "none";
        });

        buttonContainer.appendChild(transparencyToggleButton);

        // 💡 Highlight Button (only for non-group layers)
        if (item.layer && item.layer.type !== "group") {
          const highlightButton = document.createElement("button");
          highlightButton.innerHTML = "💡";
          highlightButton.title = "Highlight Layer Features";
          highlightButton.style.marginLeft = "10px";
          highlightButton.style.marginRight = "10px";
          highlightButton.style.padding = "5px 10px";
          highlightButton.style.borderRadius = "4px";
          highlightButton.style.backgroundColor = "white";
          highlightButton.style.border = "none";
          highlightButton.style.cursor = "pointer";

          let highlightHandle: __esri.Handle | null = null;

          highlightButton.addEventListener("click", async function () {
            try {
              // Toggle highlight
              if (highlightHandle) {
                highlightHandle.remove();
                highlightHandle = null;
                highlightButton.style.backgroundColor = "white";
                highlightButton.title = "Highlight Layer Features";
              } else {
                // Get the layer view
                if (item.layer) {
                  const layerView = await view.whenLayerView(item.layer as __esri.Layer);

                  // Check if the layer view supports querying features
                  if ("queryFeatures" in layerView) {
                    // Highlight all features in the layer
                    const featureSet = await (layerView as any).queryFeatures();
                    highlightHandle = (layerView as any).highlight(
                      featureSet.features
                    );

                    highlightButton.style.backgroundColor = "#ffeb3b";
                    highlightButton.title = "Remove Highlight";
                  } else {
                    alert('This layer type does not support feature highlighting.');
                  }
                }
              }
            } catch (error) {
              console.error("Error highlighting layer:", error);
            }
          });

          buttonContainer.appendChild(highlightButton);
        }

        const container = document.createElement("div");
        container.appendChild(buttonContainer);
        container.appendChild(transparencySliderContainer);

        item.panel = {
          content: container,
          open: false,
        };

        // / Remove default actions
        item.actionsOpen = false;
        item.actionsSections = [];
      },
    });

    new Legend({
      view: view,
      container: legendContent,
    });
    function areAllChildrenVisible(groupLayer: __esri.GroupLayer): boolean {
      return groupLayer.layers.every((layer) => layer.visible);
    }

    // Add filter functionality for layer list
    layerSearchInput.addEventListener("input", function () {
      const searchTerm = layerSearchInput.value.toLowerCase().trim();

      // Function to filter layers
      const filterLayers = () => {
        // Get all calcite-list-item elements in the layer list
        const listItems =
          layerListContent.querySelectorAll("calcite-list-item");

        if (listItems.length === 0) {
          // If no items found, try again after a short delay
          setTimeout(filterLayers, 100);
          return;
        }

        let visibleCount = 0;

        listItems.forEach((listItem: Element) => {
          // Get text content from multiple sources
          const label = listItem.getAttribute("label")?.toLowerCase() || "";
          const description =
            listItem.getAttribute("description")?.toLowerCase() || "";
          const textContent = listItem.textContent?.toLowerCase() || "";

          // Also check within calcite-list-item-content if it exists
          let innerText = "";
          const contentElement = listItem.querySelector(
            "calcite-list-item-content"
          );
          if (contentElement) {
            innerText = contentElement.textContent?.toLowerCase() || "";
          }

          // Check if the search term matches any of the text sources
          const isMatch =
            searchTerm === "" ||
            label.includes(searchTerm) ||
            description.includes(searchTerm) ||
            textContent.includes(searchTerm) ||
            innerText.includes(searchTerm);

          if (isMatch) {
            (listItem as HTMLElement).style.display = "";
            (listItem as HTMLElement).style.visibility = "visible";
            (listItem as HTMLElement).style.height = "";
            visibleCount++;
          } else {
            (listItem as HTMLElement).style.display = "none";
            (listItem as HTMLElement).style.visibility = "hidden";
            (listItem as HTMLElement).style.height = "0";
          }
        });

        console.log(
          `Filter applied: "${searchTerm}" - ${visibleCount}/${listItems.length} items visible`
        );
      };

      filterLayers();
    });

    tabContainer.appendChild(tabButtons);
    tabContainer.appendChild(layerSearchContainer);
    tabContainer.appendChild(layerListContent);

    tabContainer.appendChild(legendContent);

    layerListTab.addEventListener("click", function () {
      layerListContent.style.display = "block";
      layerSearchContainer.style.display = "block";
      legendContent.style.display = "none";
      layerListTab.classList.add("active");
      legendTab.classList.remove("active");
    });

    legendTab.addEventListener("click", function () {
      layerListContent.style.display = "none";
      layerSearchContainer.style.display = "none";
      legendContent.style.display = "block";
      legendTab.classList.add("active");
      layerListTab.classList.remove("active");
    });

    const combinedExpand = new Expand({
      view: view,
      content: tabContainer,
      expandTooltip: "Layer List & Legend",
      expandIcon: "legend",
    });

    view.ui.add(combinedExpand, "top-left");

    // Basemap Gallery 
    const basemapGallery = new BasemapGallery({
      view: view,
      // source: [
      //   // ...jupemBasemapItems,
      //   Basemap.fromId("topo-vector"),
      //   Basemap.fromId("satellite"),
      //   Basemap.fromId("hybrid"),
      //   Basemap.fromId("gray-vector"),
      //   Basemap.fromId("dark-gray-vector"),
      //   Basemap.fromId("oceans"),
      //   Basemap.fromId("streets"),
      //   Basemap.fromId("streets-night-vector"),
      //   Basemap.fromId("streets-relief-vector"),
      //   Basemap.fromId("streets-navigation-vector"),
      //   Basemap.fromId("terrain"),
      // ],
    });
    const basemapGalleryExpand = new Expand({
      view,
      content: basemapGallery,
      expanded: false,
      group: "top-right",
    });
    view.ui.add(basemapGalleryExpand, "top-right");

    // Fullscreen 
    const fullscreen = new Fullscreen({ view });
    view.ui.add(fullscreen, "top-right");
    // Home button 
    const home = new Home({ view });
    view.ui.add(home, "top-left");
    // Locate (Find My Location) 
    const locate = new Locate({ view });
    view.ui.add(locate, "top-left");

    // const customGeocoder = {
    //   url: "https://mygeoserve6.jupem.gov.my/gisserver/rest/services/ALAMAT_XY/ADDRESS_LOCATOR/GeocodeServer",
    //   placeholder: "Carian JUPEM Locater",
    //   singleLineFieldName: "SingleLine",
    //   name: "JUPEM Geocoder",
    //   outFields: ["*"],
    //   suggestionsEnabled: true,
    //   minSuggestCharacters: 2,
    //   apiKey: "NSyVKqc5nIItm6cFMb3CNwQzSJHGxZCKfLa4UX-G7p52P_g2Y_lfOgp97VnUK1I0Ram-mzwbplL6Bd4vYIKoQMAOt_DeaFZi0k7K0RRBrYeKLBFY3onZ79QJiFlOG7_08Y32fv76ZE6EWs2q-vDAF6yXZR3yJz5Snc6NU_eSIWKa6fO-JrEkYYJZvgjsdmhW"
    // };
    // // Search with custom geocoder 
    const search = new Search({
      view,
      // sources: [customGeocoder],
      includeDefaultSources: true,
    });
    view.ui.add(search, { position: "top-left", index: 0 });

    // Measurement widget 
    measurementWidget = new Measurement({
      view: view,
    });

    const measurementContainer = document.createElement("div");
    measurementContainer.style.padding = "10px";
    measurementContainer.style.width = "400px";
    measurementContainer.style.background = "white";

    const tabButtons2 = document.createElement("div");
    tabButtons2.style.display = "flex";
    tabButtons2.style.marginBottom = "10px";

    distanceTab = document.createElement("button");
    distanceTab.textContent = "Measure Distance";
    distanceTab.classList.add("tab-button");

    areaTab = document.createElement("button");
    areaTab.textContent = "Measure Area";
    areaTab.classList.add("tab-button");

    clearTab = document.createElement("button");
    clearTab.textContent = "Clear Measurement";
    clearTab.classList.add("tab-button", "active");

    tabButtons2.appendChild(distanceTab);
    tabButtons2.appendChild(areaTab);
    tabButtons2.appendChild(clearTab);

    measurementContainer.appendChild(tabButtons2);

    const style = document.createElement("style");

    style.textContent = ` 
      .tab-button { 
        flex: 1; 
        padding: 5px; 
        cursor: pointer; 
        border: none; 
        background: #e7e7e7; 
        color: #000; 
        font-size: 14px; 
        width: 100px; 
      } 
 
      .tab-button:hover { 
        background: #d0d0d0; 
      } 
 
      .tab-button.active { 
        background: #0079c1; 
        color: #fff; 
      } 
    `;
    document.head.appendChild(style);

    measurementWidget.container = measurementContainer;

    distanceTab.addEventListener("click", function () {
      switchTab(distanceTab, "distance");
    });
    areaTab.addEventListener("click", function () {
      switchTab(areaTab, "area");
    });
    clearTab.addEventListener("click", function () {
      switchTab(clearTab, null);
    });

    const measurementExpand = new Expand({
      view: view,
      content: measurementContainer,
      expandIcon: "measure",
      expandTooltip: "Measurement Tools",
      collapseTooltip: "Close Measurement Tools",
    });

    // 🌟 Add Expand widget to the UI 
    view.ui.add(measurementExpand, "top-right");

    // ─── Add Layer from URL Widget ───
    const tempUserLayers: __esri.Layer[] = [];
    const arcgisTokens: Record<string, string> = {};

    const addLayerContainer = document.createElement("div");
    addLayerContainer.className = "add-layer-container";
    addLayerContainer.style.width = "500px";
    addLayerContainer.style.backgroundColor = "white";
    addLayerContainer.innerHTML = `
      <div style="padding: 10px; background: white;">
        <h3 style="margin-bottom: 10px;">🗂️ <strong>Add Temporary Layer</strong></h3>

        <div style="margin-bottom: 15px;">
          <label for="layer-url-input" style="display: block; margin-bottom: 5px;">🔗 Enter Layer URL</label>
          <input id="layer-url-input" type="text" placeholder="e.g., https://.../FeatureServer/0" style="width: 100%; padding: 5px;" />
          <small style="display: block; margin-top: 5px; color: #666;">
            Supported: <strong>FeatureLayer</strong> (/FeatureServer/0), <strong>MapImageLayer</strong> (/MapServer),
            <strong>ImageryLayer</strong> (/ImageServer), <strong>WMSLayer</strong> (/wms),
            <strong>WMTSLayer</strong> (/wmts), <strong>WFSLayer</strong> (/wfs)
          </small>
        </div>

        <div style="margin-bottom: 15px;">
          <button id="add-layer-btn" style="margin-right: 10px;">➕ Add Layer</button>
        </div>

        <hr style="margin: 15px 0;" />

        <div style="margin-bottom: 15px;">
          <label for="upload-file" style="display: block; margin-bottom: 5px;">📁 Upload GeoJSON (.geojson), Shapefile (.zip), or CSV (.csv)</label>
          <input type="file" id="upload-file" accept=".geojson,.json,.zip,.csv" />
        </div>

        <div id="layer-list" style="margin-top: 15px; width: 100%;">
          <strong>🧾 Added Layers:</strong>
          <ul id="layer-list-ul" style="margin-top: 5px; list-style: disc; background: #f9f9f9; padding: 10px; border-radius: 8px;"></ul>
        </div>
      </div>
    `;

    const urlInput = addLayerContainer.querySelector("#layer-url-input") as HTMLInputElement;
    const addBtn = addLayerContainer.querySelector("#add-layer-btn") as HTMLButtonElement;
    const layerListUL = addLayerContainer.querySelector("#layer-list-ul") as HTMLUListElement;

    const updateAddLayerListUI = () => {
      layerListUL.innerHTML = "";
      tempUserLayers.forEach((layer, index) => {
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.alignItems = "center";
        li.style.justifyContent = "space-between";
        li.style.gap = "8px";

        const titleSpan = document.createElement("span");
        titleSpan.textContent = layer.title || `Layer ${index + 1}`;

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "❌";
        removeBtn.title = "Remove this layer";
        removeBtn.style.cssText = "background:transparent;border:none;cursor:pointer;font-size:10px;margin-left:auto;color:#dc3545;padding:2px 6px;";
        removeBtn.onclick = () => {
          map.remove(layer);
          tempUserLayers.splice(index, 1);
          updateAddLayerListUI();
        };

        li.appendChild(titleSpan);
        li.appendChild(removeBtn);
        layerListUL.appendChild(li);
      });
    };

    addBtn?.addEventListener("click", async () => {
      try {
        const url = urlInput.value.trim();
        if (!url) {
          alert("Please enter a valid URL.");
          return;
        }

        let authToken: string | null = null;
        const isArcGISService =
          url.includes("/rest/services/") ||
          url.includes("/FeatureServer") ||
          url.includes("/MapServer") ||
          url.includes("/ImageServer") ||
          url.includes("/SceneServer");

        if (isArcGISService) {
          try {
            const parts = url.split("/rest/");
            const serverUrl = parts[0];

            if (!arcgisTokens[serverUrl]) {
              let requiresAuth = false;
              let isFederated = false;
              let portalUrl = "";

              try {
                const testUrl = url.includes("?") ? `${url}&f=json` : `${url}?f=json`;
                const testResponse = await fetch(testUrl);
                if (testResponse.ok) {
                  const testData = await testResponse.json();
                  // Only treat real auth error codes as requiring login
                  if (
                    testData.error &&
                    (testData.error.code === 499 ||
                      testData.error.code === 498 ||
                      testData.error.code === 401 ||
                      testData.error.code === 403 ||
                      testData.error.message?.toLowerCase().includes("token") ||
                      testData.error.message?.toLowerCase().includes("credentials"))
                  ) {
                    requiresAuth = true;
                  }
                  // 500 or other server errors: assume public, skip auth
                } else if (testResponse.status === 401 || testResponse.status === 403) {
                  requiresAuth = true;
                }
                // 500, 502, etc. → skip auth, let the ArcGIS API handle it
              } catch {
                // CORS or network error → skip auth, try loading directly
                requiresAuth = false;
              }

              if (requiresAuth) {
                try {
                  const infoResponse = await fetch(`${serverUrl}/rest/info?f=pjson`);
                  const infoData = await infoResponse.json();
                  if (infoData.owningSystemUrl) {
                    isFederated = true;
                    portalUrl = infoData.owningSystemUrl;
                  }
                } catch { /* ignore */ }

                const username = window.prompt(
                  `Authentication required for:\n${isFederated ? portalUrl : serverUrl}\n\nUsername:`
                );
                if (!username) { alert("Authentication cancelled."); return; }
                const password = window.prompt("Password:");
                if (!password) { alert("Authentication cancelled."); return; }

                let tokenData: any;
                if (isFederated && portalUrl) {
                  const res = await fetch(`${portalUrl}/sharing/rest/generateToken`, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({ username, password, client: "referer", referer: window.location.origin, expiration: "60", f: "json" }),
                  });
                  tokenData = await res.json();
                } else {
                  const res = await fetch(`${serverUrl}/tokens/generateToken`, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({ username, password, client: "referer", referer: window.location.origin, expiration: "60", f: "json" }),
                  });
                  tokenData = await res.json();
                }

                if (tokenData?.token) {
                  arcgisTokens[serverUrl] = tokenData.token;
                  authToken = tokenData.token;
                } else {
                  throw new Error(tokenData?.error?.message || "Failed to generate token");
                }
              }
            } else {
              authToken = arcgisTokens[serverUrl];
            }
          } catch (error: any) {
            console.warn("Auth check failed, attempting to load layer without authentication:", error);
            // Don't bail out — let the ArcGIS API try to load the layer
            authToken = null;
          }
        }

        const tokenCustomParam = authToken ? { customParameters: { token: authToken } } : {};
        const tokenApiKeyParam = authToken ? { apiKey: authToken } : {};
        let layer: __esri.Layer | null = null;

        if (url.includes("/FeatureServer") || url.match(/\/\d+$/)) {
          layer = new FeatureLayer({ url, outFields: ["*"], ...tokenApiKeyParam });
        } else if (url.includes("/ImageServer")) {
          const { default: ImageryLayerDynamic } = await import("@arcgis/core/layers/ImageryLayer");
          layer = new ImageryLayerDynamic({ url, ...tokenCustomParam });
        } else if (url.match(/\/wms(server)?(\?|$|\/)/i) || url.match(/service=wms/i)) {
          const { default: WMSLayer } = await import("@arcgis/core/layers/WMSLayer");
          layer = new WMSLayer({ url, ...tokenCustomParam });
        } else if (url.match(/\/wmts(\/|\?|$)/i) || url.match(/service=wmts/i)) {
          const { default: WMTSLayer } = await import("@arcgis/core/layers/WMTSLayer");
          layer = new WMTSLayer({ url, ...tokenCustomParam });
        } else if (url.includes("/WFSServer") || url.match(/\/wfs(\?|$)/i) || url.match(/service=wfs/i)) {
          const { default: WFSLayer } = await import("@arcgis/core/layers/WFSLayer");
          const wfsUrl = url.replace(/\/WFSServer.*$/, "/WFSServer");
          layer = new WFSLayer({ url: wfsUrl, outFields: ["*"], popupEnabled: true, ...tokenCustomParam } as any);
        } else if (url.includes("/MapServer")) {
          // Check if the service has tile cache; if so, use TileLayer (avoids 500 on dynamic export)
          let useTileLayer = false;
          try {
            const infoUrl = url.includes("?") ? `${url}&f=json` : `${url}?f=json`;
            const infoRes = await fetch(infoUrl);
            if (infoRes.ok) {
              const infoData = await infoRes.json();
              useTileLayer = !!infoData.singleFusedMapCache;
            }
          } catch { /* ignore, fall back to MapImageLayer */ }

          if (useTileLayer) {
            layer = new TileLayer({ url, ...tokenCustomParam });
          } else {
            layer = new MapImageLayer({ url, ...tokenCustomParam });
          }
        } else {
          alert("Unsupported layer type. Check the URL format.\n\nSupported: /FeatureServer, /MapServer, /ImageServer, /wms, /wmts, /wfs");
          return;
        }

        map.add(layer);
        tempUserLayers.push(layer);
        updateAddLayerListUI();
        urlInput.value = "";
      } catch (err) {
        console.error("Error adding layer:", err);
        alert("❌ Failed to add layer. Check the console for details.");
      }
    });

    // File upload handler
    const uploadInput = addLayerContainer.querySelector("#upload-file") as HTMLInputElement;
    uploadInput?.addEventListener("change", async () => {
      try {
        const file = uploadInput.files?.[0];
        if (!file) return;
        const filename = file.name.toLowerCase();

        if (filename.endsWith(".csv")) {
          const reader = new FileReader();
          reader.onload = function (e) {
            try {
              const csvText = e.target?.result as string;
              const lines = csvText.split("\n").filter((line) => line.trim());
              if (lines.length < 2) { alert("❌ CSV must have at least a header and one data row."); return; }

              const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
              const latIndex = headers.findIndex((h) => h.includes("lat") || h.includes("latitude") || h === "y");
              const lonIndex = headers.findIndex((h) => h.includes("lon") || h.includes("lng") || h.includes("longitude") || h === "x");
              if (latIndex === -1 || lonIndex === -1) { alert("❌ CSV must contain lat/lon columns (e.g., lat, latitude, lon, longitude, x, y)."); return; }

              const features: any[] = [];
              for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(",").map((v) => v.trim());
                const lat = parseFloat(values[latIndex]);
                const lon = parseFloat(values[lonIndex]);
                if (!isNaN(lat) && !isNaN(lon)) {
                  const attributes: any = {};
                  headers.forEach((h, idx) => { attributes[h] = values[idx] || ""; });
                  features.push({ geometry: { type: "point", x: lon, y: lat, spatialReference: { wkid: 4326 } }, attributes });
                }
              }
              if (features.length === 0) { alert("❌ No valid coordinate data found in CSV."); return; }

              const randomColor = generateRandomColor();
              const csvLayer = new FeatureLayer({
                source: features,
                objectIdField: "ObjectID",
                fields: headers.map((h, idx) => ({ name: h, alias: h.charAt(0).toUpperCase() + h.slice(1), type: (idx === latIndex || idx === lonIndex ? "double" : "string") as any })),
                geometryType: "point",
                spatialReference: { wkid: 4326 },
                title: file.name.replace(".csv", ""),
                renderer: { type: "simple", symbol: { type: "simple-marker", color: randomColor, size: 8, outline: { color: [255, 255, 255, 0.8], width: 1 } } } as any,
                popupTemplate: { title: file.name.replace(".csv", ""), content: [{ type: "fields", fieldInfos: headers.map((h) => ({ fieldName: h, label: h.charAt(0).toUpperCase() + h.slice(1) })) }] },
              });
              map.add(csvLayer);
              tempUserLayers.push(csvLayer);
              updateAddLayerListUI();
              csvLayer.when(() => { view.goTo(csvLayer.fullExtent); });
            } catch (err) { console.error(err); alert("❌ Failed to parse CSV file."); }
          };
          reader.readAsText(file);

        } else if (filename.endsWith(".geojson") || filename.endsWith(".json")) {
          const reader = new FileReader();
          reader.onload = function (e) {
            try {
              const geojson = JSON.parse(e.target?.result as string);
              const blob = new Blob([JSON.stringify(geojson)], { type: "application/json" });
              const blobUrl = URL.createObjectURL(blob);
              const randomColor = generateRandomColor();
              const geojsonLayer = new GeoJSONLayer({ url: blobUrl, title: file.name.replace(/\.[^/.]+$/, "") });
              map.add(geojsonLayer);
              geojsonLayer.when(() => {
                const gType = geojsonLayer.geometryType;
                let renderer: any;
                if (gType === "point" || gType === "multipoint") {
                  renderer = { type: "simple", symbol: { type: "simple-marker", color: randomColor, size: 8, outline: { color: [255, 255, 255, 0.8], width: 1 } } };
                } else if (gType === "polyline") {
                  renderer = { type: "simple", symbol: { type: "simple-line", color: randomColor, width: 2 } };
                } else if (gType === "polygon") {
                  renderer = { type: "simple", symbol: { type: "simple-fill", color: randomColor, outline: { color: [255, 255, 255, 0.8], width: 1 } } };
                }
                if (renderer) geojsonLayer.renderer = renderer as any;
              });
              tempUserLayers.push(geojsonLayer);
              updateAddLayerListUI();
            } catch (err) { console.error(err); alert("❌ Invalid GeoJSON file."); }
          };
          reader.readAsText(file);

        } else if (filename.endsWith(".zip")) {
          const formData = new FormData();
          formData.append("file", file);

          const publishParameters = {
            name: file.name.replace(".zip", ""),
            targetSR: { wkid: 4326 },
            maxRecordCount: 1000,
            enforceInputFileSizeLimit: true,
            enforceOutputJsonSizeLimit: true,
          };

          try {
            const response = await esriRequest(
              "https://www.arcgis.com/sharing/rest/content/features/generate",
              {
                method: "post",
                query: {
                  filetype: "shapefile",
                  publishParameters: JSON.stringify(publishParameters),
                  f: "json",
                },
                body: formData,
                responseType: "json",
              }
            );

            const layerData = response.data.featureCollection?.layers?.[0];
            if (!layerData) throw new Error("No layer found in uploaded shapefile.");

            // Ensure OBJECTID
            const objectIdField = "OBJECTID";
            const hasOID = layerData.layerDefinition.fields.some(
              (f: any) => f.type === "oid" || f.name === objectIdField
            );
            if (!hasOID) {
              layerData.layerDefinition.fields.push({
                name: objectIdField,
                alias: objectIdField,
                type: "oid",
              });
              layerData.featureSet.features.forEach((f: any, i: number) => {
                f.attributes[objectIdField] = i + 1;
              });
              layerData.layerDefinition.objectIdField = objectIdField;
            }

            // Normalize field types
            layerData.layerDefinition.fields = layerData.layerDefinition.fields.map((f: any) => ({
              ...f,
              type: normalizeFieldType(f.type),
            }));
            // Fix geometryType for FeatureLayer
            layerData.layerDefinition.geometryType = normalizeGeometryType(
              layerData.layerDefinition.geometryType
            );

            // Geometries from the generate endpoint are already in WGS84 (4326)
            // Just inject the geometry type string required by the ArcGIS JS API
            layerData.featureSet.features = layerData.featureSet.features.map((f: any) => {
              f.geometry = {
                ...f.geometry,
                type: getGeometryTypeFromLayer(layerData.layerDefinition.geometryType),
              };
              return f;
            });

            const randomColor = generateRandomColor();
            const geometryType = layerData.layerDefinition.geometryType;
            let renderer: any;

            if (geometryType === "point") {
              renderer = {
                type: "simple",
                symbol: {
                  type: "simple-marker",
                  color: randomColor,
                  size: 8,
                  outline: { color: [255, 255, 255, 0.8], width: 1 },
                },
              };
            } else if (geometryType === "polyline") {
              renderer = {
                type: "simple",
                symbol: { type: "simple-line", color: randomColor, width: 2 },
              };
            } else if (geometryType === "polygon") {
              renderer = {
                type: "simple",
                symbol: {
                  type: "simple-fill",
                  color: randomColor,
                  outline: { color: [255, 255, 255, 0.8], width: 1 },
                },
              };
            }

            const shapefileLayer = new FeatureLayer({
              source: layerData.featureSet.features,
              fields: layerData.layerDefinition.fields,
              objectIdField: layerData.layerDefinition.objectIdField,
              geometryType: layerData.layerDefinition.geometryType,
              spatialReference: { wkid: 4326 },
              title: file.name.replace(".zip", ""),
              renderer: renderer as any,
            });

            map.add(shapefileLayer);
            tempUserLayers.push(shapefileLayer);
            updateAddLayerListUI();
            alert("✅ Shapefile loaded successfully.");
          } catch (error: any) {
            console.error("❌ Upload failed:", error);
            const isHTML =
              typeof error?.response?.data === "string" &&
              error.response.data.startsWith("<!DOCTYPE");
            const message = isHTML
              ? "Server returned HTML (check CORS or authentication)."
              : error?.message || "Unknown error uploading shapefile.";
            alert(`❌ Failed to upload shapefile.\n\n${message}`);
          }
        } else {
          alert("❌ Unsupported file format. Use .geojson, .json, .csv, or .zip");
        }
        uploadInput.value = "";
      } catch (err) {
        console.error(err);
      }
    });

    const addLayerExpand = new Expand({
      view: view,
      content: addLayerContainer,
      expandTooltip: "Add Layer from URL / File",
      expandIcon: "add-features",
    });
    view.ui.add(addLayerExpand, "top-left");

    const dsmLayers = [
      {
        url: "https://mygeoserve5.jupem.gov.my/imageserver/rest/services/PRODUCTION_ELEVATION_DSM/PROD_DSM_MY701T_2008/ImageServer",
        year: 2008,
        title: "DSM Peninsular 2008",
      },
      {
        url: "https://mygeoserve5.jupem.gov.my/imageserver/rest/services/PRODUCTION_ELEVATION_DSM/PROD_DSM_MY701T_2017/ImageServer",
        year: 2017,
        title: "DSM Peninsular 2017",
      },
      {
        url: "https://mygeoserve5.jupem.gov.my/imageserver/rest/services/PRODUCTION_ELEVATION_DTM/PROD_DTM_MY701T_2017/ImageServer",
        year: 2017,
        title: "DTM Peninsular 2017",
      },
      {
        url: "https://mygeoserve5.jupem.gov.my/imageserver/rest/services/PRODUCTION_CORI/PROD_CORI_MY701T_2008/ImageServer",
        year: 2008,
        title: "CORI Peninsular 2008",
      },
      {
        url: "https://mygeoserve5.jupem.gov.my/imageserver/rest/services/PRODUCTION_CORI/PROD_CORI_MY701T_2017/ImageServer",
        year: 2017,
        title: "CORI Peninsular 2017",
      },
    ];

    const DSMGroupLayer = new GroupLayer({
      title: "DSM Layers",
      visible: true,
      layers: [],
      id: "dsm-group",
    });

    dsmLayers.forEach(({ url, title }) => {
      // Create ImageryTileLayer for display with color
      const layer = new ImageryTileLayer({
        url,
        title: title, // Use the title from the array directly
        visible: false,
        // renderer: testrenderer,
        customParameters: {
          token:
            'SaTyX6UXtUV8e6-cZRz_4jzbB_6LrE9t8bP2QvX3eGL0yc3levdKmbn4KHs2x9H0WdISMQPB_EQY-yjEsYkNSXP2Bfkr2DaJkORATe3J-RNRGvcbVCy8vqstXkKAnfkwZ-kqkSxaN6Ludsh2WJUVBPEim9WYXOWlRqJdiFUfgbz0VZak9lXc3opbqmJPm4FB',
        },
        popupTemplate: {
          title: title,
          content: "",
        },
      });

      DSMGroupLayer.add(layer);
    });

    map.add(DSMGroupLayer);




    //------------------------TAMAT KOMPONEN MAP------------------------// 

    // Collect available imagery layers for change detection
    view.when(() => {
      const layers: LayerInfo[] = [];
      const fLayers: LayerInfo[] = [];
      map.allLayers.forEach((layer: __esri.Layer) => {
        if (layer.type === 'imagery' || layer.type === 'imagery-tile' || layer.type === 'tile' || layer.type === 'map-image') {
          layers.push({
            id: layer.id,
            title: layer.title || 'Untitled Layer',
            url: (layer as any).url,
            type: layer.type
          });
        }
        if (layer.type === 'feature') {
          fLayers.push({
            id: layer.id,
            title: layer.title || 'Untitled Layer',
            url: (layer as any).url,
            type: layer.type
          });
        }
      });
      setAvailableLayers(layers);
      setFeatureAvailableLayers(fLayers);
      console.log('Available layers for change detection:', layers);
      console.log('Available feature layers:', fLayers);
    });

    if (view.popup) {
      view.popup.defaultPopupTemplateEnabled = true;
    }
    return () => {
      view.destroy();
    };
  }, []);

  // Fetch legend items from an ImageServer legend endpoint
  const fetchLegendItems = async (url: string): Promise<{ label: string; imageData: string }[]> => {
    try {
      const resp = await esriRequest(`${url}/legend`, { query: { f: 'json' }, responseType: 'json' });
      const layers: any[] = resp?.data?.layers ?? [];
      const items: { label: string; imageData: string }[] = [];
      for (const lyr of layers) {
        for (const item of (lyr.legend ?? [])) {
          if (item.label !== undefined && item.imageData) {
            items.push({ label: String(item.label), imageData: item.imageData });
          }
        }
      }
      return items;
    } catch {
      return [];
    }
  };

  // Decode a base64 swatch PNG → sample center pixel color
  const decodeLegendSwatchColor = async (imageData: string): Promise<[number, number, number] | null> => {
    try {
      const blob = await (await fetch(`data:image/png;base64,${imageData}`)).blob();
      const bm = await createImageBitmap(blob);
      const c = document.createElement('canvas');
      c.width = 1; c.height = 1;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(bm, Math.floor(bm.width / 2), Math.floor(bm.height / 2), 1, 1, 0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    } catch {
      return null;
    }
  };

  // Build legend from colors actually visible in the result canvas
  const buildResultLegend = async (canvas: HTMLCanvasElement, afterUrl: string, afterTitle: string) => {
    // 1. Collect unique non-transparent colors from the output canvas
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    const uniqueColors: [number, number, number][] = [];
    const seen = new Set<string>();
    const step = 6;
    for (let i = 0; i < data.length; i += 4 * step) {
      if (data[i + 3] < 20) continue;
      const r = Math.round(data[i] / 8) * 8;
      const g = Math.round(data[i + 1] / 8) * 8;
      const b = Math.round(data[i + 2] / 8) * 8;
      const key = `${r},${g},${b}`;
      if (!seen.has(key)) { seen.add(key); uniqueColors.push([r, g, b]); }
    }

    // 2. Fetch the after-layer classification legend
    const legendItems = await fetchLegendItems(afterUrl);
    if (!legendItems.length || !uniqueColors.length) {
      setCdLegend({ type: 'classified', title: afterTitle, items: legendItems });
      return;
    }

    // 3. Match each legend swatch color against colors in the canvas
    const tolerance = 45;
    const matched: { label: string; imageData: string; color?: [number, number, number] }[] = [];
    for (const item of legendItems) {
      const swatchColor = await decodeLegendSwatchColor(item.imageData);
      if (!swatchColor) { matched.push(item); continue; }
      const [sr, sg, sb] = swatchColor;
      // Find the closest canvas color within tolerance
      let bestDist = Infinity;
      let bestColor: [number, number, number] | undefined;
      for (const [cr, cg, cb] of uniqueColors) {
        const dist = Math.sqrt((cr - sr) ** 2 + (cg - sg) ** 2 + (cb - sb) ** 2);
        if (dist < bestDist) { bestDist = dist; bestColor = [cr, cg, cb]; }
      }
      if (bestDist <= tolerance) matched.push({ ...item, color: bestColor });
    }

    setCdLegend({ type: 'classified', title: afterTitle, items: matched.length > 0 ? matched : legendItems });
  };

  const createChangeDetectionLayer = async () => {
    if (!viewRef.current || !beforeLayer || !afterLayer) {
      alert('Please select both before and after layers');
      return;
    }

    const view = viewRef.current;
    const map = view.map;

    // Remove existing change detection layer if any
    if (changeDetectionLayerRef.current && map) {
      map.remove(changeDetectionLayerRef.current);
      changeDetectionLayerRef.current = null;
    }

    let isImageryLayer = false; // Track layer type for error messages

    try {
      if (!map) return;
      
      // Get the selected layers
      const beforeLayerObj = map.allLayers.find(l => l.id === beforeLayer);
      const afterLayerObj = map.allLayers.find(l => l.id === afterLayer);

      if (!beforeLayerObj || !afterLayerObj) {
        alert('Selected layers not found');
        return;
      }

      // Get URLs from the layers
      const beforeUrl = (beforeLayerObj as any).url;
      const afterUrl = (afterLayerObj as any).url;

      if (!beforeUrl || !afterUrl) {
        alert('Selected layers must have URLs (ImageryLayer, TileLayer, or MapImageLayer)');
        return;
      }

      console.log('Creating change detection between:', beforeUrl, afterUrl);
      console.log('Before layer type:', beforeLayerObj.type);
      console.log('After layer type:', afterLayerObj.type);

      // Check if both URLs are ImageServer endpoints
      const isImageService = afterUrl.includes('ImageServer') && beforeUrl.includes('ImageServer');
      const isTileLayer = beforeLayerObj.type === 'tile' && afterLayerObj.type === 'tile';
      isImageryLayer = beforeLayerObj.type === 'imagery' && afterLayerObj.type === 'imagery';
      console.log('Is Image Service:', isImageService, '| Is Tile Layer:', isTileLayer, '| Is ImageryLayer:', isImageryLayer);

      // TileLayer: always use blend mode (only option for tiles)
      if (isTileLayer) {
        // Make the before layer visible underneath
        (beforeLayerObj as any).visible = true;
        (beforeLayerObj as any).opacity = 1;

        // Clone the after layer with blend mode on top
        const { default: TileLayer } = await import('@arcgis/core/layers/TileLayer');
        const blendLayer = new TileLayer({
          url: afterUrl,
          title: `Change Detection (${tileBlendMode})`,
          opacity: changeOpacity,
          blendMode: tileBlendMode as any,
          effect: hideDarkAreas ? 'brightness(150%) contrast(200%)' : undefined,
        });
        await blendLayer.load();
        changeDetectionLayerRef.current = blendLayer as any;
        map.add(blendLayer);
        setChangeDetectionActive(true);
        
        const modeDesc = tileBlendMode === 'difference' ? 'Dark = no change, Bright = changed' :
                        tileBlendMode === 'multiply' ? 'Keeps darker areas (highlights removal)' :
                        tileBlendMode === 'screen' ? 'Keeps brighter areas (highlights addition)' :
                        tileBlendMode === 'overlay' ? 'Enhanced contrast for changes' :
                        'Mutual exclusion highlighting';
        
        alert(`TileLayer change detection created!\n\nBlend Mode: ${tileBlendMode}\n${modeDesc}\n\n${hideDarkAreas ? '✓ Dark areas enhanced for visibility' : ''}`);
        return;
      }

      // ImageryLayer: snapshot (removeUnchanged) or explicit blend mode or fall through to rendering rules
      if (isImageryLayer) {
        // Make the before layer visible underneath
        (beforeLayerObj as any).visible = true;
        (beforeLayerObj as any).opacity = 1;

        if (removeUnchanged) {
          // ── Snapshot approach: fetch both layer images, compare pixel-by-pixel ──
          // This is reliable because both images are fetched fully before comparison,
          // unlike the per-tile cache approach which suffers from timing races.

          const ext = view.extent;
          const snapW = Math.min(Math.round(view.width * window.devicePixelRatio), 2048);
          const snapH = Math.min(Math.round(view.height * window.devicePixelRatio), 2048);
          const wkid = (ext.spatialReference as any)?.wkid ?? 102100;
          const exportQuery = {
            bbox: `${ext.xmin},${ext.ymin},${ext.xmax},${ext.ymax}`,
            bboxSR: String(wkid),
            size: `${snapW},${snapH}`,
            imageSR: String(wkid),
            format: 'png32',
            f: 'image',
          };

          const [beforeResp, afterResp] = await Promise.all([
            esriRequest(`${beforeUrl}/exportImage`, { query: exportQuery, responseType: 'blob' }),
            esriRequest(`${afterUrl}/exportImage`, { query: exportQuery, responseType: 'blob' }),
          ]);

          const [beforeBitmap, afterBitmap] = await Promise.all([
            createImageBitmap(beforeResp.data as Blob),
            createImageBitmap(afterResp.data as Blob),
          ]);

          // Draw before → read pixels
          const helperCanvas = document.createElement('canvas');
          helperCanvas.width = snapW;
          helperCanvas.height = snapH;
          const helperCtx = helperCanvas.getContext('2d')!;
          helperCtx.drawImage(beforeBitmap, 0, 0, snapW, snapH);
          const beforeData = helperCtx.getImageData(0, 0, snapW, snapH).data;

          // Draw after → read pixels
          const outCanvas = document.createElement('canvas');
          outCanvas.width = snapW;
          outCanvas.height = snapH;
          const outCtx = outCanvas.getContext('2d')!;
          outCtx.drawImage(afterBitmap, 0, 0, snapW, snapH);
          const afterData = outCtx.getImageData(0, 0, snapW, snapH).data;

          // Build output: only keep pixels where change exceeds threshold
          const outputImageData = outCtx.createImageData(snapW, snapH);
          const alpha = Math.round(changeOpacity * 255);
          for (let i = 0; i < afterData.length; i += 4) {
            const dr = Math.abs(afterData[i]     - beforeData[i]);
            const dg = Math.abs(afterData[i + 1] - beforeData[i + 1]);
            const db = Math.abs(afterData[i + 2] - beforeData[i + 2]);
            if ((dr + dg + db) / 3 >= changeThreshold) {
              outputImageData.data[i]     = afterData[i];
              outputImageData.data[i + 1] = afterData[i + 1];
              outputImageData.data[i + 2] = afterData[i + 2];
              outputImageData.data[i + 3] = alpha;
            }
            // else stays 0,0,0,0 → fully transparent
          }
          outCtx.putImageData(outputImageData, 0, 0);

          const outBlob: Blob = await new Promise(resolve =>
            outCanvas.toBlob(resolve as BlobCallback, 'image/png')
          );
          // Revoke any previous blob to avoid memory leaks
          if (cdBlobUrlRef.current) URL.revokeObjectURL(cdBlobUrlRef.current);
          const blobUrl = URL.createObjectURL(outBlob);
          cdBlobUrlRef.current = blobUrl;

          const { default: MediaLayer } = await import('@arcgis/core/layers/MediaLayer');
          const { default: ImageElement } = await import('@arcgis/core/layers/support/ImageElement');
          const { default: ExtentAndRotationGeoreference } = await import('@arcgis/core/layers/support/ExtentAndRotationGeoreference');

          const mediaLayer = new MediaLayer({
            source: [new ImageElement({
              image: blobUrl,
              georeference: new ExtentAndRotationGeoreference({ extent: ext }),
            })],
            title: `Change Detection (unchanged removed, Δ≥${changeThreshold})`,
          });

          changeDetectionLayerRef.current = mediaLayer as any;
          map.add(mediaLayer);
          setChangeDetectionActive(true);
          buildResultLegend(outCanvas, afterUrl, afterLayerObj.title ?? 'After');
          alert(`Change Detection applied to current view!\n\nOnly pixels with avg RGB difference ≥ ${changeThreshold}/255 are shown.\nUnchanged areas are fully transparent.\n\nTip: After panning or zooming, remove and re-apply to refresh the snapshot.`);
          return;
        }

        if (useBlendMode) {
          // ── Group-layer blend mode approach ──
          // The after layer blends only against the before layer inside the group,
          // so the basemap below is NOT included in the blend — avoiding the "darken all" issue.
          const { default: ImageryLayerDyn } = await import('@arcgis/core/layers/ImageryLayer');
          const { default: GroupLayerDyn } = await import('@arcgis/core/layers/GroupLayer');

          const resolvedBlendMode = tileBlendMode;

          const beforeClone = new ImageryLayerDyn({
            url: beforeUrl,
            title: `CD Before (${beforeLayerObj.title ?? 'Before'})`,
            opacity: 1,
          });

          const afterClone = new ImageryLayerDyn({
            url: afterUrl,
            title: `CD After (${afterLayerObj.title ?? 'After'})`,
            opacity: changeOpacity,
            blendMode: resolvedBlendMode as any,
            effect: hideDarkAreas ? 'brightness(150%) contrast(200%)' : undefined,
          });

          // blendMode on the group clips the blend result to the group boundary
          // so it composites cleanly against the basemap
          const cdGroup = new GroupLayerDyn({
            title: `Change Detection (${resolvedBlendMode})`,
            layers: [beforeClone, afterClone],
            opacity: 1,
          });

          changeDetectionLayerRef.current = cdGroup as any;
          map.add(cdGroup);
          setChangeDetectionActive(true);
          (() => {
            const blendLegendDescs: Record<string, string> = {
              difference: 'Black / dark = no change · Bright / colourful = area changed',
              exclusion:  'Black / dark = no change · Bright = changed area',
              multiply:   'Dark = overlap / no change · Light = area removed',
              screen:     'Dark = area added · Light = overlap / no change',
              overlay:    'Mid-grey = unchanged · Bright or dark = changed',
              'hard-light': 'Mid-grey = unchanged · Bright or dark = changed',
            };
            setCdLegend({
              type: 'blend',
              title: resolvedBlendMode,
              blendDesc: blendLegendDescs[resolvedBlendMode] ?? 'Bright / high-contrast areas indicate change',
            });
          })();
          alert(`Change Detection created!\n\nBlend Mode: ${resolvedBlendMode}\n\n${hideDarkAreas ? '✓ Dark areas enhanced for visibility\n\n' : ''}Note: Bright / high-contrast areas indicate change.`);
          return;
        }

        // ── Client-side heatmap difference for standard methods ──
        // Server-side raster functions cannot reference two different ImageServer URLs,
        // so we export both layers as images and compute the difference on the client.
        {
          const ext = view.extent;
          const snapW = Math.min(Math.round(view.width * window.devicePixelRatio), 2048);
          const snapH = Math.min(Math.round(view.height * window.devicePixelRatio), 2048);
          const wkid = (ext.spatialReference as any)?.wkid ?? 102100;
          const exportQuery = {
            bbox: `${ext.xmin},${ext.ymin},${ext.xmax},${ext.ymax}`,
            bboxSR: String(wkid),
            size: `${snapW},${snapH}`,
            imageSR: String(wkid),
            format: 'png32',
            f: 'image',
          };

          const [beforeResp, afterResp] = await Promise.all([
            esriRequest(`${beforeUrl}/exportImage`, { query: exportQuery, responseType: 'blob' }),
            esriRequest(`${afterUrl}/exportImage`, { query: exportQuery, responseType: 'blob' }),
          ]);

          const [beforeBitmap, afterBitmap] = await Promise.all([
            createImageBitmap(beforeResp.data as Blob),
            createImageBitmap(afterResp.data as Blob),
          ]);

          const helperCanvas = document.createElement('canvas');
          helperCanvas.width = snapW; helperCanvas.height = snapH;
          const helperCtx = helperCanvas.getContext('2d')!;
          helperCtx.drawImage(beforeBitmap, 0, 0, snapW, snapH);
          const beforeData = helperCtx.getImageData(0, 0, snapW, snapH).data;

          const outCanvas = document.createElement('canvas');
          outCanvas.width = snapW; outCanvas.height = snapH;
          const outCtx = outCanvas.getContext('2d')!;
          outCtx.drawImage(afterBitmap, 0, 0, snapW, snapH);
          const afterData = outCtx.getImageData(0, 0, snapW, snapH).data;

          const outputImageData = outCtx.createImageData(snapW, snapH);
          const threshold = detectionMethod === 'ndvi' ? changeThreshold * 0.5 : changeThreshold;
          // Helper: compute delta for a pixel index
          const computeDelta = (i: number): number => {
            if (detectionMethod === 'ratio') {
              const bAvg = (beforeData[i] + beforeData[i + 1] + beforeData[i + 2]) / 3 + 1;
              const aAvg = (afterData[i] + afterData[i + 1] + afterData[i + 2]) / 3;
              return Math.min(255, Math.abs((aAvg / bAvg - 1) * 255));
            }
            const dr = Math.abs(afterData[i]     - beforeData[i]);
            const dg = Math.abs(afterData[i + 1] - beforeData[i + 1]);
            const db = Math.abs(afterData[i + 2] - beforeData[i + 2]);
            return (dr + dg + db) / 3;
          };

          // Pass 1: find the max delta among changed pixels so breakpoints
          // auto-scale to the actual data range (LULC class colors rarely span 0–255).
          let maxObservedDelta = threshold; // fallback if nothing exceeds threshold
          for (let i = 0; i < afterData.length; i += 4) {
            if (afterData[i + 3] < 20 && beforeData[i + 3] < 20) continue;
            const d = computeDelta(i);
            if (d > maxObservedDelta) maxObservedDelta = d;
          }
          const autoRange = maxObservedDelta - threshold || 1;
          const lowBreak  = threshold + autoRange * 0.33; // lower third  → green
          const midBreak  = threshold + autoRange * 0.67; // middle third → yellow
          //                                               // upper third  → red

          // Pass 2: classify and paint
          for (let i = 0; i < afterData.length; i += 4) {
            if (afterData[i + 3] < 20 && beforeData[i + 3] < 20) continue;
            const delta = computeDelta(i);
            if (delta < threshold) continue; // unchanged — leave transparent

            // Hard discrete classes — breakpoints scale to observed data range
            let r: number, g: number, b: number;
            if (delta < lowBreak) {
              r = 0;   g = 200; b = 0;   // green  — low change
            } else if (delta < midBreak) {
              r = 255; g = 180; b = 0;   // yellow — moderate change
            } else {
              r = 220; g = 0;   b = 0;   // red    — high change
            }
            outputImageData.data[i]     = r;
            outputImageData.data[i + 1] = g;
            outputImageData.data[i + 2] = b;
            outputImageData.data[i + 3] = 255; // full opacity — no semi-transparent bleed
          }
          outCtx.putImageData(outputImageData, 0, 0);

          // Compute pixel-level statistics for the result heatmap
          let _greenPx = 0, _yellowPx = 0, _redPx = 0;
          for (let _i = 0; _i < outputImageData.data.length; _i += 4) {
            if (outputImageData.data[_i + 3] === 0) continue;
            const _pr = outputImageData.data[_i], _pg = outputImageData.data[_i + 1];
            if (_pr < 50) _greenPx++;           // green  (0, 200, 0)
            else if (_pg > 100) _yellowPx++;    // yellow (255, 180, 0)
            else _redPx++;                      // red    (220, 0, 0)
          }
          const _extW = Math.abs(ext.xmax - ext.xmin);
          const _extH = Math.abs(ext.ymax - ext.ymin);
          const _pxAreaM2 = (_extW * _extH) / (snapW * snapH);
          const _pxToHa = (px: number) => Math.round(px * _pxAreaM2 / 10000 * 100) / 100;
          const _cdStats = {
            greenPx: _greenPx, yellowPx: _yellowPx, redPx: _redPx,
            greenHa: _pxToHa(_greenPx),
            yellowHa: _pxToHa(_yellowPx),
            redHa: _pxToHa(_redPx),
            totalChangedHa: _pxToHa(_greenPx + _yellowPx + _redPx),
          };

          const outBlob: Blob = await new Promise(resolve =>
            outCanvas.toBlob(resolve as BlobCallback, 'image/png')
          );
          if (cdBlobUrlRef.current) URL.revokeObjectURL(cdBlobUrlRef.current);
          const blobUrl = URL.createObjectURL(outBlob);
          cdBlobUrlRef.current = blobUrl;

          const { default: MediaLayer } = await import('@arcgis/core/layers/MediaLayer');
          const { default: ImageElement } = await import('@arcgis/core/layers/support/ImageElement');
          const { default: ExtentAndRotationGeoreference } = await import('@arcgis/core/layers/support/ExtentAndRotationGeoreference');

          const mediaLayer = new MediaLayer({
            source: [new ImageElement({
              image: blobUrl,
              georeference: new ExtentAndRotationGeoreference({ extent: ext }),
            })],
            title: `Change Detection (${detectionMethod})`,
          });

          changeDetectionLayerRef.current = mediaLayer as any;
          map.add(mediaLayer);
          setChangeDetectionActive(true);
          setCdRasterStats(_cdStats);
          setCdLegend({
            type: 'blend',
            title: `Difference Heatmap (${detectionMethod})`,
            blendDesc: 'Green = low change · Yellow = moderate change · Red = high change · Transparent = no change',
          });
          alert(`Change Detection applied!\n\nMethod: ${detectionMethod}\nThreshold: ${threshold.toFixed(0)}/255\n\nGreen = low change\nYellow = moderate change\nRed = high change\nTransparent = no change\n\nTip: Zoom or pan then re-apply to refresh the snapshot.`);
          return;
        }
      }

      if (!isImageService && !isTileLayer) {
        alert('Change detection requires ImageServer layers (ImageryLayer or ImageryTileLayer), or two TileLayers. Please select compatible layers.');
        return;
      }

      // Build rendering rule JSON
      let renderingRuleJson: any;

      switch (detectionMethod) {
        case 'difference':
          renderingRuleJson = {
            "rasterFunction": "Stretch",
            "rasterFunctionArguments": {
              "Raster": {
                "rasterFunction": "Arithmetic",
                "rasterFunctionArguments": {
                  "Raster": { "url": afterUrl },
                  "Raster2": { "url": beforeUrl },
                  "Operation": 3
                }
              },
              "StretchType": 6,
              "NumberOfStandardDeviations": 2.5
            }
          };
          break;

        case 'ratio':
          renderingRuleJson = {
            "rasterFunction": "Stretch",
            "rasterFunctionArguments": {
              "Raster": {
                "rasterFunction": "Arithmetic",
                "rasterFunctionArguments": {
                  "Raster": { "url": afterUrl },
                  "Raster2": { "url": beforeUrl },
                  "Operation": 4
                }
              },
              "StretchType": 5,
              "MinPercent": 2,
              "MaxPercent": 2
            }
          };
          break;

        case 'ndvi':
          renderingRuleJson = {
            "rasterFunction": "Stretch",
            "rasterFunctionArguments": {
              "Raster": {
                "rasterFunction": "Abs",
                "rasterFunctionArguments": {
                  "Raster": {
                    "rasterFunction": "Arithmetic",
                    "rasterFunctionArguments": {
                      "Raster": { "url": afterUrl },
                      "Raster2": { "url": beforeUrl },
                      "Operation": 3
                    }
                  }
                }
              },
              "StretchType": 5,
              "MinPercent": 1,
              "MaxPercent": 1
            }
          };
          break;

        case 'composite':
          renderingRuleJson = {
            "rasterFunction": "Stretch",
            "rasterFunctionArguments": {
              "Raster": {
                "rasterFunction": "Arithmetic",
                "rasterFunctionArguments": {
                  "Raster": { "url": beforeUrl },
                  "Raster2": { "url": afterUrl },
                  "Operation": 3
                }
              },
              "StretchType": 6,
              "NumberOfStandardDeviations": 2.5
            }
          };
          break;
      }

      console.log('Rendering rule JSON:', JSON.stringify(renderingRuleJson, null, 2));

      // If blend mode is enabled, use a simpler approach with layer blending
      if (useBlendMode) {
        console.log('Using blend mode approach...');

        // Create a clone of the after layer with difference blend mode
        const changeLayer = new ImageryLayer({
          url: beforeUrl,
          title: `Change Detection (Blend Mode)`,
          opacity: 0.5,
          blendMode: 'difference',
          customParameters: {
            token: 'SaTyX6UXtUV8e6-cZRz_4jzbB_6LrE9t8bP2QvX3eGL0yc3levdKmbn4KHs2x9H0WdISMQPB_EQY-yjEsYkNSXP2Bfkr2DaJkORATe3J-RNRGvcbVCy8vqstXkKAnfkwZ-kqkSxaN6Ludsh2WJUVBPEim9WYXOWlRqJdiFUfgbz0VZak9lXc3opbqmJPm4FB',
          }
        });

        await changeLayer.load();
        changeDetectionLayerRef.current = changeLayer;
        map.add(changeLayer);
        setChangeDetectionActive(true);

        alert('Change detection using blend mode! Black areas = similar, colored areas = different.\n\nNote: Make sure the "After" layer is visible in the layer list for this to work.');
        return;
      }

      // Create layer with renderingRule in URL parameters
      const changeLayer = new ImageryLayer({
        url: afterUrl,
        title: `Change Detection (${detectionMethod})`,
        opacity: 0.85,
        customParameters: {
          token: 'SaTyX6UXtUV8e6-cZRz_4jzbB_6LrE9t8bP2QvX3eGL0yc3levdKmbn4KHs2x9H0WdISMQPB_EQY-yjEsYkNSXP2Bfkr2DaJkORATe3J-RNRGvcbVCy8vqstXkKAnfkwZ-kqkSxaN6Ludsh2WJUVBPEim9WYXOWlRqJdiFUfgbz0VZak9lXc3opbqmJPm4FB',
          renderingRule: JSON.stringify(renderingRuleJson)
        }
      } as any);
      
      // Set rendering rule after creation
      (changeLayer as any).renderingRule = renderingRuleJson;

      console.log('Change layer created, loading...');

      // Load the layer first
      try {
        await changeLayer.load();
        console.log('Change layer loaded successfully');
        console.log('Layer renderingRule property:', (changeLayer as any).renderingRule);

        // Force refresh
        await changeLayer.refresh();

        changeDetectionLayerRef.current = changeLayer;
        map.add(changeLayer);
        setChangeDetectionActive(true);

        console.log('Change layer added to map');

        // Zoom to the layer extent
        setTimeout(() => {
          if (changeLayer.fullExtent) {
            view.goTo(changeLayer.fullExtent).catch(console.error);
          }
        }, 1000);

        alert(`Change detection created!\n\nMethod: ${detectionMethod}\n\nIf you still see the original layer, try:\n1. Toggle layer visibility in Layer List\n2. Zoom in/out\n3. Try a different detection method\n\nCheck console for debugging info.`);
      } catch (loadError) {
        console.error('Error loading change layer:', loadError);
        alert('Error loading change detection layer. The server might not support this raster function.\n\n✅ SOLUTION: Enable "Use Blend Mode for ImageLayers (simpler)" checkbox and try again.\n\nBlend mode works with all ImageServers and doesn\'t require server-side processing.');
        return;
      }
    } catch (error) {
      console.error('Error creating change detection layer:', error);
      const errorMsg = isImageryLayer 
        ? 'Error creating change detection layer.\n\n✅ TIP: If you\'re using ImageryLayers, try enabling "Use Blend Mode for ImageLayers (simpler)" checkbox. Blend mode is more compatible and doesn\'t require server-side raster function support.'
        : 'Error creating change detection layer. Please ensure both layers are imagery layers with valid URLs.';
      alert(errorMsg);
    }
  }; const removeChangeDetectionLayer = () => {
    if (viewRef.current && viewRef.current.map && changeDetectionLayerRef.current) {
      viewRef.current.map.remove(changeDetectionLayerRef.current);
      changeDetectionLayerRef.current = null;
      // Revoke blob URL if it was created for the snapshot approach
      if (cdBlobUrlRef.current) {
        URL.revokeObjectURL(cdBlobUrlRef.current);
        cdBlobUrlRef.current = null;
      }
      // Clean up pixelFilter on the before layer if it was set
      if (beforeLayerRefForCD.current) {
        (beforeLayerRefForCD.current as any).pixelFilter = null;
        beforeLayerRefForCD.current = null;
      }
      setChangeDetectionActive(false);
      setCdLegend(null);
      setCdRasterStats(null);
      // setBeforeLayer('');
      // setAfterLayer('');
    }
  };

  // ── Feature Layer Change Detection ──
  const runFeatureLayerChangeDetection = async () => {
    if (!viewRef.current || !beforeFeatureLayer || !afterFeatureLayer) {
      alert('Please select both before and after feature layers.');
      return;
    }
    if (beforeFeatureLayer === afterFeatureLayer) {
      alert('Please select two different layers.');
      return;
    }
    if (!compareField.trim()) {
      alert('Please enter a field name to compare (e.g. gridcode).');
      return;
    }

    const view = viewRef.current;
    const map = view.map as __esri.Map;

    // Remove any existing result
    if (featureChangeResultRef.current) {
      map?.remove(featureChangeResultRef.current);
      featureChangeResultRef.current = null;
    }

    setFeatureChangeLoading(true);
    setFeatureChangeStats(null);

    try {
      const beforeFL = map?.allLayers.find(l => l.id === beforeFeatureLayer) as FeatureLayer | undefined;
      const afterFL = map?.allLayers.find(l => l.id === afterFeatureLayer) as FeatureLayer | undefined;

      if (!beforeFL || !afterFL) {
        alert('Selected layers not found on the map.');
        setFeatureChangeLoading(false);
        return;
      }

      // Paginate through all features (service maxRecordCount may be < total feature count)
      const fetchAllFeatures = async (layer: FeatureLayer): Promise<__esri.Graphic[]> => {
        await layer.load();
        const pageSize = (layer as any).maxRecordCount || 2000;
        const totalCount = await layer.queryFeatureCount({ where: '1=1' });
        const fetchLimit = featureQueryLimit > 0 ? Math.min(featureQueryLimit, totalCount) : totalCount;
        const allFeatures: __esri.Graphic[] = [];
        for (let start = 0; start < fetchLimit; start += pageSize) {
          const result = await layer.queryFeatures({
            where: '1=1',
            outFields: ['*'],
            returnGeometry: true,
            num: Math.min(pageSize, fetchLimit - start),
            start,
            orderByFields: ['objectid'],
          });
          allFeatures.push(...result.features);
          setFeatureChangeProgress(`Fetching ${layer.title}: ${allFeatures.length} / ${fetchLimit}...`);
        }
        console.log(`Fetched ${allFeatures.length} / ${totalCount} features from ${layer.title}`);
        return allFeatures;
      };

      const [beforeFeatures, afterFeatures] = await Promise.all([
        fetchAllFeatures(beforeFL as FeatureLayer),
        fetchAllFeatures(afterFL as FeatureLayer),
      ]);

      if (!beforeFeatures.length || !afterFeatures.length) {
        alert('One or both layers returned no features. Check visibility and filters.');
        setFeatureChangeLoading(false);
        return;
      }

      const field = compareField.trim();
      
      // Ensure layers are fully loaded to access domains and types
      await Promise.all([
        (beforeFL as FeatureLayer).load(),
        (afterFL as FeatureLayer).load()
      ]);
      
      // Get field definition and domain for alias lookup (try both layers)
      let fieldDef = (beforeFL as FeatureLayer).fields.find(f => f.name === field);
      if (!fieldDef) {
        fieldDef = (afterFL as FeatureLayer).fields.find(f => f.name === field);
      }
      
      const domain = fieldDef?.domain;
      const isCodedValueDomain = domain?.type === 'coded-value';
      
      // Check for layer types (subtypes) - common in ArcGIS services
      const layerTypes = (beforeFL as any).types || (afterFL as any).types;
      const typeIdField = (beforeFL as any).typeIdField || (afterFL as any).typeIdField;
      const hasTypes = layerTypes && layerTypes.length > 0 && typeIdField === field;
      
      console.log('Field:', field);
      console.log('Field definition:', fieldDef);
      console.log('Domain:', domain);
      console.log('Is coded value domain:', isCodedValueDomain);
      console.log('Layer types:', layerTypes);
      console.log('Type ID field:', typeIdField);
      console.log('Has types:', hasTypes);
      
      // Helper function to get domain/type alias (description) for a code value
      const getDomainAlias = (value: any): string => {
        if (value == null) return 'N/A';
        
        // First check layer types (subtypes)
        if (hasTypes) {
          const typeInfo = layerTypes.find((t: any) => {
            return t.id === value || String(t.id) === String(value) || Number(t.id) === Number(value);
          });
          if (typeInfo) {
            // console.log(`Type lookup: ${value} → ${typeInfo.name}`);
            return typeInfo.name;
          }
        }
        
        // Fall back to coded-value domain
        if (isCodedValueDomain) {
          const codedDomain = domain as __esri.CodedValueDomain;
          const codedValue = codedDomain.codedValues?.find(cv => {
            return cv.code === value || String(cv.code) === String(value) || Number(cv.code) === Number(value);
          });
          if (codedValue) {
            console.log(`Domain lookup: ${value} → ${codedValue.name}`);
            return codedValue.name;
          }
        }
        
        // No mapping found, return raw value
        return String(value);
      };
      
      const changedFeatures: __esri.Graphic[] = [];
      const changesByType: Record<string, number> = {};
      let totalAreaSqm = 0;

      // Helper: yield to browser so UI stays responsive
      const yieldToUI = () => new Promise<void>(resolve => setTimeout(resolve, 0));

      // Process afterFeatures in chunks to avoid freezing the browser
      const CHUNK_SIZE = 20;
      for (let chunkStart = 0; chunkStart < afterFeatures.length; chunkStart += CHUNK_SIZE) {
        const chunk = afterFeatures.slice(chunkStart, chunkStart + CHUNK_SIZE);

        for (const afterFeat of chunk) {
          const afterGeom = afterFeat.geometry;
          if (!afterGeom || afterGeom.type !== 'polygon') continue;
          const afterVal = afterFeat.attributes?.[field];

          for (const beforeFeat of beforeFeatures) {
            const beforeGeom = beforeFeat.geometry;
            if (!beforeGeom || beforeGeom.type !== 'polygon') continue;
            const beforeVal = beforeFeat.attributes?.[field];

            // Skip if class is same (unchanged)
            if (String(afterVal) === String(beforeVal)) continue;

            // Quick bounding-box pre-filter to avoid expensive intersection on non-overlapping polygons
            const aExt = (afterGeom as __esri.Polygon).extent;
            const bExt = (beforeGeom as __esri.Polygon).extent;
            if (aExt && bExt) {
              if (aExt.xmax < bExt.xmin || aExt.xmin > bExt.xmax ||
                  aExt.ymax < bExt.ymin || aExt.ymin > bExt.ymax) continue;
            }

            // Compute intersection
            const intersection = geometryEngine.intersect(afterGeom, beforeGeom);
            if (!intersection) continue;

            // Only keep actual polygon intersections with area > 0
            const areaSqm = geometryEngine.geodesicArea(intersection as __esri.Polygon, 'square-meters');
            if (!areaSqm || areaSqm <= 0) continue;

            // Get domain aliases for display
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
                area_ha: Math.round(areaSqm / 10000 * 10000) / 10000,
              }
            } as any);
          }
        }

        // Yield to browser every chunk to keep UI responsive
        const pct = Math.round(((chunkStart + CHUNK_SIZE) / afterFeatures.length) * 100);
        setFeatureChangeProgress(`Processing... ${Math.min(pct, 100)}% (${changedFeatures.length} changes found)`);
        await yieldToUI();
      }
      setFeatureChangeProgress('');

      if (changedFeatures.length === 0) {
        alert('No changed areas detected.\n\nCheck that:\n• Both layers cover the same area\n• The compare field name is correct\n• The layers use the same coordinate system');
        setFeatureChangeLoading(false);
        return;
      }

      // Build unique change_type values and assign colors
      const uniqueTypes = Object.keys(changesByType);
      const palette = [
        [255, 0, 0, 0.7], [255, 165, 0, 0.7], [128, 0, 128, 0.7], [0, 128, 0, 0.7],
        [0, 0, 255, 0.7], [255, 20, 147, 0.7], [0, 206, 209, 0.7], [139, 69, 19, 0.7],
      ];
      const uniqueValueInfos = uniqueTypes.map((type, i) => {
        const c = palette[i % palette.length] as number[];
        return {
          value: type,
          symbol: {
            type: 'simple-fill',
            color: [c[0], c[1], c[2], c[3]],
            outline: { color: [255, 255, 255, 0.6], width: 0.5 },
          },
          label: type,
        };
      });

      const popupFields = [
        { fieldName: 'change_from', label: 'From (Before)' },
        { fieldName: 'change_to', label: 'To (After)' },
        { fieldName: 'change_type', label: 'Change Type' },
        { fieldName: 'area_sqm', label: 'Area (m²)' },
        { fieldName: 'area_ha', label: 'Area (ha)' },
      ];

      const resultLayer = new FeatureLayer({
        source: changedFeatures,
        objectIdField: 'OBJECTID',
        geometryType: 'polygon',
        spatialReference: afterFeatures[0].geometry?.spatialReference ?? { wkid: 102100 } as any,
        title: `Change Detection Result (${beforeFL.title} → ${afterFL.title})`,
        fields: [
          { name: 'OBJECTID', type: 'oid' },
          { name: 'change_from', type: 'string', alias: 'From (Before)' },
          { name: 'change_to', type: 'string', alias: 'To (After)' },
          { name: 'change_type', type: 'string', alias: 'Change Type' },
          { name: 'area_sqm', type: 'double', alias: 'Area (m²)' },
          { name: 'area_ha', type: 'double', alias: 'Area (ha)' },
        ],
        renderer: {
          type: 'unique-value',
          field: 'change_type',
          uniqueValueInfos,
          defaultSymbol: {
            type: 'simple-fill',
            color: [200, 200, 200, 0.5],
            outline: { color: [255, 255, 255, 0.4], width: 0.5 },
          },
        } as any,
        popupTemplate: {
          title: 'Change Detected',
          content: [{ type: 'fields', fieldInfos: popupFields }],
        },
      });

      map?.add(resultLayer);
      featureChangeResultRef.current = resultLayer;
      setFeatureChangeActive(true);
      setFeatureChangeStats({
        totalArea: Math.round(totalAreaSqm),
        changesByType: Object.fromEntries(
          Object.entries(changesByType).map(([k, v]) => [k, Math.round(v)])
        ),
        featureCount: changedFeatures.length,
      });

      // Zoom to result
      resultLayer.when(() => {
        if (resultLayer.fullExtent) {
          viewRef.current?.goTo(resultLayer.fullExtent).catch(console.error);
        }
      });

    } catch (err) {
      console.error('Feature layer change detection failed:', err);
      alert('Change detection failed. See console for details.');
    } finally {
      setFeatureChangeLoading(false);
      setFeatureChangeProgress('');
    }
  };

  const removeFeatureChangeDetection = () => {
    if (viewRef.current && featureChangeResultRef.current) {
      (viewRef.current.map as __esri.Map)?.remove(featureChangeResultRef.current);
      featureChangeResultRef.current = null;
    }
    setFeatureChangeActive(false);
    setFeatureChangeStats(null);
    setBeforeFeatureLayer('');
    setAfterFeatureLayer('');
  };

  const exportResultToGeoJSON = async () => {
    const layer = featureChangeResultRef.current;
    if (!layer) return;
    try {
      const result = await layer.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: true, num: 10000 });
      const features = result.features.map(f => {
        const geom = f.geometry as __esri.Polygon;
        const sr = geom.spatialReference;
        const isWebMercator = sr?.wkid === 102100 || sr?.wkid === 3857 || (sr as any)?.latestWkid === 3857;

        // Convert each ring vertex to WGS84 lon/lat
        const rings = geom.rings.map(ring =>
          ring.map(([x, y]) => {
            if (isWebMercator) {
              const pt = webMercatorUtils.xyToLngLat(x, y);
              return [Math.round(pt[0] * 1e7) / 1e7, Math.round(pt[1] * 1e7) / 1e7];
            }
            // Already geographic (WGS84)
            return [Math.round(x * 1e7) / 1e7, Math.round(y * 1e7) / 1e7];
          })
        );
        return {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: rings },
          properties: { ...f.attributes },
        };
      });
      const geojson = {
        type: 'FeatureCollection',
        features,
      };
      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `change_detection_result_${new Date().toISOString().slice(0, 10)}.geojson`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('GeoJSON export failed:', err);
      alert('Export failed. See console for details.');
    }
  };

  // When before feature layer changes, load its fields for the compare-field dropdown
  const loadFeatureLayerFields = async (layerId: string) => {
    if (!viewRef.current || !layerId) { setFeatureLayerFields([]); return; }
    const layer = (viewRef.current.map as __esri.Map)?.allLayers.find(l => l.id === layerId) as FeatureLayer | undefined;
    if (!layer) return;
    try {
      await (layer as FeatureLayer).load();
      const numericTypes = ['oid', 'integer', 'small-integer', 'double', 'single', 'big-integer', 'string'];
      const fields = (layer as FeatureLayer).fields
        .filter(f => numericTypes.includes(f.type))
        .map(f => f.name);
      setFeatureLayerFields(fields);
      if (fields.includes('gridcode')) setCompareField('gridcode');
      else if (fields.length > 0) setCompareField(fields[0]);
    } catch { /* ignore */ }
  };

  // ── Swipe widget ──
  const createSwipeWidget = async () => {
    if (!viewRef.current || !swipeBeforeLayer || !swipeAfterLayer) {
      alert('Please select both leading and trailing layers for the swipe.');
      return;
    }
    if (swipeWidgetRef.current) {
      swipeWidgetRef.current.destroy();
      swipeWidgetRef.current = null;
    }
    const view = viewRef.current;
    const map = view.map as __esri.Map;
    if (!map) { alert('Map not ready.'); return; }
    const bLayer = map.allLayers.find(l => l.id === swipeBeforeLayer);
    const aLayer = map.allLayers.find(l => l.id === swipeAfterLayer);
    if (!bLayer || !aLayer) { alert('Selected layers not found.'); return; }
    (bLayer as any).visible = true;
    (aLayer as any).visible = true;
    const { default: SwipeWidget } = await import('@arcgis/core/widgets/Swipe');
    const swipe = new SwipeWidget({
      view,
      leadingLayers: [bLayer],
      trailingLayers: [aLayer],
      position: 50,
      direction: 'horizontal',
    });
    view.ui.add(swipe);
    swipeWidgetRef.current = swipe;
    setSwipeActive(true);
  };

  const removeSwipeWidget = () => {
    if (swipeWidgetRef.current) {
      swipeWidgetRef.current.destroy();
      swipeWidgetRef.current = null;
    }
    setSwipeActive(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '98vh' }}>
      <div ref={mapDiv} style={{ width: '100%', height: '100%' }}></div>

      {/* Change Detection Button */}
      <button
        onClick={() => setShowChangePanel(!showChangePanel)}
        style={{
          position: 'absolute',
          bottom: '40px',
          right: '15px',
          padding: '10px 15px',
          backgroundColor: '#0079c1',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          zIndex: 1000
        }}
      >
        {showChangePanel ? 'Hide' : 'Show'} Change Detection
      </button>

      {/* Change Detection Panel */}
      {showChangePanel && (
        <div style={{
          position: 'absolute',
          bottom: '90px',
          right: '15px',
          width: '350px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          zIndex: 1000,
          maxHeight: 'calc(100vh - 80px)',
          overflowY: 'auto'
        }}>
          <div style={{ padding: '15px', borderBottom: '2px solid #0079c1' }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#0079c1' }}>Change Detection</h3>
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666' }}>
              Detect changes between two layers using raster functions or blend mode
            </p>
            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setCdMode('raster')}
                style={{
                  flex: 1, padding: '6px', fontSize: '12px', fontWeight: 'bold',
                  borderRadius: '4px', border: 'none', cursor: 'pointer',
                  backgroundColor: cdMode === 'raster' ? '#0079c1' : '#e0e0e0',
                  color: cdMode === 'raster' ? 'white' : '#333',
                }}
              >
                🖼️ Raster / Tile
              </button>
              <button
                onClick={() => setCdMode('feature')}
                style={{
                  flex: 1, padding: '6px', fontSize: '12px', fontWeight: 'bold',
                  borderRadius: '4px', border: 'none', cursor: 'pointer',
                  backgroundColor: cdMode === 'feature' ? '#0079c1' : '#e0e0e0',
                  color: cdMode === 'feature' ? 'white' : '#333',
                }}
              >
                🗺️ Feature Layer
              </button>
            </div>
          </div>

          <div style={{ padding: '15px' }}>
            {cdMode === 'raster' && (<>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Before Layer (Time 1):
            </label>
            <select
              value={beforeLayer}
              onChange={(e) => setBeforeLayer(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '15px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px'
              }}
              disabled={changeDetectionActive}
            >
              <option value="">Select a layer...</option>
              {availableLayers.map(layer => (
                <option key={layer.id} value={layer.id}>
                  {layer.title} ({layer.type})
                </option>
              ))}
            </select>

            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              After Layer (Time 2):
            </label>
            <select
              value={afterLayer}
              onChange={(e) => setAfterLayer(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '15px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px'
              }}
              disabled={changeDetectionActive}
            >
              <option value="">Select a layer...</option>
              {availableLayers.map(layer => (
                <option key={layer.id} value={layer.id}>
                  {layer.title} ({layer.type})
                </option>
              ))}
            </select>

            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Detection Method:
            </label>
            <select
              value={detectionMethod}
              onChange={(e) => setDetectionMethod(e.target.value as ChangeDetectionMethod)}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '15px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px'
              }}
              disabled={changeDetectionActive}
            >
              <option value="difference">Difference (Standard)</option>
              <option value="ratio">Ratio (Proportional Changes)</option>
              <option value="ndvi">Colormap (Highlights Changes)</option>
              <option value="composite">Composite (Side-by-side)</option>
            </select>

            {/* Method description tooltip */}
            <div style={{ margin: '-8px 0 15px 0', padding: '8px 10px', fontSize: '12px', color: '#444', backgroundColor: '#eef6ff', borderRadius: '4px', borderLeft: '3px solid #0079c1', lineHeight: '1.5' }}>
              ℹ️ {({
                difference: 'Per-pixel absolute difference between layers. Green = low change · Yellow = moderate · Red = high change.',
                ratio: 'Divides after-pixel by before-pixel values. Highlights proportional changes — useful for gradual land-cover shifts.',
                ndvi: 'Vegetation-index-style comparison with a reduced threshold. Best for detecting vegetation loss or regrowth.',
                composite: 'Same as Difference but with before/after order swapped. Compare which epoch appears visually brighter.',
              } as Record<string, string>)[detectionMethod]}
            </div>

            {/* TileLayer-specific options */}
            <div style={{ 
              marginBottom: '15px', 
              padding: '10px', 
              backgroundColor: '#f9f9f9', 
              borderRadius: '4px',
              border: '1px solid #e0e0e0'
            }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: '#0079c1' }}>
                🎨 TileLayer Options
              </p>
              
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                Blend Mode:
              </label>
              <select
                value={tileBlendMode}
                onChange={(e) => setTileBlendMode(e.target.value as TileBlendMode)}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
                disabled={changeDetectionActive}
              >
                <option value="difference">Difference (Symmetric)</option>
                <option value="multiply">Multiply (Darkens)</option>
                <option value="screen">Screen (Lightens)</option>
                <option value="overlay">Overlay (Contrast)</option>
                <option value="exclusion">Exclusion (Soft Difference)</option>
              </select>

              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                Opacity: {changeOpacity.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={changeOpacity}
                onChange={(e) => setChangeOpacity(parseFloat(e.target.value))}
                disabled={changeDetectionActive}
                style={{
                  width: '100%',
                  marginBottom: '10px'
                }}
              />

              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hideDarkAreas}
                  onChange={(e) => setHideDarkAreas(e.target.checked)}
                  disabled={changeDetectionActive}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontSize: '12px' }}>
                  Enhance visibility (brighten dark areas)
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginTop: '8px' }}>
                <input
                  type="checkbox"
                  checked={removeUnchanged}
                  onChange={(e) => setRemoveUnchanged(e.target.checked)}
                  disabled={changeDetectionActive}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontSize: '12px' }}>
                  Remove unchanged pixels (ImageryLayer only)
                </span>
              </label>

              {removeUnchanged && (
                <div style={{ marginTop: '8px', paddingLeft: '4px' }}>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                    Change threshold: <strong>{changeThreshold}</strong> / 255
                    <span style={{ color: '#888', fontSize: '11px', marginLeft: '6px' }}>
                      (lower = more sensitive)
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Always-visible threshold slider */}
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Change Threshold</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0079c1', minWidth: '40px', textAlign: 'right' }}>
                  {changeThreshold} <span style={{ fontWeight: 'normal', color: '#888', fontSize: '11px' }}>/ 255</span>
                </span>
              </label>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={changeThreshold}
                onChange={(e) => setChangeThreshold(parseInt(e.target.value))}
                disabled={changeDetectionActive}
                style={{ width: '100%', marginBottom: '4px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#999' }}>
                <span>5 — more sensitive</span>
                <span>120 — less sensitive</span>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
                Pixels with avg colour difference below this value are treated as unchanged (transparent).
              </p>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={useBlendMode}
                  onChange={(e) => setUseBlendMode(e.target.checked)}
                  disabled={changeDetectionActive}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontSize: '13px' }}>
                  Use Blend Mode for ImageLayers (simpler)
                </span>
              </label>
            </div>

            {!changeDetectionActive ? (
              <button
                onClick={createChangeDetectionLayer}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: beforeLayer && afterLayer ? '#28a745' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: beforeLayer && afterLayer ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
                disabled={!beforeLayer || !afterLayer}
              >
                🔍 Create Change Detection
              </button>
            ) : (
              <button
                onClick={removeChangeDetectionLayer}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                ❌ Remove Change Detection
              </button>
            )}

            {/* Raster change statistics */}
            {changeDetectionActive && cdRasterStats && (
              <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#f0fff4', borderRadius: '4px', borderLeft: '4px solid #28a745' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#155724' }}>📊 Changed Area Statistics</p>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
                  <strong>Total changed area:</strong> {cdRasterStats.totalChangedHa.toLocaleString()} ha
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ flex: 1, padding: '6px', backgroundColor: '#e8f5e9', borderRadius: '4px', textAlign: 'center', borderLeft: '3px solid #4caf50' }}>
                    <div style={{ fontSize: '11px', color: '#388e3c', fontWeight: 'bold' }}>Low Change</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{cdRasterStats.greenHa} ha</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>{cdRasterStats.greenPx.toLocaleString()} px</div>
                  </div>
                  <div style={{ flex: 1, padding: '6px', backgroundColor: '#fff8e1', borderRadius: '4px', textAlign: 'center', borderLeft: '3px solid #ffc107' }}>
                    <div style={{ fontSize: '11px', color: '#f57f17', fontWeight: 'bold' }}>Moderate</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{cdRasterStats.yellowHa} ha</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>{cdRasterStats.yellowPx.toLocaleString()} px</div>
                  </div>
                  <div style={{ flex: 1, padding: '6px', backgroundColor: '#ffebee', borderRadius: '4px', textAlign: 'center', borderLeft: '3px solid #f44336' }}>
                    <div style={{ fontSize: '11px', color: '#c62828', fontWeight: 'bold' }}>High Change</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{cdRasterStats.redHa} ha</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>{cdRasterStats.redPx.toLocaleString()} px</div>
                  </div>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '10px', color: '#888' }}>* Approximate. Re-apply after panning/zooming to refresh.</p>
              </div>
            )}

            {changeDetectionActive && cdLegend && (
              <div style={{
                marginTop: '15px',
                padding: '10px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold' }}>🎨 Result Legend</p>

                {/* Classified result: show only classes visible in the changed areas */}
                {cdLegend.type === 'classified' && cdLegend.items && (
                  <>
                    <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#555' }}>
                      Land cover classes visible in changed areas:
                    </p>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {cdLegend.items.length === 0 ? (
                        <span style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>No matched classes found</span>
                      ) : (
                        cdLegend.items.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                            {item.color ? (
                              <div style={{
                                width: '22px', height: '22px', marginRight: '8px', flexShrink: 0,
                                backgroundColor: `rgb(${item.color[0]},${item.color[1]},${item.color[2]})`,
                                border: '1px solid rgba(0,0,0,0.2)', borderRadius: '3px',
                              }} />
                            ) : (
                              <img
                                src={`data:image/png;base64,${item.imageData}`}
                                alt={item.label}
                                style={{ width: '22px', height: '22px', marginRight: '8px', border: '1px solid #ccc', flexShrink: 0 }}
                              />
                            )}
                            <span style={{ fontSize: '12px' }}>{item.label || '—'}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}

                {/* Blend mode result: explain what the output colors mean */}
                {cdLegend.type === 'blend' && (
                  <>
                    <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#555' }}>
                      Blend mode: <strong>{cdLegend.title}</strong>
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#333', lineHeight: '1.5' }}>
                      {cdLegend.blendDesc}
                    </p>
                  </>
                )}
              </div>
            )}

            <div style={{
              marginTop: '15px',
              padding: '12px',
              backgroundColor: '#f0f8ff',
              borderRadius: '4px',
              borderLeft: '4px solid #0079c1'
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold' }}>
                📌 How it works:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', lineHeight: '1.6' }}>
                <li>Select a "Before" layer (earlier time)</li>
                <li>Select an "After" layer (later time)</li>
                <li><strong>TileLayers:</strong> Uses CSS blend modes for visual comparison
                  <ul style={{ marginTop: '5px' }}>
                    <li><strong>Difference:</strong> Dark = similar, Bright = changed</li>
                    <li><strong>Multiply:</strong> Highlights areas removed/darkened</li>
                    <li><strong>Screen:</strong> Highlights areas added/brightened</li>
                    <li><strong>Overlay:</strong> High contrast, emphasizes all changes</li>
                    <li><strong>Exclusion:</strong> Softer version of difference</li>
                    <li>💡 Enable "Enhance visibility" to brighten output</li>
                  </ul>
                </li>
                <li><strong>ImageryLayers (ImageServer):</strong> Choose a method:
                  <ul style={{ marginTop: '5px' }}>
                    <li><strong>Difference:</strong> Shows pixel value differences</li>
                    <li><strong>Ratio:</strong> Shows proportional changes</li>
                    <li><strong>Colormap:</strong> Color-coded changes</li>
                    <li><strong>Composite:</strong> Visual overlay comparison</li>
                  </ul>
                </li>
                <li>Works best when both layers cover the same area</li>
              </ul>
            </div>

            {availableLayers.length === 0 && (
              <div style={{
                marginTop: '15px',
                padding: '12px',
                backgroundColor: '#fff3cd',
                borderRadius: '4px',
                borderLeft: '4px solid #ffc107'
              }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#856404' }}>
                  ⚠️ No suitable imagery layers found. Please add ImageryLayer or ImageryTileLayer to the map first.
                </p>
              </div>
            )}
            </>)}

            {/* ── Feature Layer Change Detection UI ── */}
            {cdMode === 'feature' && (<>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                Before Feature Layer (Time 1):
              </label>
              <select
                value={beforeFeatureLayer}
                onChange={(e) => { setBeforeFeatureLayer(e.target.value); loadFeatureLayerFields(e.target.value); }}
                style={{ width: '100%', padding: '8px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }}
                disabled={featureChangeActive}
              >
                <option value="">Select a polygon feature layer...</option>
                {featureAvailableLayers.map(layer => (
                  <option key={layer.id} value={layer.id}>{layer.title}</option>
                ))}
              </select>

              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                After Feature Layer (Time 2):
              </label>
              <select
                value={afterFeatureLayer}
                onChange={(e) => setAfterFeatureLayer(e.target.value)}
                style={{ width: '100%', padding: '8px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }}
                disabled={featureChangeActive}
              >
                <option value="">Select a polygon feature layer...</option>
                {featureAvailableLayers.map(layer => (
                  <option key={layer.id} value={layer.id}>{layer.title}</option>
                ))}
              </select>

              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                Feature Fetch Limit (0 = all features):
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={featureQueryLimit}
                  onChange={(e) => setFeatureQueryLimit(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }}
                  disabled={featureChangeActive}
                />
                <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
                  {featureQueryLimit === 0 ? 'Fetch all (slower)' : `~${featureQueryLimit.toLocaleString()} rows`}
                </span>
              </div>

              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                Compare Field (e.g. gridcode):
              </label>
              {featureLayerFields.length > 0 ? (
                <select
                  value={compareField}
                  onChange={(e) => setCompareField(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }}
                  disabled={featureChangeActive}
                >
                  {featureLayerFields.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={compareField}
                  onChange={(e) => setCompareField(e.target.value)}
                  placeholder="e.g. gridcode"
                  style={{ width: '100%', padding: '8px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                  disabled={featureChangeActive}
                />
              )}

              {!featureChangeActive ? (
                <button
                  onClick={runFeatureLayerChangeDetection}
                  disabled={!beforeFeatureLayer || !afterFeatureLayer || featureChangeLoading}
                  style={{
                    width: '100%', padding: '10px',
                    backgroundColor: beforeFeatureLayer && afterFeatureLayer ? '#28a745' : '#ccc',
                    color: 'white', border: 'none', borderRadius: '4px',
                    cursor: beforeFeatureLayer && afterFeatureLayer ? 'pointer' : 'not-allowed',
                    fontSize: '14px', fontWeight: 'bold',
                  }}
                >
                  {featureChangeLoading ? (featureChangeProgress || '⏳ Fetching features...') : '🔍 Detect Changes'}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={exportResultToGeoJSON}
                    style={{
                      flex: 1, padding: '10px', backgroundColor: '#0079c1',
                      color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                      fontSize: '14px', fontWeight: 'bold',
                    }}
                  >
                    ⬇️ Export GeoJSON
                  </button>
                  <button
                    onClick={removeFeatureChangeDetection}
                    style={{
                      flex: 1, padding: '10px', backgroundColor: '#d32f2f',
                      color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                      fontSize: '14px', fontWeight: 'bold',
                    }}
                  >
                    ❌ Remove Result Layer
                  </button>
                </div>
              )}

              {/* Results summary */}
              {featureChangeStats && (
                <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#f0fff4', borderRadius: '4px', borderLeft: '4px solid #28a745' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#155724' }}>
                    ✅ Change Detection Results
                  </p>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>
                    <strong>Changed polygons:</strong> {featureChangeStats.featureCount.toLocaleString()}
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
                    <strong>Total changed area:</strong> {featureChangeStats.totalArea.toLocaleString()} m²
                    &nbsp;({(featureChangeStats.totalArea / 10000).toFixed(2)} ha)
                  </p>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 'bold' }}>By change type:</p>
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {Object.entries(featureChangeStats.changesByType).map(([type, area]) => (
                      <div key={type} style={{ fontSize: '11px', padding: '3px 0', borderBottom: '1px solid #d4edda' }}>
                        <strong>{type}:</strong>&nbsp;
                        {area.toLocaleString()} m² ({(area / 10000).toFixed(4)} ha)
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#f0f8ff', borderRadius: '4px', borderLeft: '4px solid #0079c1' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold' }}>📌 How it works:</p>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', lineHeight: '1.6' }}>
                  <li>Select two polygon FeatureLayers (e.g. from Raster-to-Polygon result)</li>
                  <li>Choose the field that holds the class value (e.g. <code>gridcode</code>)</li>
                  <li>Unchanged areas (same class) are <strong>removed</strong></li>
                  <li>Changed areas are intersected and shown in a new result layer</li>
                  <li>Area (m² and ha) is calculated for each change type</li>
                  <li>Click a polygon on the map to see change details in the popup</li>
                </ul>
              </div>

              {featureAvailableLayers.length === 0 && (
                <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px', borderLeft: '4px solid #ffc107' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#856404' }}>
                    ⚠️ No FeatureLayers found on the map. Add your Raster-to-Polygon result layers first.
                  </p>
                </div>
              )}
            </>)}
          </div>
        </div>
      )}

      {/* Swipe Widget Button */}
      <button
        onClick={() => setShowSwipePanel(!showSwipePanel)}
        style={{
          position: 'absolute',
          bottom: '40px',
          right: '210px',
          padding: '10px 15px',
          backgroundColor: '#6a1b9a',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          zIndex: 1000,
        }}
      >
        {showSwipePanel ? 'Hide' : 'Show'} Swipe
      </button>

      {/* Swipe Widget Panel */}
      {showSwipePanel && (
        <div style={{
          position: 'absolute',
          bottom: '90px',
          right: '210px',
          width: '300px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          zIndex: 1000,
          padding: '15px',
        }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#6a1b9a' }}>&#8644; Swipe Comparison</h3>
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#666' }}>
            Drag the divider on the map to compare two layers side by side.
          </p>

          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
            Leading layer (left):
          </label>
          <select
            value={swipeBeforeLayer}
            onChange={(e) => setSwipeBeforeLayer(e.target.value)}
            disabled={swipeActive}
            style={{ width: '100%', padding: '7px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }}
          >
            <option value="">Select layer...</option>
            {availableLayers.map(l => (
              <option key={l.id} value={l.id}>{l.title} ({l.type})</option>
            ))}
          </select>

          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
            Trailing layer (right):
          </label>
          <select
            value={swipeAfterLayer}
            onChange={(e) => setSwipeAfterLayer(e.target.value)}
            disabled={swipeActive}
            style={{ width: '100%', padding: '7px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }}
          >
            <option value="">Select layer...</option>
            {availableLayers.map(l => (
              <option key={l.id} value={l.id}>{l.title} ({l.type})</option>
            ))}
          </select>

          {!swipeActive ? (
            <button
              onClick={createSwipeWidget}
              disabled={!swipeBeforeLayer || !swipeAfterLayer}
              style={{
                width: '100%', padding: '9px',
                backgroundColor: swipeBeforeLayer && swipeAfterLayer ? '#6a1b9a' : '#ccc',
                color: 'white', border: 'none', borderRadius: '4px', cursor: swipeBeforeLayer && swipeAfterLayer ? 'pointer' : 'not-allowed',
                fontSize: '14px', fontWeight: 'bold',
              }}
            >
              &#8644; Start Swipe
            </button>
          ) : (
            <button
              onClick={removeSwipeWidget}
              style={{
                width: '100%', padding: '9px', backgroundColor: '#d32f2f',
                color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                fontSize: '14px', fontWeight: 'bold',
              }}
            >
              &#10006; Remove Swipe
            </button>
          )}

          <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: '#888', lineHeight: '1.5' }}>
            &#9432; Both selected layers will be made visible. Drag the handle to compare.
          </p>
        </div>
      )}
    </div>
  )
}

function generateRandomColor(): [number, number, number, number] {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return [r, g, b, 0.8];
}

function normalizeFieldType(type: string): string {
  const map: Record<string, string> = {
    esriFieldTypeOID: "oid",
    esriFieldTypeInteger: "integer",
    esriFieldTypeSmallInteger: "small-integer",
    esriFieldTypeDouble: "double",
    esriFieldTypeSingle: "single",
    esriFieldTypeString: "string",
    esriFieldTypeDate: "date",
    esriFieldTypeGUID: "guid",
    esriFieldTypeGlobalID: "global-id",
    esriFieldTypeBlob: "blob",
    esriFieldTypeRaster: "raster",
    esriFieldTypeXML: "xml",
    esriFieldTypeBigInteger: "big-integer",
    esriFieldTypeTimestampOffset: "timestamp-offset",
    esriFieldTypeDateOnly: "date-only",
    esriFieldTypeTimeOnly: "time-only",
  };
  return map[type] || type;
}

function normalizeGeometryType(type: string): string {
  const map: Record<string, string> = {
    esriGeometryPoint: "point",
    esriGeometryPolyline: "polyline",
    esriGeometryPolygon: "polygon",
    esriGeometryMultipoint: "multipoint",
    esriGeometryMultipatch: "multipatch",
    esriGeometryMesh: "mesh",
  };
  return map[type] || type;
}

function getGeometryTypeFromLayer(layerGeometryType: string): string {
  return normalizeGeometryType(layerGeometryType);
}

function switchTab(activeTab: HTMLButtonElement, tool: string | null) {
  distanceTab.classList.remove("active");
  areaTab.classList.remove("active");
  clearTab.classList.remove("active");

  activeTab.classList.add("active");

  if (tool) {
    measurementWidget.activeTool = tool as any;
  } else {
    measurementWidget.clear(); // 
    measurementWidget.activeTool = null;
  }
}

export default TrainingPage
