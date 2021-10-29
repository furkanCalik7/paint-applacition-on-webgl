// Silgide düzeltilmesi gereken buglar bulunmakta

var canvas;
var gl;

// Buffers
var vBuffer;
var cBuffer;

var colors = [
  vec4(1.0, 1.0, 1.0, 1.0), // white
  vec4(1.0, 0.0, 0.0, 1.0), // red
  vec4(1.0, 1.0, 0.0, 1.0), // yellow
  vec4(0.0, 1.0, 0.0, 1.0), // green
  vec4(0.0, 0.0, 1.0, 1.0), // blue
  vec4(1.0, 0.0, 1.0, 1.0), // magenta
  vec4(0.0, 1.0, 1.0, 1.0), // cyan
  vec4(0.711, 0.0672, 0.84, 1.0), // purple
];
var currentMode = 0;

const LINE_MODE = 0;
const RECTANGLE_MODE_FILLED = 1;
const ELLIPSE_MODE_FILLED = 2;
const TRIANGLE_MODE_FILLED = 3;
const COPY_PASTE_MODE = 4;
const ERASER_MODE = 5;

const RECTANGLE_SIZE = 18;
const ELLIPSE_SIZE = 18;
const TRIANGLE_SIZE = 18;

// Copy and paste variables
var copyVertexes = [];
var copyVertexes2 = [];
var copyColors = [];
var lastPoint;
var copyPoint = undefined;
var copyPoint2;
var dx = 0;
var dy = 0;
var copied = false;
var copying = false;

// Rectangle areas
var rectPoints = [];
var p1p2mA;
var p2p3mA;
var p3p4mA;
var p4p1mA;
var rectA;

// Shape drawing variables
var firstPoint;
var isFirstPoint;
var k;
var firstIndexRec;

// Layers
const layerMap = {
  layer_1: 1,
  layer_2: 2,
  layer_3: 3,
  layer_4: 4,
};

const layerConstantDepth = {
  first: -0.75,
  second: -0.5,
  third: -0.25,
  forth: 0,
};

var layerDepths = {
  layer_1: layerConstantDepth.first,
  layer_2: layerConstantDepth.second,
  layer_3: layerConstantDepth.third,
  layer_4: layerConstantDepth.forth,
};
var layerOrder = [
  layerMap.layer_1,
  layerMap.layer_2,
  layerMap.layer_3,
  layerMap.layer_4,
];
var z;
var currentLayer = layerMap.layer_1;

var eraserMode = false;
var isMoving;

var maxNumTriangles = 2000;
var maxNumVertices = 3 * maxNumTriangles;
var cindex = 0;
var paintColor = colors[cindex];
var redraw = false;

var numOfPoly = 0;
var lengthOfLines = [];
var startIndexOfLines = [];
var lengthOfALine = 0;
var vertexData = [];
var colorData = [];
var mode = [];

// Redo undo stack
var IsVisiable = [];
var visiableStack = [];

// Circle variables
var numberOfPointAtBrush = 12;
var circleRadius = 0.05;

$(document).ready(function () {
  // Color picker implementation
  $("#btnradio1").on("click", () => {
    currentMode = LINE_MODE;
  });
  $("#btnradio2").on("click", () => {
    currentMode = ERASER_MODE;
  });
  $("#btnradio3").on("click", () => {
    currentMode = RECTANGLE_MODE_FILLED;
  });
  $("#btnradio4").on("click", () => {
    currentMode = TRIANGLE_MODE_FILLED;
  });
  $("#btnradio5").on("click", () => {
    currentMode = ELLIPSE_MODE_FILLED;
  });
  $("#btnradio6").on("click", () => {
    currentMode = COPY_PASTE_MODE;
  });

  $("#white-color-btn").on("click", () => {
    paintColor = colors[0];
  });
  $("#red-color-btn").on("click", () => {
    paintColor = colors[1];
  });
  $("#yellow-color-btn").on("click", () => {
    paintColor = colors[2];
  });
  $("#green-color-btn").on("click", () => {
    paintColor = colors[3];
  });
  $("#blue-color-btn").on("click", () => {
    paintColor = colors[4];
  });
  $("#magenta-color-btn").on("click", () => {
    paintColor = colors[5];
  });
  $("#cyan-color-btn").on("click", () => {
    paintColor = colors[6];
  });
  $("#purple-color-btn").on("click", () => {
    paintColor = colors[7];
  });

  $("#sortable")
    .sortable({ handle: ".handle" })
    .selectable({
      filter: "li",
      cancel: ".handle",
      selected: function (event, ui) {
        switch ($(ui.selected).attr("id")) {
          case "layer-1":
            currentLayer = layerMap.layer_1;
            break;
          case "layer-2":
            currentLayer = layerMap.layer_2;
            break;
          case "layer-3":
            currentLayer = layerMap.layer_3;
            break;
          case "layer-4":
            currentLayer = layerMap.layer_4;
            break;
        }
        console.log(currentLayer);
        $(ui.selected)
          .addClass("ui-selected")
          .siblings()
          .removeClass("ui-selected")
          .each(function (key, value) {
            $(value).find("*").removeClass("ui-selected");
          });
      },
    })
    .find("li")
    .addClass("ui-corner-all")
    .prepend(
      "<div class='handle'><span class='ui-icon ui-icon-carat-2-n-s'></span></div>"
    );

  $("#color-picker").spectrum({
    color: "white",
    type: "flat",
    showPalette: false,
    showInitial: true,
  });

  // Change the code here a bit
  $("#save-button").click(() => {
    var data = {
      vertexData: vertexData,
      colorData: colorData,
      numOfPoly: numOfPoly,
      lengthOfLines: lengthOfLines,
      startIndexOfLines: startIndexOfLines,
      mode: mode,
      IsVisiable: IsVisiable,
    };

    var json = JSON.stringify(data);

    json = [json];
    var blob1 = new Blob(json, { type: ".json" });

    var isIE = false || !!document.documentMode;
    if (isIE) {
      window.navigator.msSaveBlob(blob1, "data.json");
    } else {
      var url = window.URL || window.webkitURL;
      link = url.createObjectURL(blob1);
      var a = document.createElement("a");
      a.download = "data.json";
      a.href = link;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  });
});

window.onload = function init() {
  // Color paletta

  const canvas = document.createElement("canvas");
  canvas.height = 512;
  canvas.width = 512;

  $("#canvas-holder").append(canvas);
  $("#canvas-holder").css("cursor", "none");
  gl = canvas.getContext("webgl");
  if (!gl) {
    alert("WebGL isn't available");
  }

  $("#color-picker").on("dragstop.spectrum", function (e, tinycolor) {
    paintColor = vec4(
      tinycolor._r / 255,
      tinycolor._g / 255,
      tinycolor._b / 255,
      tinycolor._a
    );
  });

  $("#sortable").on("sortdeactivate", function (event, ui) {
    var layerArray = $("#sortable").sortable("toArray");
    for (var i = 0; i < layerArray.length; i++) {
      switch (layerArray[i]) {
        case "layer-1":
          layerOrder[layerOrder.length - i - 1] = layerMap.layer_1;
          break;
        case "layer-2":
          layerOrder[layerOrder.length - i - 1] = layerMap.layer_2;
          break;
        case "layer-3":
          layerOrder[layerOrder.length - i - 1] = layerMap.layer_3;
          break;
        case "layer-4":
          layerOrder[layerOrder.length - i - 1] = layerMap.layer_4;
          break;
      }
    }
    var previousLayerDepths = {
      layer_1: layerDepths.layer_1,
      layer_2: layerDepths.layer_2,
      layer_3: layerDepths.layer_3,
      layer_4: layerDepths.layer_4,
    };
    for (var i = 0; i < layerOrder.length; i++) {
      switch (layerOrder[i]) {
        case 4:
          switch (i) {
            case 0:
              layerDepths.layer_4 = layerConstantDepth.forth;
              break;
            case 1:
              layerDepths.layer_4 = layerConstantDepth.third;
              break;
            case 2:
              layerDepths.layer_4 = layerConstantDepth.second;
              break;
            case 3:
              layerDepths.layer_4 = layerConstantDepth.first;
              break;
          }
          break;
        case 3:
          switch (i) {
            case 0:
              layerDepths.layer_3 = layerConstantDepth.forth;
              break;
            case 1:
              layerDepths.layer_3 = layerConstantDepth.third;
              break;
            case 2:
              layerDepths.layer_3 = layerConstantDepth.second;
              break;
            case 3:
              layerDepths.layer_3 = layerConstantDepth.first;
              break;
          }
          break;
        case 2:
          switch (i) {
            case 0:
              layerDepths.layer_2 = layerConstantDepth.forth;
              break;
            case 1:
              layerDepths.layer_2 = layerConstantDepth.third;
              break;
            case 2:
              layerDepths.layer_2 = layerConstantDepth.second;
              break;
            case 3:
              layerDepths.layer_2 = layerConstantDepth.first;
              break;
          }
          break;
        case 1:
          switch (i) {
            case 0:
              layerDepths.layer_1 = layerConstantDepth.forth;
              break;
            case 1:
              layerDepths.layer_1 = layerConstantDepth.third;
              break;
            case 2:
              layerDepths.layer_1 = layerConstantDepth.second;
              break;
            case 3:
              layerDepths.layer_1 = layerConstantDepth.first;
              break;
          }
          break;
      }
    }
    for (var i = numberOfPointAtBrush; i < vertexData.length; i++) {
      var currentZ = vertexData[i][2];
      var tempVec3;
      if (previousLayerDepths.layer_1 == currentZ) {
        tempVec3 = vec3(
          vertexData[i][0],
          vertexData[i][1],
          layerDepths.layer_1
        );
      } else if (previousLayerDepths.layer_2 == currentZ) {
        tempVec3 = vec3(
          vertexData[i][0],
          vertexData[i][1],
          layerDepths.layer_2
        );
      } else if (previousLayerDepths.layer_3 == currentZ) {
        tempVec3 = vec3(
          vertexData[i][0],
          vertexData[i][1],
          layerDepths.layer_3
        );
      } else if (previousLayerDepths.layer_4 == currentZ) {
        tempVec3 = vec3(
          vertexData[i][0],
          vertexData[i][1],
          layerDepths.layer_4
        );
      }
      console.log(tempVec3);
      vertexData[i] = tempVec3;
      gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 12 * i, flatten(tempVec3));

      gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 16 * i, flatten(colorData[i]));
    }
  });

  $("body").keypress((e) => {
    if (e.which == 26) {
      if (numOfPoly > 0) {
        var index = numOfPoly - 1;
        var bool = false;
        while (!bool) {
          if (IsVisiable[index] == true) {
            bool = true;
            IsVisiable[index] = false;
          } else {
            index--;
          }
        }
        visiableStack.push(index);
      }
    } else if (e.which == 25) {
      if (numOfPoly > 0) {
        var index = visiableStack.pop();
        IsVisiable[index] = true;
      }
    }
  });

  canvas.addEventListener("mousedown", (event) => {
    redraw = true;
    lengthOfALine = 0;
    if (numOfPoly == 0) {
      startIndexOfLines[numOfPoly] = numberOfPointAtBrush;
    } else {
      startIndexOfLines[numOfPoly] =
        startIndexOfLines[numOfPoly - 1] + lengthOfLines[numOfPoly - 1];
    }
    lengthOfLines[numOfPoly] = 0;
    IsVisiable[numOfPoly] = true;
    numOfPoly++;
    isMoving = false;
    isFirstPoint = true;
    copied = false;
  });

  canvas.addEventListener("mouseup", (event) => {
    redraw = false;
    if (!isMoving) {
      numOfPoly--;
    }
    isFirstPoint = false;
    if (!copied && currentMode == COPY_PASTE_MODE) {
      var m = 0;

      rectA =
        Math.sqrt(
          Math.pow(rectPoints[0][0] - rectPoints[1][0], 2) +
            Math.pow(rectPoints[0][1] - rectPoints[1][1], 2)
        ) *
        Math.sqrt(
          Math.pow(rectPoints[2][0] - rectPoints[1][0], 2) +
            Math.pow(rectPoints[2][1] - rectPoints[1][1], 2)
        );
      rectA += 0.0002;
      console.log("Rectangle area: " + rectA);

      for (
        var i = numberOfPointAtBrush;
        i < vertexData.length - vertexData[vertexData.length - 1].length - 1;
        i++
      ) {
        p1p2mA = calTriangleArea(rectPoints[0], rectPoints[1], vertexData[i]);
        p2p3mA = calTriangleArea(rectPoints[1], rectPoints[2], vertexData[i]);
        p3p4mA = calTriangleArea(rectPoints[2], rectPoints[3], vertexData[i]);
        p4p1mA = calTriangleArea(rectPoints[3], rectPoints[0], vertexData[i]);
        var areaa = p1p2mA + p2p3mA + p3p4mA + p4p1mA;

        if (p1p2mA + p2p3mA + p3p4mA + p4p1mA < rectA) {
          console.log("Triangle area: " + areaa);
          copyVertexes[m] = vertexData[i];
          copyColors[m] = colorData[i];
          m++;
        }
      }
    }
    copying = true;
    if (copied) {
      copyVertexes = [];
      copyVertexes2 = [];
      copyColors = [];
      copyPoint = undefined;
      copyPoint2 = undefined;
      copying = false;
      numOfPoly--;
      console.log("Copied called");
    }
  });

  canvas.addEventListener("mousemove", (event) => {
    // Draw the circle for the brush
    var cRect = canvas.getBoundingClientRect();
    var mouseX = event.clientX - cRect.left;
    var mouseY = event.clientY - cRect.top;
    isMoving = true;

    var theta = 0;
    var centerX = (2 * mouseX) / canvas.width - 1;
    var centerY = (2 * (canvas.height - mouseY)) / canvas.height - 1;
    var centerZ = -1.0;
    for (var i = 0; i < numberOfPointAtBrush; i++) {
      var m = vec3(
        circleRadius * Math.cos(theta) + centerX,
        circleRadius * Math.sin(theta) + centerY,
        centerZ
      );

      vertexData[i] = m;
      gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 12 * i, flatten(m));

      var brushColor = vec4(1.0, 1.0, 0.0, 1);
      colorData[i] = brushColor;
      gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 16 * i, flatten(brushColor));

      theta += Math.PI / 6;
    }
    // DRAW THE LINE
    if (redraw && currentMode == LINE_MODE) {
      switch (currentLayer) {
        case layerMap.layer_1:
          z = layerDepths.layer_1;
          break;
        case layerMap.layer_2:
          z = layerDepths.layer_2;
          break;
        case layerMap.layer_3:
          z = layerDepths.layer_3;
          break;
        case layerMap.layer_4:
          z = layerDepths.layer_4;
          break;
      }
      var t = vec3(
        (2 * mouseX) / canvas.width - 1,
        (2 * (canvas.height - mouseY)) / canvas.height - 1,
        z
      );

      vertexData.push(t);
      gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
      gl.bufferSubData(
        gl.ARRAY_BUFFER,
        12 * (vertexData.length - 1),
        flatten(t)
      );

      colorData.push(paintColor);
      gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
      gl.bufferSubData(
        gl.ARRAY_BUFFER,
        16 * (vertexData.length - 1),
        flatten(paintColor)
      );

      lengthOfLines[numOfPoly - 1]++;
      mode[numOfPoly - 1] = LINE_MODE;
    } else if (currentMode == ERASER_MODE) {
      for (var j = numberOfPointAtBrush; j < vertexData.length; j++) {
        var d = Math.sqrt(
          Math.pow(centerX - vertexData[j][0], 2) +
            Math.pow(centerY - vertexData[j][1], 2)
        );
        var pIndex = j;
        if (d < circleRadius) {
          if (pIndex != -1) {
            console.log(pIndex);
            console.log(findLineIndexFromPointIndex(pIndex));

            lengthOfLines[findLineIndexFromPointIndex(pIndex)]--;

            console.log(numOfPoly);
            console.log("length " + lengthOfLines);
            console.log("startOfIindex " + startIndexOfLines);

            for (
              var i = findLineIndexFromPointIndex(pIndex) + 1;
              i < numOfPoly;
              i++
            ) {
              startIndexOfLines[i]--;
            }
            console.log("startOfIindex " + startIndexOfLines);

            vertexData.splice(pIndex, 1);
            colorData.splice(pIndex, 1);

            for (var i = pIndex; i < vertexData.length; i++) {
              gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
              gl.bufferSubData(gl.ARRAY_BUFFER, 12 * i, flatten(vertexData[i]));

              gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
              gl.bufferSubData(gl.ARRAY_BUFFER, 16 * i, flatten(colorData[i]));
            }
          }
        }
      }
    } else if (redraw && currentMode == RECTANGLE_MODE_FILLED) {
      if (isFirstPoint) {
        firstIndexRec = vertexData.length;
        switch (currentLayer) {
          case layerMap.layer_1:
            z = layerDepths.layer_1;
            break;
          case layerMap.layer_2:
            z = layerDepths.layer_2;
            break;
          case layerMap.layer_3:
            z = layerDepths.layer_3;
            break;
          case layerMap.layer_4:
            z = layerDepths.layer_4;
            break;
        }
        k = vec3(
          (2 * mouseX) / canvas.width - 1,
          (2 * (canvas.height - mouseY)) / canvas.height - 1,
          z
        );
        isFirstPoint = false;
      } else {
        var current = vec3(
          (2 * mouseX) / canvas.width - 1,
          (2 * (canvas.height - mouseY)) / canvas.height - 1,
          z
        );
        console.log("current z: " + z);
        var d1 = -(k[0] - current[0]) / 5;
        var d2 = -(k[1] - current[1]) / 4;
        var vertices = [
          vec3(k[0], k[1], z),
          vec3(k[0] + d1, k[1], z),
          vec3(k[0] + 2 * d1, k[1], z),
          vec3(k[0] + 3 * d1, k[1], z),
          vec3(k[0] + 4 * d1, k[1], z),
          vec3(k[0] + 5 * d1, k[1], z),

          vec3(k[0] + 5 * d1, k[1] + 1 * d2, z),
          vec3(k[0] + 5 * d1, k[1] + 2 * d2, z),
          vec3(k[0] + 5 * d1, k[1] + 3 * d2, z),
          vec3(k[0] + 5 * d1, k[1] + 4 * d2, z),

          vec3(k[0] + 4 * d1, k[1] + 4 * d2, z),
          vec3(k[0] + 3 * d1, k[1] + 4 * d2, z),
          vec3(k[0] + 2 * d1, k[1] + 4 * d2, z),
          vec3(k[0] + d1, k[1] + 4 * d2, z),

          vec3(k[0], k[1] + 4 * d2, z),
          vec3(k[0], k[1] + 3 * d2, z),
          vec3(k[0], k[1] + 2 * d2, z),
          vec3(k[0], k[1] + d2, z),
        ];

        lengthOfLines[numOfPoly - 1] = RECTANGLE_SIZE;
        mode[numOfPoly - 1] = RECTANGLE_MODE_FILLED;
        for (var i = firstIndexRec; i < firstIndexRec + RECTANGLE_SIZE; i++) {
          vertexData[i] = vertices[i - firstIndexRec];
          gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
          gl.bufferSubData(
            gl.ARRAY_BUFFER,
            12 * i,
            flatten(vertices[i - firstIndexRec])
          );

          // colorData.push(paintColor);
          colorData[i] = paintColor;
          gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 16 * i, flatten(paintColor));
        }
      }
    } else if (redraw && currentMode == ELLIPSE_MODE_FILLED) {
      if (isFirstPoint) {
        firstIndexRec = vertexData.length;
        switch (currentLayer) {
          case layerMap.layer_1:
            z = layerDepths.layer_1;
            break;
          case layerMap.layer_2:
            z = layerDepths.layer_2;
            break;
          case layerMap.layer_3:
            z = layerDepths.layer_3;
            break;
          case layerMap.layer_4:
            z = layerDepths.layer_4;
            break;
        }
        k = vec3(
          (2 * mouseX) / canvas.width - 1,
          (2 * (canvas.height - mouseY)) / canvas.height - 1,
          z
        );
        isFirstPoint = false;
      } else {
        console.log(z);
        var current = vec3(
          (2 * mouseX) / canvas.width - 1,
          (2 * (canvas.height - mouseY)) / canvas.height - 1,
          z
        );
        var a = (current[0] - k[0]) / 2;
        var b = (current[1] - k[1]) / 2;
        let center = vec2(k[0] + a, k[1] + b);

        var vertices = [];
        let m = 0;
        for (var i = 0; i < 2 * Math.PI; i += Math.PI / 9) {
          vertices[m] = vec3(
            center[0] + a * Math.cos(i),
            center[1] + b * Math.sin(i),
            z
          );
          m++;
        }

        lengthOfLines[numOfPoly - 1] = RECTANGLE_SIZE;
        mode[numOfPoly - 1] = ELLIPSE_MODE_FILLED;
        for (var i = firstIndexRec; i < firstIndexRec + RECTANGLE_SIZE; i++) {
          vertexData[i] = vertices[i - firstIndexRec];
          gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
          gl.bufferSubData(
            gl.ARRAY_BUFFER,
            12 * i,
            flatten(vertices[i - firstIndexRec])
          );

          // colorData.push(paintColor);
          colorData[i] = paintColor;
          gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 16 * i, flatten(paintColor));
        }
      }
    } else if (redraw && currentMode == TRIANGLE_MODE_FILLED) {
      if (isFirstPoint) {
        firstIndexRec = vertexData.length;
        switch (currentLayer) {
          case layerMap.layer_1:
            z = layerDepths.layer_1;
            break;
          case layerMap.layer_2:
            z = layerDepths.layer_2;
            break;
          case layerMap.layer_3:
            z = layerDepths.layer_3;
            break;
          case layerMap.layer_4:
            z = layerDepths.layer_4;
            break;
        }
        k = vec3(
          (2 * mouseX) / canvas.width - 1,
          (2 * (canvas.height - mouseY)) / canvas.height - 1,
          z
        );
        isFirstPoint = false;
      } else {
        var current = vec3(
          (2 * mouseX) / canvas.width - 1,
          (2 * (canvas.height - mouseY)) / canvas.height - 1,
          z
        );
        var t1 = vec2(current[0] - k[0], current[1] - k[1]);
        var r = Math.sqrt(Math.pow(t1[0], 2) + Math.pow(t1[1], 2));

        var angle = Math.atan2(t1[1], t1[0]);

        t1 = current;
        var t2 = vec3(
          r * Math.cos(angle + (Math.PI * 2) / 3) + k[0],
          r * Math.sin(angle + (Math.PI * 2) / 3) + k[1],
          z
        );

        var t3 = vec3(
          r * Math.cos(angle + (Math.PI * 4) / 3) + k[0],
          r * Math.sin(angle + (Math.PI * 4) / 3) + k[1],
          z
        );

        var vertices = [
          mix(t1, t2, 0 / 6),
          mix(t1, t2, 1 / 6),
          mix(t1, t2, 2 / 6),
          mix(t1, t2, 3 / 6),
          mix(t1, t2, 4 / 6),
          mix(t1, t2, 5 / 6),
          mix(t1, t2, 1),
          mix(t3, t2, 5 / 6),
          mix(t3, t2, 4 / 6),
          mix(t3, t2, 3 / 6),
          mix(t3, t2, 2 / 6),
          mix(t3, t2, 1 / 6),
          mix(t1, t3, 6 / 6),
          mix(t1, t3, 5 / 6),
          mix(t1, t3, 4 / 6),
          mix(t1, t3, 3 / 6),
          mix(t1, t3, 2 / 6),
          mix(t1, t3, 1 / 6),
        ];

        lengthOfLines[numOfPoly - 1] = TRIANGLE_SIZE;
        mode[numOfPoly - 1] = TRIANGLE_MODE_FILLED;
        for (var i = firstIndexRec; i < firstIndexRec + TRIANGLE_SIZE; i++) {
          vertexData[i] = vertices[i - firstIndexRec];
          gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
          gl.bufferSubData(
            gl.ARRAY_BUFFER,
            12 * i,
            flatten(vertices[i - firstIndexRec])
          );

          //  colorData.push(paintColor);
          colorData[i] = paintColor;
          gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 16 * i, flatten(paintColor));
        }
      }
    } else if (redraw && currentMode == COPY_PASTE_MODE) {
      if (event.ctrlKey == true && copying) {
        if (copyPoint == undefined) {
          copyPoint = vec3(
            (2 * mouseX) / canvas.width - 1,
            (2 * (canvas.height - mouseY)) / canvas.height - 1,
            z
          );
          copyPoint2 = copyPoint;
        } else {
          copyPoint = copyPoint2;
          copyPoint2 = vec3(
            (2 * mouseX) / canvas.width - 1,
            (2 * (canvas.height - mouseY)) / canvas.height - 1,
            z
          );
          dx = copyPoint2[0] - copyPoint[0];
          dy = copyPoint2[1] - copyPoint[1];
        }
        console.log("number of poligon: " + numOfPoly);
        copyVertexes2 = [...copyVertexes];

        for (var i = 0; i < copyVertexes.length; i++) {
          copyVertexes[i] = vec3(
            copyVertexes2[i][0] + dx,
            copyVertexes2[i][1] + dy,
            copyVertexes2[i][2]
          );
        }

        lengthOfLines[numOfPoly - 2] = copyVertexes.length;
        console.log("length: " + lengthOfLines);
        console.log("startIndex: " + startIndexOfLines);
        for (
          var i = firstIndexRec;
          i < firstIndexRec + copyVertexes.length;
          i++
        ) {
          vertexData[i] = copyVertexes[i - firstIndexRec];
          gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
          gl.bufferSubData(
            gl.ARRAY_BUFFER,
            12 * i,
            flatten(copyVertexes[i - firstIndexRec])
          );

          //colorData.push(paintColor);
          colorData[i] = copyColors[i - firstIndexRec];
          gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
          gl.bufferSubData(
            gl.ARRAY_BUFFER,
            16 * i,
            flatten(copyColors[i - firstIndexRec])
          );
          copied = true;
        }
      } else if (isFirstPoint) {
        firstIndexRec = vertexData.length;
        switch (currentLayer) {
          case layerMap.layer_1:
            z = layerDepths.layer_1;
            break;
          case layerMap.layer_2:
            z = layerDepths.layer_2;
            break;
          case layerMap.layer_3:
            z = layerDepths.layer_3;
            break;
          case layerMap.layer_4:
            z = layerDepths.layer_4;
            break;
        }
        k = vec3(
          (2 * mouseX) / canvas.width - 1,
          (2 * (canvas.height - mouseY)) / canvas.height - 1,
          z
        );
        isFirstPoint = false;
      } else {
        var current = vec3(
          (2 * mouseX) / canvas.width - 1,
          (2 * (canvas.height - mouseY)) / canvas.height - 1,
          z
        );
        var d1 = -(k[0] - current[0]) / 5;
        var d2 = -(k[1] - current[1]) / 4;
        lastPoint = vec3(k[0] + 5 * d1, k[1] + 4 * d2, z);
        var vertices = [
          vec3(k[0], k[1], z),
          vec3(k[0] + 5 * d1, k[1], z),
          vec3(k[0] + 5 * d1, k[1] + 4 * d2, z),
          vec3(k[0], k[1] + 4 * d2, z),
        ];
        var brushColor = vec4(1.0, 1.0, 1.0, 1);
        lengthOfLines[numOfPoly - 1] = vertices.length;
        mode[numOfPoly - 1] = COPY_PASTE_MODE;
        for (var i = firstIndexRec; i < firstIndexRec + vertices.length; i++) {
          vertexData[i] = vertices[i - firstIndexRec];
          gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
          gl.bufferSubData(
            gl.ARRAY_BUFFER,
            12 * i,
            flatten(vertices[i - firstIndexRec])
          );

          colorData.push(brushColor);
          //colorData[i] = paintColor;
          gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
          gl.bufferSubData(gl.ARRAY_BUFFER, 16 * i, flatten(brushColor));
        }
        rectPoints = [...vertices];
        copied = false;
      }
    }
  });

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  gl.enable(gl.DEPTH_TEST);

  //
  //  Load shaders and initialize attribute buffers
  //
  var program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  // Turned 3-dimensional points

  vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, 12 * maxNumVertices, gl.STATIC_DRAW);

  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, 16 * maxNumVertices, gl.STATIC_DRAW);

  var vColor = gl.getAttribLocation(program, "vColor");
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vColor);

  render();
};

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.drawArrays(gl.LINES, 0, numberOfPointAtBrush);
  for (var i = numOfPoly - 1; i >= 0; i--) {
    if (IsVisiable[i] && lengthOfLines[i] > 0) {
      if (mode[i] == LINE_MODE) {
        gl.drawArrays(gl.POINTS, startIndexOfLines[i], lengthOfLines[i]);
      } else if (mode[i] == RECTANGLE_MODE_FILLED) {
        gl.drawArrays(gl.TRIANGLE_FAN, startIndexOfLines[i], lengthOfLines[i]);
      } else if (mode[i] == ELLIPSE_MODE_FILLED) {
        gl.drawArrays(gl.TRIANGLE_FAN, startIndexOfLines[i], lengthOfLines[i]);
      } else if (mode[i] == TRIANGLE_MODE_FILLED) {
        gl.drawArrays(gl.TRIANGLE_FAN, startIndexOfLines[i], lengthOfLines[i]);
      } else if (mode[i] == COPY_PASTE_MODE) {
        gl.drawArrays(gl.POINTS, startIndexOfLines[i], lengthOfLines[i]);
      }
    }
  }
  window.requestAnimFrame(render);
}

function findLineIndexFromPointIndex(index) {
  if (numOfPoly == 1) {
    return 0;
  }
  for (var i = 1; i < startIndexOfLines.length; i++) {
    if (index < startIndexOfLines[i]) {
      console.log("called");
      return i - 1;
    } else if (index >= startIndexOfLines[startIndexOfLines.length - 1]) {
      console.log("called 2");
      return numOfPoly - 1;
    }
  }
}

function calTriangleArea(p1, p2, p3) {
  var l1 = Math.sqrt(Math.pow(p2[1] - p1[1], 2) + Math.pow(p2[0] - p1[0], 2));
  var l2 = Math.sqrt(Math.pow(p3[1] - p2[1], 2) + Math.pow(p3[0] - p2[0], 2));
  var l3 = Math.sqrt(Math.pow(p3[1] - p1[1], 2) + Math.pow(p3[0] - p1[0], 2));
  var semip = (l1 + l2 + l3) / 2;
  return Math.sqrt(semip * (semip - l1) * (semip - l2) * (semip - l3));
}

function downloadFile() {
  let reader = new FileReader();

  reader.addEventListener(
    "load",
    (e) => {
      var json = JSON.parse(reader.result);
      colorData = json.colorData;
      vertexData = json.vertexData;
      numOfPoly = json.numOfPoly;
      lengthOfLines = json.lengthOfLines;
      startIndexOfLines = json.startIndexOfLines;
      mode = json.mode;
      IsVisiable = json.IsVisiable;

      for (var i = 0; i < vertexData.length; i++) {
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 12 * i, flatten(vertexData[i]));

        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 16 * i, flatten(colorData[i]));
      }
    },
    false
  );
  reader.readAsText(file.files[0]);
}
