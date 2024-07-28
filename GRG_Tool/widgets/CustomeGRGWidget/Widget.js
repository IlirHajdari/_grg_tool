define([
  "dojo/_base/declare",
  "jimu/BaseWidget",
  "esri/Map",
  "esri/views/MapView",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
  "esri/geometry/Polygon",
  "esri/geometry/geometryEngine",
  "esri/request",
  "esri/identity/OAuthInfo",
  "esri/identity/IdentityManager",
], function (
  declare,
  BaseWidget,
  Map,
  MapView,
  Graphic,
  GraphicsLayer,
  Polygon,
  geometryEngine,
  esriRequest,
  OAuthInfo,
  esriId
) {
  return declare([BaseWidget], {
    baseClass: "custom-grg-widget",

    postCreate: function () {
      this.inherited(arguments);
      console.log("CustomGRGWidget::postCreate");

      var map = new Map({
        basemap: "streets-navigation-vector",
      });

      var view = new MapView({
        container: this.mapId, // Map container ID
        map: map,
        center: [13.405, 52.52], // Berlin
        zoom: 12,
      });

      var graphicsLayer = new GraphicsLayer();
      map.add(graphicsLayer);

      window.generateGRG = function () {
        graphicsLayer.removeAll();

        var longitude = parseFloat(document.getElementById("longitude").value);
        var latitude = parseFloat(document.getElementById("latitude").value);
        var width = parseFloat(document.getElementById("width").value);
        var height = parseFloat(document.getElementById("height").value);
        var gridSize = parseFloat(document.getElementById("gridSize").value);

        var xmin = longitude;
        var ymin = latitude;
        var xmax = longitude + width;
        var ymax = latitude + height;

        var xcoords = [];
        for (var x = xmin; x <= xmax; x += gridSize) {
          xcoords.push(x);
        }

        var ycoords = [];
        for (var y = ymin; y <= ymax; y += gridSize) {
          ycoords.push(y);
        }

        for (var i = 0; i < xcoords.length - 1; i++) {
          for (var j = 0; j < ycoords.length - 1; j++) {
            var polygon = new Polygon({
              rings: [
                [xcoords[i], ycoords[j]],
                [xcoords[i + 1], ycoords[j]],
                [xcoords[i + 1], ycoords[j + 1]],
                [xcoords[i], ycoords[j + 1]],
                [xcoords[i], ycoords[j]],
              ],
              spatialReference: { wkid: 4326 },
            });

            var polygonGraphic = new Graphic({
              geometry: polygon,
              symbol: {
                type: "simple-fill",
                color: [0, 0, 255, 0.1],
                outline: {
                  color: [0, 0, 255],
                  width: 1,
                },
              },
            });

            graphicsLayer.add(polygonGraphic);
          }
        }
      };

      window.exportToArcGIS = function () {
        var graphics = graphicsLayer.graphics.toArray();
        var features = graphics.map(function (graphic) {
          return graphic.toJSON();
        });

        var geojson = {
          type: "FeatureCollection",
          features: features.map(function (feature) {
            return {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: feature.geometry.rings,
              },
              properties: {},
            };
          }),
        };

        esriId
          .getCredential(info.portalUrl + "/sharing")
          .then(function (credential) {
            var formData = new FormData();
            formData.append("f", "json");
            formData.append(
              "file",
              new Blob([JSON.stringify(geojson)], { type: "application/json" })
            );
            formData.append("title", "Gridded Reference Graphic");
            formData.append("tags", "GRG, geospatial, grid");
            formData.append("type", "GeoJson");
            formData.append(
              "description",
              "GeoJSON file containing the Gridded Reference Graphic."
            );
            formData.append("token", credential.token);

            return esriRequest(
              info.portalUrl +
                "/sharing/rest/content/users/" +
                credential.userId +
                "/addItem",
              {
                method: "post",
                body: formData,
              }
            );
          })
          .then(function (response) {
            alert("Item added to ArcGIS Online with ID: " + response.data.id);
          })
          .catch(function (error) {
            console.error("Error adding item to ArcGIS Online: ", error);
          });
      };
    },
  });
});
