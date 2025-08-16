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

    // -------------------------------START PRINT WIDGET -------------------------------------------------
    const PrintDiv = document.getElementsByClassName("print-widget")[0] as HTMLDivElement;

    const expandPrintButton = new Expand({
      view: view,
      content: PrintDiv,
      expandTooltip: "Generate Print",
      expandIcon: "print",
    });
    view.ui.add(expandPrintButton, "top-right");

    const northArrowSelectDiv = PrintDiv.querySelector("#northArrowSelect");
    let selectedNorthArrowIcon = "1";
    if (northArrowSelectDiv) {
      northArrowSelectDiv.addEventListener("click", (e) => {
        const target = (e.target as HTMLElement).closest(".north-arrow-option");
        if (target) {
          // Remove .selected from all
          northArrowSelectDiv.querySelectorAll(".north-arrow-option").forEach(el => el.classList.remove("selected"));
          target.classList.add("selected");
          selectedNorthArrowIcon = target.getAttribute("data-icon") || "1";
        }
      });
    }

    PrintDiv.querySelector("#PrintExport")?.addEventListener("click", async () => {
      const fileName = (document.getElementById("PrintFileName") as HTMLInputElement).value || "Print On Demand";
      const layout = (document.getElementById("PrintLayout") as HTMLSelectElement).value;
      const orientation = (document.getElementById("PrintOrientation") as HTMLSelectElement).value;
      const northArrow = (document.getElementById("PrintNorthArrow") as HTMLSelectElement).value;

      let width: number, height: number;
      if (layout === "a4") {
        if (orientation === "landscape") {
          width = 842;
          height = 595;
        } else {
          width = 595;
          height = 842;
        }
      } else if (layout === "a3") {
        if (orientation === "landscape") {
          width = 1191;
          height = 842;
        } else {
          width = 842;
          height = 1191;
        }
      } else {
        // Default to A4 landscape if layout is unknown
        width = 842;
        height = 595;
      }

      const pdf = new jsPDF({
        orientation: width > height ? "l" : "p",
        unit: "pt",
        format: [width, height],
      });

      const dpr = 4;
      let screenshot = await view.takeScreenshot({
        width: Math.round(width * dpr),
        height: Math.round(height * dpr),
        format: "png"
      });

      if (orientation === "portrait") {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, width, 50, "F"); // Kotak atas
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(0, 0, width, 50); // Border kotak atas

        pdf.rect(10, 60, width - 20, height - 70); // Border kotak bawah

        // draw filename dekat border atas
        pdf.setFontSize(18);
        pdf.setTextColor(0, 0, 0);
        pdf.text(fileName, width / 2, 30, { align: "center" });

        // Add screenshot to bottom container
        pdf.addImage(screenshot.dataUrl, "PNG", 10, 60, width - 20, height - 70);

        let arrowWidth = 38;
        let arrowHeight = 38;
        let arrowMarginTop = 20;
        let arrowMarginRight = 30;

        if (northArrow === "on") {
          const northArrowImg = `/icon/${selectedNorthArrowIcon}.png`;
          const arrowX = width - arrowWidth - arrowMarginRight;
          const arrowY = arrowMarginTop + 60;
          pdf.addImage(northArrowImg, "PNG", arrowX, arrowY, arrowWidth, arrowHeight);

          if (view.scale) {
            const scaleValue = Math.round(view.scale);
            const scaleStr = `Skala 1:${scaleValue.toLocaleString("en-US")}`;
            const skalaFontSize = 8;
            pdf.setFontSize(skalaFontSize);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(0, 0, 0);

            const skalaX = arrowX + arrowWidth / 2;
            const skalaY = arrowY + arrowHeight + 12;

            const textWidth = pdf.getTextWidth(scaleStr) + 6;
            const textHeight = skalaFontSize + 4;
            const rectX = skalaX - textWidth / 2;
            const rectY = skalaY - skalaFontSize;
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(255, 255, 255);
            pdf.rect(rectX, rectY, textWidth, textHeight, "F");

            pdf.setTextColor(0, 0, 0);
            pdf.text(scaleStr, skalaX, skalaY, { align: "center" });
          }
        }

      } else if (orientation === "landscape") {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, 200, height, "F");
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(0, 0, 200, height);

        pdf.rect(210, 10, width - 220, height - 20);

        pdf.setFontSize(18);
        pdf.setTextColor(0, 0, 0);
        pdf.text(fileName, 100, height / 2, { align: "center" });

        pdf.addImage(screenshot.dataUrl, "PNG", 210, 10, width - 220, height - 20);

        if (northArrow === "on") {

          let arrowWidth = 38;
          let arrowHeight = 38;
          let arrowMarginTop = 30;
          let arrowMarginRight = 30;

          const northArrowImg = `/icon/${selectedNorthArrowIcon}.png`;
          const arrowX = width - arrowWidth - arrowMarginRight;
          const arrowY = arrowMarginTop;
          pdf.addImage(northArrowImg, "PNG", arrowX, arrowY, arrowWidth, arrowHeight);

          if (view.scale) {
            const scaleValue = Math.round(view.scale);
            const scaleStr = `Skala 1:${scaleValue.toLocaleString("en-US")}`;
            const skalaFontSize = 8;
            pdf.setFontSize(skalaFontSize);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(0, 0, 0);

            const skalaX = arrowX + arrowWidth / 2;
            const skalaY = arrowY + arrowHeight + 12;

            const textWidth = pdf.getTextWidth(scaleStr) + 6;
            const textHeight = skalaFontSize + 4;
            const rectX = skalaX - textWidth / 2;
            const rectY = skalaY - skalaFontSize;
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(255, 255, 255);
            pdf.rect(rectX, rectY, textWidth, textHeight, "F");

            pdf.setTextColor(0, 0, 0);
            pdf.text(scaleStr, skalaX, skalaY, { align: "center" });
          }
        }

      }
      const pdfBlob = pdf.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
    });
    // -------------------------------END PRINT WIDGET ---------------------------------------------------

    if (view.popup) {
      view.popup.defaultPopupTemplateEnabled = true;
    }
    return () => {
      view.destroy();
    };

  }, []);
  return (
    <>
      <div ref={mapDiv} style={{ width: '100%', height: '98vh' }}></div>
      <div className="print-widget">
        <div className="print-widget-scrollable">
          <div className="section">
            <label htmlFor="PrintFileName">File Name</label>
            <input type="text" id="PrintFileName" placeholder="File name" />
          </div>
          <div className="section">
            <label htmlFor="PrintLayout">Layout</label>
            <select id="PrintLayout" >
              <option value="a4">A4</option>
              <option value="a3">A3</option>
            </select>
          </div>
          <div className="section">
            <label htmlFor="PrintOrientation">Orientation</label>
            <select id="PrintOrientation">
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
          <div className="section">
            <label htmlFor="PrintNorthArrow">North Arrow</label>
            <select id="PrintNorthArrow">
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
            <div className="north-arrow-select" id="northArrowSelect" >
              <div className="north-arrow-option selected" data-icon="1" >
                <img src="./icon/1.png" className="north-arrow-preview" alt="North Arrow 1" />
              </div>
              <div className="north-arrow-option" data-icon="2" >
                <img src="./icon/2.png" className="north-arrow-preview" alt="North Arrow 2" />
              </div>
              <div className="north-arrow-option" data-icon="3" >
                <img src="./icon/3.png" className="north-arrow-preview" alt="North Arrow 3" />
              </div>
            </div>
          </div>
          <button className="PrintExport" id="PrintExport" style={{}}>
            Download
          </button>
        </div>
      </div>
    </>
  )
}

interface SwitchTabParams {
  activeTab: HTMLButtonElement;
  tool: "distance" | "area" | null;
}

function switchTab(activeTab: SwitchTabParams["activeTab"], tool: SwitchTabParams["tool"]) {
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
