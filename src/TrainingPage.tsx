import React, { useEffect, useRef } from "react";
import "@arcgis/core/assets/esri/themes/light/main.css";
import MapView from "@arcgis/core/views/MapView";
import Map from "@arcgis/core/Map";
import "@arcgis/core/assets/esri/themes/light/main.css";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import LayerList from "@arcgis/core/widgets/LayerList";
import Legend from "@arcgis/core/widgets/Legend";
import Expand from "@arcgis/core/widgets/Expand";
import Search from "@arcgis/core/widgets/Search";
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery";
import Fullscreen from "@arcgis/core/widgets/Fullscreen";
import Home from "@arcgis/core/widgets/Home";
import Locate from "@arcgis/core/widgets/Locate";
import Measurement from "@arcgis/core/widgets/Measurement";
import "./custom_style.css";
import { jsPDF } from "jspdf";

// Global element/widget references (typed) used by switchTab helper
let distanceTab: HTMLButtonElement;
let areaTab: HTMLButtonElement;
let clearTab: HTMLButtonElement;
let measurementWidget: Measurement;

function TrainingPage() {
  const mapDiv = useRef(null);
  useEffect(() => {
    if (!mapDiv.current) return;
    const map = new Map({
      basemap: "hybrid",
    });
    const view = new MapView({
      container: mapDiv.current as any,
      map,
      center: [101.6869, 3.139], // Kuala Lumpur
      zoom: 12,
      popup: {
        dockEnabled: true,
        dockOptions: {
          buttonEnabled: true,
          breakpoint: false,
        },
      },
    });
    const featureLayer = new FeatureLayer({
      url:
        "https://dipan.map2u.com.my/server/rest/services/Hosted/MOBILE_APP_LAYER/FeatureServer/0",
      outFields: ["*"],
      popupEnabled: true,
    });
    const featureLayer2 = new FeatureLayer({
      url:
        "https://dipan.map2u.com.my/server/rest/services/Hosted/MOBILE_APP_LAYER/FeatureServer/1",
      outFields: ["*"],
      popupEnabled: true,
    });
    const featureLayer3 = new FeatureLayer({
      url:
        "https://dipan.map2u.com.my/server/rest/services/Hosted/MOBILE_APP_LAYER/FeatureServer/2",
      outFields: ["*"],
      popupEnabled: true,
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
    map.add(featureLayer);
    map.add(featureLayer2);
    map.add(featureLayer3);

    // LayerList in Expand
    const layerList = new LayerList({ view });
    const layerListExpand = new Expand({
      view,
      content: layerList,
      expanded: false,
      group: "top-right",
    });
    view.ui.add(layerListExpand, "top-right");
    // Legend in Expand
    const legend = new Legend({ view });
    const legendExpand = new Expand({
      view,
      content: legend,
      expanded: false,
      group: "top-right",
    });
    view.ui.add(legendExpand, "top-right");
    // Basemap Gallery
    const basemapGallery = new BasemapGallery({ view });
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

    const customGeocoder = {
      url:
        "https://mygeoserve6.jupem.gov.my/gisserver/rest/services/ALAMAT_XY/COMPOSITE/GeocodeServer",
      placeholder: "Carian JUPEM Locater",
      singleLineFieldName: "SingleLine",
      name: "JUPEM Geocoder",
      outFields: ["*"],
      suggestionsEnabled: true,
      minSuggestCharacters: 2,
    };
    // Search with custom geocoder
    const search = new Search({
      view,
      sources: [customGeocoder],
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

    if (view.popup) {
      view.popup.defaultPopupTemplateEnabled = true;
    }
    return () => {
      view.destroy();
    };

  }, []);
  return (
    <div ref={mapDiv} style={{ width: '100%', height: '98vh' }}></div>
  )
}

function switchTab(activeTab, tool) {
  distanceTab.classList.remove("active");
  areaTab.classList.remove("active");
  clearTab.classList.remove("active");

  activeTab.classList.add("active");

  if (tool) {
    measurementWidget.activeTool = tool;
  } else {
    measurementWidget.clear(); //
    measurementWidget.activeTool = null;
  }
}

export default TrainingPage
