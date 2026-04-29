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
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils";
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

  // ── Feature-layer (polygon) change detection state ──
  const [cdMode, setCdMode] = useState<'raster' | 'feature'>('raster');
  const [featureAvailableLayers, setFeatureAvailableLayers] = useState<LayerInfo[]>([]);
  const [beforeFeatureLayer, setBeforeFeatureLayer] = useState<string>('');
  const [afterFeatureLayer, setAfterFeatureLayer] = useState<string>('');
  const [compareField, setCompareField] = useState<string>('gridcode');
  const [featureLayerFields, setFeatureLayerFields] = useState<string[]>([]);
  const [featureChangeActive, setFeatureChangeActive] = useState<boolean>(false);
  const [featureChangeLoading, setFeatureChangeLoading] = useState<boolean>(false);
  const [featureChangeStats, setFeatureChangeStats] = useState<{
    totalArea: number;
    changesByType: Record<string, number>;
    featureCount: number;
  } | null>(null);
  const featureChangeResultRef = useRef<FeatureLayer | null>(null);

  useEffect(() => {
    if (!mapDiv.current) return;
    const map = new Map({
      basemap: "hybrid",
    });
    const view = new MapView({
      container: mapDiv.current as any,
      map,
      center: [101.696504, 3.002282],
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
      popupTemplate: popuptemplatetest,
      visible: false,
    });
    const lulc23PolygonLayer = new FeatureLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/Hosted/Lulc23_Polygon/FeatureServer",
      outFields: ["*"],
      popupEnabled: true,
      popupTemplate: popuptemplatetest,
      visible: false,
    });

    const lulc2021ImageryLayer = new ImageryLayer({
      url: "https://mygeoserve5.jupem.gov.my/imageserver/rest/services/Lulc2021/ImageServer",
      title: "LULC 2021 Imagery",
      visible: true,
    });

    const lulc2023ImageryLayer = new ImageryLayer({
      url: "https://mygeoserve5.jupem.gov.my/imageserver/rest/services/Lulc2023/ImageServer",
      title: "LULC 2023 Imagery",
      visible: true,
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

          zoomButton.addEventListener("click", function () {
            if (item.layer && 'fullExtent' in item.layer) {
              view.goTo((item.layer as any).fullExtent).catch((error: any) => {
                console.error("Error zooming to layer:", error);
              });
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

    view.ui.add(combinedExpand, "top-right");

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
            targetSR: SpatialReference.WebMercator,
            maxRecordCount: 1000,
            enforceInputFileSizeLimit: true,
            enforceOutputJsonSizeLimit: true,
          };
          try {
            const response = await esriRequest("https://www.arcgis.com/sharing/rest/content/features/generate", {
              method: "post",
              query: { filetype: "shapefile", publishParameters: JSON.stringify(publishParameters), f: "json" },
              body: formData,
              responseType: "json",
            });
            const layerData = response.data.featureCollection?.layers?.[0];
            if (!layerData) throw new Error("No layer found in uploaded shapefile.");

            const objectIdField = "OBJECTID";
            const hasOID = layerData.layerDefinition.fields.some((f: any) => f.type === "oid" || f.name === objectIdField);
            if (!hasOID) {
              layerData.layerDefinition.fields.push({ name: objectIdField, alias: objectIdField, type: "oid" });
              layerData.featureSet.features.forEach((f: any, i: number) => { f.attributes[objectIdField] = i + 1; });
              layerData.layerDefinition.objectIdField = objectIdField;
            }
            layerData.layerDefinition.fields = layerData.layerDefinition.fields.map((f: any) => ({ ...f, type: normalizeFieldType(f.type) }));
            layerData.layerDefinition.geometryType = normalizeGeometryType(layerData.layerDefinition.geometryType);

            const targetSR = new SpatialReference({ wkid: 102100 });
            layerData.featureSet.features = layerData.featureSet.features.map((f: any) => {
              const projected = webMercatorUtils.geographicToWebMercator(f.geometry) as any;
              return { ...f, geometry: { ...projected, type: getGeometryTypeFromLayer(layerData.layerDefinition.geometryType) } };
            });
            // targetSR is used for the layer's spatial reference
            void targetSR;

            const randomColor = generateRandomColor();
            const geometryType = layerData.layerDefinition.geometryType;
            let renderer: any;
            if (geometryType === "point") {
              renderer = { type: "simple", symbol: { type: "simple-marker", color: randomColor, size: 8, outline: { color: [255, 255, 255, 0.8], width: 1 } } };
            } else if (geometryType === "polyline") {
              renderer = { type: "simple", symbol: { type: "simple-line", color: randomColor, width: 2 } };
            } else if (geometryType === "polygon") {
              renderer = { type: "simple", symbol: { type: "simple-fill", color: randomColor, outline: { color: [255, 255, 255, 0.8], width: 1 } } };
            }

            const shapefileLayer = new FeatureLayer({
              source: layerData.featureSet.features,
              fields: layerData.layerDefinition.fields,
              objectIdField: layerData.layerDefinition.objectIdField,
              geometryType: layerData.layerDefinition.geometryType,
              spatialReference: SpatialReference.WebMercator,
              title: file.name.replace(".zip", ""),
              renderer: renderer as any,
            });
            map.add(shapefileLayer);
            tempUserLayers.push(shapefileLayer);
            updateAddLayerListUI();
            alert("✅ Shapefile loaded successfully.");
          } catch (err: any) {
            console.error("❌ Shapefile upload failed:", err);
            alert(`❌ Failed to upload shapefile.\n\n${err?.message || "Unknown error"}`);
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

      // ImageryLayer: use blend mode (client-side, works with all ImageServers)
      // Map detection method to the most appropriate blend mode
      if (isImageryLayer) {
        console.log('ImageryLayer detected - using client-side blend mode');

        // Map detection method → blend mode
        const methodBlendMap: Record<string, string> = {
          difference: 'difference',   // bright = changed, dark = same
          ratio:      'exclusion',     // similar to ratio, mutual exclusion
          ndvi:       'difference',    // highlight vegetation change
          composite:  'overlay',       // enhanced contrast
        };
        const resolvedBlendMode = useBlendMode ? tileBlendMode : (methodBlendMap[detectionMethod] ?? 'difference');

        // Make the before layer visible underneath
        (beforeLayerObj as any).visible = true;
        (beforeLayerObj as any).opacity = 1;

        // Add the after layer on top with the blend mode
        const { default: ImageryLayer } = await import('@arcgis/core/layers/ImageryLayer');
        const blendLayer = new ImageryLayer({
          url: afterUrl,
          title: `Change Detection (${detectionMethod})`,
          opacity: changeOpacity,
          blendMode: resolvedBlendMode as any,
          effect: hideDarkAreas ? 'brightness(150%) contrast(200%)' : undefined,
        });
        await blendLayer.load();
        changeDetectionLayerRef.current = blendLayer as any;
        map.add(blendLayer);
        setChangeDetectionActive(true);

        const modeDesc: Record<string, string> = {
          difference: 'Bright pixels = area changed, Dark = no change',
          ratio:      'Highlights areas with ratio differences',
          ndvi:       'Highlights vegetation change areas',
          composite:  'Enhanced contrast showing changes',
        };

        alert(`Change Detection created!\n\nMethod: ${detectionMethod}\nBlend Mode applied: ${resolvedBlendMode}\n\n${modeDesc[detectionMethod] ?? ''}\n\n${hideDarkAreas ? '✓ Dark areas enhanced for visibility' : ''}\n\nNote: Client-side blend mode is used because the server does not support advanced raster functions.`);
        return;
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
      setChangeDetectionActive(false);
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

      // Query all polygon features from both layers
      const [beforeResult, afterResult] = await Promise.all([
        (beforeFL as FeatureLayer).queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: true, num: 5000 }),
        (afterFL as FeatureLayer).queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: true, num: 5000 }),
      ]);

      const beforeFeatures = beforeResult.features;
      const afterFeatures = afterResult.features;

      if (!beforeFeatures.length || !afterFeatures.length) {
        alert('One or both layers returned no features. Check visibility and filters.');
        setFeatureChangeLoading(false);
        return;
      }

      const field = compareField.trim();
      const changedFeatures: __esri.Graphic[] = [];
      const changesByType: Record<string, number> = {};
      let totalAreaSqm = 0;

      // For each "after" feature, find intersecting "before" features and check if class changed
      for (const afterFeat of afterFeatures) {
        const afterGeom = afterFeat.geometry;
        if (!afterGeom || afterGeom.type !== 'polygon') continue;
        const afterVal = afterFeat.attributes?.[field];

        for (const beforeFeat of beforeFeatures) {
          const beforeGeom = beforeFeat.geometry;
          if (!beforeGeom || beforeGeom.type !== 'polygon') continue;
          const beforeVal = beforeFeat.attributes?.[field];

          // Skip if class is same (unchanged)
          if (String(afterVal) === String(beforeVal)) continue;

          // Compute intersection
          const intersection = geometryEngine.intersect(afterGeom, beforeGeom);
          if (!intersection) continue;

          // Only keep actual polygon intersections with area > 0
          const areaSqm = geometryEngine.geodesicArea(intersection as __esri.Polygon, 'square-meters');
          if (!areaSqm || areaSqm <= 0) continue;

          const changeKey = `${beforeVal} → ${afterVal}`;
          changesByType[changeKey] = (changesByType[changeKey] || 0) + areaSqm;
          totalAreaSqm += areaSqm;

          changedFeatures.push({
            geometry: intersection,
            attributes: {
              OBJECTID: changedFeatures.length + 1,
              change_from: String(beforeVal ?? 'N/A'),
              change_to: String(afterVal ?? 'N/A'),
              change_type: changeKey,
              area_sqm: Math.round(areaSqm * 100) / 100,
              area_ha: Math.round(areaSqm / 10000 * 10000) / 10000,
            }
          } as any);
        }
      }

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
                  {featureChangeLoading ? '⏳ Analysing...' : '🔍 Detect Changes'}
                </button>
              ) : (
                <button
                  onClick={removeFeatureChangeDetection}
                  style={{
                    width: '100%', padding: '10px', backgroundColor: '#d32f2f',
                    color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                    fontSize: '14px', fontWeight: 'bold',
                  }}
                >
                  ❌ Remove Result Layer
                </button>
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
