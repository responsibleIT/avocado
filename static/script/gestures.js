// Copyright 2023 The MediaPipe Authors.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//      http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// import { GestureRecognizer, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js";
import { GestureRecognizer, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
// const demosSection = document.getElementById("demos");
let gestureRecognizer;
let runningMode = "VIDEO";
const enableWebcamButton = document.getElementById("webcamButton");
let webcamRunning = false;
const videoHeight = "360px";
const videoWidth = "480px";
// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createGestureRecognizer = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: userPath + 'models/gestures/' +  config.modelPath.gestures,
            // modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
        },
        numHands: config.nr.gestures,
        runningMode: runningMode
    });
    // we set some options. This should have been taken care of during initialisation of the recogniser, but that doesn't seem to work properly right now
    await gestureRecognizer.setOptions({ numHands: config.nr.gestures })
    // demosSection.classList.remove("invisible");

    // If webcam supported, add event listener to button.
    if (hasGetUserMedia()) {
        enableWebcamButton.addEventListener("click", enableCam);
        enableCam()
    }
    else {
        console.warn("getUserMedia() is not supported by your browser");
    }
};

createGestureRecognizer();

/********************************************************************
// Demo: Continuously grab image from webcam stream and detect it.
********************************************************************/
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const gestureOutput = document.getElementById("webcamPredictions");
const detectorResponseText = document.getElementById("responseText");
const detectorResponseColor = document.getElementById("responseColor");

// Check if webcam access is supported.
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Enable the live webcam view and start detection.
function enableCam(event) {
    if (!gestureRecognizer) {
        alert("Please wait for gestureRecognizer to load");
        return;
    }
    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.innerText = "ENABLE RECOGNITION";
    }
    else {
        webcamRunning = true;
        enableWebcamButton.innerText = "DISABLE RECOGNITON";
    }
    // getUsermedia parameters.
    const constraints = {
        video: true
    };
    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    });
}
let lastVideoTime = -1;
let results = undefined;
async function predictWebcam() {
    const webcamElement = document.getElementById("webcam");
    // Now let's start detecting the stream.
    // if (runningMode === "IMAGE") {
    //     runningMode = "VIDEO";
    //     await gestureRecognizer.setOptions({ runningMode: "VIDEO"});
    // }
    let nowInMs = Date.now();
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        results = gestureRecognizer.recognizeForVideo(video, nowInMs);
    }
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const drawingUtils = new DrawingUtils(canvasCtx);
    canvasElement.style.height = videoHeight;
    webcamElement.style.height = videoHeight;
    canvasElement.style.width = videoWidth;
    webcamElement.style.width = videoWidth;
    if (results.landmarks) {
        for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
                color: "#00FF00",
                lineWidth: 5
            });
            drawingUtils.drawLandmarks(landmarks, {
                color: "#FF0000",
                lineWidth: 2
            });
        }
    }
    canvasCtx.restore();
    if (results.gestures.length > 0) {

        // console.log("Hands: " + results.handednesses.length)
        // if (results.gestures.length == 2) { 
        //     console.log(results.gestures[0][0].categoryName + " --- " + results.gestures[1][0].categoryName)
        // }
        // gestureOutput.style.display = "block";
        // gestureOutput.style.width = videoWidth;
        gestureOutput.innerText = ''
        let outputText = ""
        let outputColors = []

        for (const gesture of results.gestures) {
            const categoryName = gesture[0].categoryName;
            const categoryScore = parseFloat(gesture[0].score * 100).toFixed(2);


            // commented out the below. We are now iterating over results.gestures so we can't access results.handednesses

            // const handedness = results.handednesses[0][0].displayName;
            // // the webcam shows a mirror image, so handesness is also inverted
            // let realHandedness
            // if (handedness == 'Right') {
            //     realHandedness = 'Left' 
            // } else {
            //     realHandedness = 'Right' 
            // }

            // gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${realHandedness}`;

            // list the gestures that were detected
            gestureOutput.innerText += `Gesture: ${categoryName}, confidence: ${categoryScore} %\n`;

                  // check if any of the rules for gesturet detection were matched. If so, add the output text and/or color
            for (const rule of config.rules.gestures) {
                if (rule.label == categoryName) {
                    if (rule.outputType == 'text') {
                        outputText += rule.output + "\n"
                    }
                    if (rule.outputType == 'color') {
                        outputColors.push(rule.output)
                    }
                }
            }

        }

        if (outputText) {
            detectorResponseText.innerText = outputText
        } else {
            detectorResponseText.innerText = "\n"
        }

        if (outputColors.length > 0) {
            detectorResponseColor.style.backgroundColor = mix_hexes(...outputColors)
        } else {
            detectorResponseColor.style.backgroundColor = 'black'
        }       

    } else {
        // gestureOutput.style.display = "none";
    }

    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}