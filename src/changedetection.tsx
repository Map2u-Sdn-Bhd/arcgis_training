
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
import RasterShadedReliefRenderer from "@arcgis/core/renderers/RasterShadedReliefRenderer";
import * as colorRamps from "@arcgis/core/smartMapping/raster/support/colorRamps";
import Basemap from "@arcgis/core/Basemap";
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

function TrainingPage() {
  const mapDiv = useRef(null);
  const viewRef = useRef<MapView | null>(null);
  const [availableLayers, setAvailableLayers] = useState<LayerInfo[]>([]);
  const [beforeLayer, setBeforeLayer] = useState<string>('');
  const [afterLayer, setAfterLayer] = useState<string>('');
  const [changeDetectionActive, setChangeDetectionActive] = useState<boolean>(false);
  const changeDetectionLayerRef = useRef<ImageryLayer | null>(null);
  const [showChangePanel, setShowChangePanel] = useState<boolean>(false);
  const [detectionMethod, setDetectionMethod] = useState<ChangeDetectionMethod>('difference');
  const [useBlendMode, setUseBlendMode] = useState<boolean>(false);

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
        dockEnabled: true,
        dockOptions: {
          buttonEnabled: true,
          breakpoint: false,
        },
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
    });
    const changeDetectionLayer2 = new TileLayer({
      url: "https://dipan.map2u.com.my/server/rest/services/Hosted/LULC21/MapServer",
      title: "LULC 2021",
    });

    map.add(featureLayer);
    map.add(featureLayer2);
    map.add(featureLayer3);
    map.add(changeDetectionLayer);
    map.add(changeDetectionLayer2);


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

    const observer = new MutationObserver((mutations) => {
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

    const layerList = new LayerList({
      view: view,
      container: layerListContent,
      listItemCreatedFunction: function (event) {
        const item = event.item;

        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.alignItems = "center";

        // 🔍 Zoom Button (only for non-group layers)
        if (item.layer.type !== "group") {
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
            view.goTo(item.layer.fullExtent).catch((error) => {
              console.error("Error zooming to layer:", error);
            });
          });

          buttonContainer.appendChild(zoomButton);
        }

        if (item.layer.type === "group") {
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
        transparencySlider.value = item.layer.opacity;
        transparencySlider.style.width = "100%";

        transparencySlider.addEventListener("input", function () {
          item.layer.opacity = parseFloat(transparencySlider.value);
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
        if (item.layer.type !== "group") {
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
                const layerView = await view.whenLayerView(item.layer);

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
                  await Swal.fire({
                    icon: 'warning',
                    title: 'Highlight Not Supported',
                    text: 'This layer type does not support feature highlighting.',
                    confirmButtonColor: '#0E7C79',
                  });
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

    const legend = new Legend({
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

    dsmLayers.forEach(({ url, year, title }) => {
      // Create ImageryTileLayer for display with color
      const layer = new ImageryLayer({
        url,
        title: title, // Use the title from the array directly
        visible: false,
        // renderer: testrenderer,
        customParameters: {
          token:
            'kfk2QmHIs6joGJARvDkIb4OK2ICk0rN49s5ZBTrfeCVS0Lvqbg9oHlJpw-6v1nuGU5sCXeX-tQv9GSORC_kawb-qR4bNk9dNsdHIc0Vd-YBzdvkBpbWyeQ4pfSAW04RUO-JqSTFeG_Ybkp50Na9Q4VnFRPIVBo2VzYdq8Z0OsWX3JEMCN7HEXZu3g9pZgJ0Q',
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
      map.allLayers.forEach((layer: __esri.Layer) => {
        if (layer.type === 'imagery' || layer.type === 'imagery-tile' || layer.type === 'tile' || layer.type === 'map-image') {
          layers.push({
            id: layer.id,
            title: layer.title || 'Untitled Layer',
            url: (layer as any).url,
            type: layer.type
          });
        }
      });
      setAvailableLayers(layers);
      console.log('Available layers for change detection:', layers);
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
    if (changeDetectionLayerRef.current) {
      map.remove(changeDetectionLayerRef.current);
      changeDetectionLayerRef.current = null;
    }

    try {
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
      console.log('Is Image Service:', isImageService);

      if (!isImageService) {
        alert('Change detection requires ImageServer layers (ImageryLayer or ImageryTileLayer). Please select DSM layers.');
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
            token: 'kfk2QmHIs6joGJARvDkIb4OK2ICk0rN49s5ZBTrfeCVS0Lvqbg9oHlJpw-6v1nuGU5sCXeX-tQv9GSORC_kawb-qR4bNk9dNsdHIc0Vd-YBzdvkBpbWyeQ4pfSAW04RUO-JqSTFeG_Ybkp50Na9Q4VnFRPIVBo2VzYdq8Z0OsWX3JEMCN7HEXZu3g9pZgJ0Q',
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
        renderingRule: renderingRuleJson as any,
        customParameters: {
          token: 'kfk2QmHIs6joGJARvDkIb4OK2ICk0rN49s5ZBTrfeCVS0Lvqbg9oHlJpw-6v1nuGU5sCXeX-tQv9GSORC_kawb-qR4bNk9dNsdHIc0Vd-YBzdvkBpbWyeQ4pfSAW04RUO-JqSTFeG_Ybkp50Na9Q4VnFRPIVBo2VzYdq8Z0OsWX3JEMCN7HEXZu3g9pZgJ0Q',
          renderingRule: JSON.stringify(renderingRuleJson)
        }
      });

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
        alert('Error loading change detection layer. The server might not support this raster function.');
        return;
      }
    } catch (error) {
      console.error('Error creating change detection layer:', error);
      alert('Error creating change detection layer. Please ensure both layers are imagery layers with valid URLs.');
    }
  }; const removeChangeDetectionLayer = () => {
    if (viewRef.current && changeDetectionLayerRef.current) {
      viewRef.current.map.remove(changeDetectionLayerRef.current);
      changeDetectionLayerRef.current = null;
      setChangeDetectionActive(false);
      setBeforeLayer('');
      setAfterLayer('');
    }
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
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
              Detect changes between two imagery layers using raster functions
            </p>
          </div>

          <div style={{ padding: '15px' }}>
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
                  Use Blend Mode (simpler, may work better)
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
                <li>Select a "Before" imagery layer (earlier time)</li>
                <li>Select an "After" imagery layer (later time)</li>
                <li>Choose a detection method:
                  <ul style={{ marginTop: '5px' }}>
                    <li><strong>Difference:</strong> Shows pixel value differences</li>
                    <li><strong>Ratio:</strong> Shows proportional changes</li>
                    <li><strong>Colormap:</strong> Color-coded changes (blue=decrease, red=increase)</li>
                    <li><strong>Composite:</strong> Visual overlay comparison</li>
                  </ul>
                </li>
                <li>Changes will be highlighted on the map</li>
                <li>Works best with DSM or imagery layers from the same area</li>
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
          </div>
        </div>
      )}
    </div>
  )
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
