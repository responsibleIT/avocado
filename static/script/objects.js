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
import { ImageClassifier, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";
// Get DOM elements
const video = document.getElementById("webcam");
const webcamPredictions = document.getElementById("webcamPredictions");
// const demosSection = document.getElementById("demos");
const detectorResponseText = document.getElementById("responseText");
const detectorResponseColor = document.getElementById("responseColor");
const enableWebcamButton = document.getElementById("webcamButton");
let webcamRunning = false;
const videoHeight = "360px";
const videoWidth = "480px";
const imageContainers = document.getElementsByClassName("classifyOnClick");
let runningMode = "VIDEO";

// Check if webcam access is supported.
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Track imageClassifier object and load status.
let imageClassifier;
/**
 * Create an ImageClassifier from the given options.
 * You can replace the model with a custom one.
 */
const createImageClassifier = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm");
    imageClassifier = await ImageClassifier.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: userPath + 'models/objects/' + config.modelPath.objects
            // modelAssetPath: `https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/float32/1/efficientnet_lite0.tflite`
            // NOTE: For this demo, we keep the default CPU delegate.
        },
        maxResults: config.nr.objects ,
        scoreThreshold: config.confidence.objects / 100 ,
        runningMode: runningMode
    });
    // Show demo section now model is ready to use.
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

createImageClassifier();


// Get classification from the webcam
async function predictWebcam() {
    // Do not classify if imageClassifier hasn't loaded
    if (imageClassifier === undefined) {
        return;
    }

    let outputText = ""
    let outputColors = []
    webcamPredictions.innerText = ""

    const startTimeMs = performance.now();
    const classificationResult = imageClassifier.classifyForVideo(video, startTimeMs);
    video.style.height = videoHeight;
    video.style.width = videoWidth;
    // webcamPredictions.style.width = videoWidth;
    const classifications = classificationResult.classifications;

    for (const category of classifications[0].categories) {
        // webcamPredictions.className = "webcamPredictions";

        // list the objects that were detected
        webcamPredictions.innerText +=
            "Classification: " +
                category.categoryName +
                ", confidence: " +
                Math.round(parseFloat(category.score) * 100) +
                "%\n";

        // check if any of the rules for object detection were matched. If so, add the output text and/or color
        for (const rule of config.rules.objects) {
            if (rule.label == category.categoryName) {
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

    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}

// Enable the live webcam view and start classification.
async function enableCam(event) {
    if (imageClassifier === undefined) {
        return;
    }
    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.innerText = "ENABLE RECOGNITION";
    }
    else {
        webcamRunning = true;
        enableWebcamButton.innerText = "DISABLE RECOGNITION";
    }
    // getUsermedia parameters.
    const constraints = {
        video: true
    };
    // Activate the webcam stream.
    video.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
    video.addEventListener("loadeddata", predictWebcam);
}
