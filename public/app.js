const { Configuration, OpenAIApi } = require("openai");

let video;
let poseNet;
let poses = [];
let side = "left";

let maxKneeFlexion = 180;
let maxHipFlexion = 180;
let maxDorsiflexion = 180;
let maxTrunkLean = 180;

const executionConstraints = {
  frameDepth: 125,
  depthSuperiorRange: 100,
  depthMediumRange: 85,
  minimumForwardLeanRange: 45,
  maximumForwardLeanRange: 70,
  forwardLeanRangeDifference: 15,
};

let currentMinLeanFlexion = 90;
let currentMinKneeFlexion = 180;
let currentShinFlexion = 180;
let currentHeadTilt = 0;

let isSquatting = false;
let squatCounter = 0;

let startTime;
let midExerciseTime;
let elapsedTime;

let knee,
  hip,
  ankle,
  kneeFlexion,
  dorsiflexion,
  hipFlexion,
  shoulder,
  anKnee,
  sHip,
  trunkLean,
  nose,
  leftEye,
  rightEye;

function setup() {
  let canvas = createCanvas(640, 480);
  canvas.parent("app");

  constraints = {
    video: {
      width: { max: 640 },
      height: { max: 480 },
      facingMode: {
        ideal: "environment",
      },
    },
  };

  video = createCapture(constraints);
  video.size(width, height);

  // Create a new poseNet method with a single detection
  poseNet = ml5.poseNet(video, modelReady);

  // This sets up an event that fills the global variable "poses"
  // with an array every time new poses are detected
  // and extracts only the keypoints we are interested in (knee, hip, ankle, shoulder)
  // before also calculating the angles between these keypoints with atan2
  poseNet.on("pose", function (results) {
    poses = results;

    if (poses.length > 0) {
      nose = poses[0].pose.nose;
      leftEye = poses[0].pose.leftEye;
      rightEye = poses[0].pose.rightEye;

      switch (side) {
        case "left":
          knee = poses[0].pose.leftKnee;
          hip = poses[0].pose.leftHip;
          ankle = poses[0].pose.leftAnkle;
          shoulder = poses[0].pose.leftShoulder;
          anKnee = { x: knee.x, y: ankle.y };
          sHip = { x: shoulder.x, y: hip.y };
          kneeFlexion =
            (Math.atan2(ankle.y - knee.y, ankle.x - knee.x) -
              Math.atan2(hip.y - knee.y, hip.x - knee.x)) *
            (180 / Math.PI);
          hipFlexion =
            360 -
            (Math.atan2(knee.y - hip.y, knee.x - hip.x) -
              Math.atan2(shoulder.y - hip.y, shoulder.x - hip.x)) *
              (180 / Math.PI);
          dorsiflexion =
            360 -
            (Math.atan2(anKnee.y - ankle.y, anKnee.x - ankle.x) -
              Math.atan2(knee.y - ankle.y, knee.x - ankle.x)) *
              (180 / Math.PI);
          trunkLean =
            360 -
            (Math.atan2(sHip.y - hip.y, sHip.x - hip.x) -
              Math.atan2(shoulder.y - hip.y, shoulder.x - hip.x)) *
              (180 / Math.PI);
          break;
        case "right":
          knee = poses[0].pose.rightKnee;
          hip = poses[0].pose.rightHip;
          ankle = poses[0].pose.rightAnkle;
          shoulder = poses[0].pose.rightShoulder;
          anKnee = { x: knee.x, y: ankle.y };
          sHip = { x: shoulder.x, y: hip.y };
          kneeFlexion =
            360 -
            (Math.atan2(ankle.y - knee.y, ankle.x - knee.x) -
              Math.atan2(hip.y - knee.y, hip.x - knee.x)) *
              (180 / Math.PI);
          hipFlexion =
            (Math.atan2(knee.y - hip.y, knee.x - hip.x) -
              Math.atan2(shoulder.y - hip.y, shoulder.x - hip.x)) *
            (180 / Math.PI);
          dorsiflexion =
            (Math.atan2(anKnee.y - ankle.y, anKnee.x - ankle.x) -
              Math.atan2(knee.y - ankle.y, knee.x - ankle.x)) *
            (180 / Math.PI);
          trunkLean =
            (Math.atan2(sHip.y - hip.y, sHip.x - hip.x) -
              Math.atan2(shoulder.y - hip.y, shoulder.x - hip.x)) *
            (180 / Math.PI);
      }
    }
  });

  // Hide the video element, and just show the canvas
  video.hide();

  textFont("Open Sans");
  textSize(22);

  button1 = createButton('<i class="fas fa-sync-alt"></i> Switch Sides');
  button1.parent("switchButtonContainer");
  button1.id("switchButton");
  button1.class(
    "rounded-full bg-white py-3 px-5 mx-3 shadow-lg hover:text-gray-900 border-2 border-white hover:border-gray-500"
  );
  button1.mousePressed(switchSides);

  button4 = createButton('<i class="fas fa-sync-alt"></i> Reset');
  button4.parent("resetButtonContainer");
  button4.id("resetButton");
  button4.class(
    "rounded-full py-1 px-4 hover:text-gray-900 font-semibold text-sm border-2 border-gray-500 hover:border-gray-500 hover:bg-white shadow-md"
  );
  button4.mousePressed(resetMax);
}

function switchSides() {
  switch (side) {
    case "left":
      side = "right";
      select("#sideInstruction").html("right");
      resetMax();
      break;
    case "right":
      side = "left";
      select("#sideInstruction").html("left");
      resetMax();
  }
}

function resetMax() {
  maxKneeFlexion = 180;
  maxHipFlexion = 180;
  maxDorsiflexion = 180;
  maxTrunkLean = 180;

  logs.innerHTML = "";
  recommendations.innerHTML = "";

  select("#kneeFlexion").html("-");
  select("#hipFlexion").html("-");
  select("#shinAngle").html("-");
  select("#trunkAngle").html("-");

  generateAlternativeExercisesRecommendations();
}

function modelReady() {
  generateAlternativeExercisesRecommendations();

  select("#status").style("color", "#4A5568");
  select("#status").html(
    'Ready! <i class="fas fa-check-circle" style="color:#4A5568;"></i>'
  );
  logs = document.querySelector(".logs");
  recommendations = document.querySelector(".alternatives");
}

function draw() {
  clear();
  image(video, 0, 0, width, height);

  fill("white");
  strokeWeight(0);
  stroke("#A0AEC0");
  rectMode(CENTER);
  rect(45, 24, 60, 25, 15);

  fill("#4A5568");
  noStroke();
  textSize(12);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textFont("sans-serif");
  displaySide = side.toUpperCase();
  text(displaySide, 45, 25);

  // We can call both functions to draw all keypoints and the skeletons
  drawKeypoints();
  drawSkeleton();

  if (poses.length > 0) {
    // draws the angles as they happen over the video feed
    fill("#FFFFFF");
    text(Math.round(kneeFlexion) + "°", knee.x + 20, knee.y + 10);
    text(Math.round(hipFlexion) + "°", hip.x + 20, hip.y + 10);
    text(Math.round(dorsiflexion) + "°", ankle.x + 20, ankle.y + 10);
    text(Math.round(trunkLean) + "°", shoulder.x + 20, shoulder.y + 10);

    // updates the max numbers reached if they are exceeded at any time
    // then replaces the connected HTML span with the new max number
    if ((knee.confidence > 0.5) & (kneeFlexion > 20) & (kneeFlexion <= 180)) {
      if (currentMinKneeFlexion > kneeFlexion) {
        currentMinKneeFlexion = kneeFlexion;
        midExerciseTime = millis();
      }
      if (kneeFlexion < maxKneeFlexion) {
        maxKneeFlexion = Math.round(kneeFlexion);
        select("#kneeFlexion").html(maxKneeFlexion);
      }

      if ((kneeFlexion <= executionConstraints.frameDepth) & !isSquatting) {
        isSquatting = true;
        startTime = millis();
      }

      if ((kneeFlexion > executionConstraints.frameDepth) & isSquatting) {
        isSquatting = false;
        squatCounter++;

        elapsedTime = millis() - startTime;
        elapsedTimeSeconds = Math.floor(elapsedTime / 1000);
        elapsedTimeMilliseconds = floor((elapsedTime % 1000) / 10);

        validateDepthConstraints();
        validateLeanConstraints();
        validateTimeUnderTensionConstraints();

        // Currently, the metrics are properly calculated when the person is positioned on a side,
        // but in that case, the face keypoints are not accurately detected.
        // validateHeadConstraints();

        logs.innerHTML =
          "<p>Elapsed time: " +
          elapsedTimeSeconds +
          "." +
          elapsedTimeMilliseconds +
          " seconds</p>" +
          logs.innerHTML;
        logs.innerHTML =
          "<br>" +
          '<h2 class="squat-number">Squat number #' +
          squatCounter +
          "</h2>" +
          logs.innerHTML;

        resetConstraintVariables();
      }
    }
    if (
      (hip.confidence > 0.5) &
      (hipFlexion > 20) &
      (hipFlexion < maxHipFlexion)
    ) {
      maxHipFlexion = Math.round(hipFlexion);
      select("#hipFlexion").html(maxHipFlexion);
    }
    if ((ankle.confidence > 0.5) & (dorsiflexion > 20)) {
      if (currentShinFlexion > dorsiflexion) {
        currentShinFlexion = dorsiflexion;
      }
      if (dorsiflexion < maxDorsiflexion) {
        maxDorsiflexion = Math.round(dorsiflexion);
        select("#shinAngle").html(maxDorsiflexion);
      }
    }

    if ((shoulder.confidence > 0.5) & (trunkLean > 20) & (trunkLean <= 90)) {
      if (currentMinLeanFlexion > trunkLean) {
        currentMinLeanFlexion = trunkLean;
      }
      if (trunkLean < maxTrunkLean) {
        maxTrunkLean = Math.round(trunkLean);
        select("#trunkAngle").html(maxTrunkLean);
      }
    }

    if (
      isSquatting & (nose.confidence > 0.75) & (leftEye.confidence > 0.75) &&
      rightEye.confidence > 0.75
    ) {
      const eyeMidPointY = (leftEye.y + rightEye.y) / 2;
      const noseToEyeMidPointY = nose.y - eyeMidPointY;

      console.log(noseToEyeMidPointY);

      // Determine head tilt
      if ((noseToEyeMidPointY > 8) & (currentHeadTilt == 0)) {
        currentHeadTilt = -1; // Head is tilted down
      } else if ((noseToEyeMidPointY < -10) & (currentHeadTilt == 0)) {
        currentHeadTilt = 1; // Head is tilted up
      }
    }
  }
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints() {
  // Loop through all the poses detected
  for (let i = 0; i < poses.length; i++) {
    // For each pose detected, loop through all the keypoints
    let pose = poses[i].pose;
    for (let j = 0; j < pose.keypoints.length; j++) {
      // A keypoint is an object describing a body part (like rightArm or leftShoulder)
      let keypoint = pose.keypoints[j];
      // Only draw an ellipse is the pose probability is bigger than 0.2
      if (keypoint.score > 0.5) {
        push();
        fill("rgba(255,255,255, 0.5)");
        noStroke();
        ellipse(keypoint.position.x, keypoint.position.y, 10, 10);
        pop();
      }
    }
  }
}

// A function to draw the skeletons
function drawSkeleton() {
  // Loop through all the skeletons detected
  for (let i = 0; i < poses.length; i++) {
    let skeleton = poses[i].skeleton;
    // For every skeleton, loop through all body connections
    for (let j = 0; j < skeleton.length; j++) {
      let partA = skeleton[j][0];
      let partB = skeleton[j][1];
      push();
      stroke("rgba(255,255,255, 0.5)");
      strokeWeight(2);
      line(
        partA.position.x,
        partA.position.y,
        partB.position.x,
        partB.position.y
      );
      pop();
    }
  }
}

function validateDepthConstraints() {
  if (currentMinKneeFlexion > executionConstraints.depthSuperiorRange) {
    logs.innerHTML =
      '<p style="color: red;">Your depth is too high, you must go lower!</p>' +
      logs.innerHTML;
  } else if (currentMinKneeFlexion > executionConstraints.depthMediumRange) {
    logs.innerHTML =
      '<p style="color: orange;">Your depth is in a good range, but you might consider going a little lower!</p>' +
      logs.innerHTML;
  } else {
    logs.innerHTML =
      '<p style="color: green;">Perfect depth! Keep it going!</p>' +
      logs.innerHTML;
  }
}

function validateLeanConstraints() {
  if (
    currentMinLeanFlexion < executionConstraints.minimumForwardLeanRange ||
    abs(currentMinLeanFlexion - currentShinFlexion) >
      executionConstraints.forwardLeanRangeDifference
  ) {
    logs.innerHTML =
      '<p style="color: red;">You lean too forward! Straighten your spine!</p>' +
      logs.innerHTML;
  } else if (
    currentMinLeanFlexion > executionConstraints.maximumForwardLeanRange
  ) {
    logs.innerHTML =
      '<p style="color: orange;">Your posture seems too straight! This may be affected by your depth.</p>' +
      logs.innerHTML;
  } else {
    logs.innerHTML =
      '<p style="color: green;">Great posture! Good job!</p>' + logs.innerHTML;
  }
}

function validateHeadConstraints() {
  if (currentHeadTilt == -1) {
    logs.innerHTML =
      '<p style="color: red;">Don\'t look down! Keep your head forward!</p>' +
      logs.innerHTML;
  } else if (currentHeadTilt == 1) {
    logs.innerHTML =
      '<p style="color: orange;">Your head tilt had a good positioning, but maybe looking forward instead of up would be more comfortable for you!</p>' +
      logs.innerHTML;
  } else {
    logs.innerHTML =
      '<p style="color: green;">Your head tilt had a good positioning! Nice!</p>' +
      logs.innerHTML;
  }
}

function validateTimeUnderTensionConstraints() {
  const eccentricElapsedTime = millis() - midExerciseTime;
  if (2 * eccentricElapsedTime > elapsedTime) {
    logs.innerHTML =
      '<p style="color: red;">You are going down too fast! Try to go down slower!</p>' +
      logs.innerHTML;
  } else {
    logs.innerHTML =
      '<p style="color: green;">Great balance between eccentric and concentric phase! Keep it going!</p>' +
      logs.innerHTML;
  }
}

function resetConstraintVariables() {
  currentMinLeanFlexion = 90;
  currentMinKneeFlexion = 180;
  currentShinFlexion = 180;
  currentHeadTilt = 0;
}

function generateAlternativeExercisesRecommendations() {
  // Replace 'YOUR_API_KEY' with your actual OpenAI GPT API key
  const apiKey = "YOUR_API_KEY";
  const prompt =
    "Recommend 5 good alternative exercises similar to squats, as a list from 1 to 5.";

  // Create a list of numbers for the recommendations
  const numbersList = ["1.", "2.", "3.", "4.", "5."];

  // Call the OpenAI GPT-3 API to get exercise recommendations
  fetch("https://api.openai.com/v1/engines/davinci-codex/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      prompt: prompt,
      max_tokens: 50,
      temperature: 0.6,
      n: 5,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      const alternativeExercises = data.choices.map((choice, index) => {
        return numbersList[index] + " " + choice.text.trim();
      });

      // Append the alternative exercises to the inner HTML of an element with id 'recommendations'
      recommendations.innerHTML = alternativeExercises.join("<br>");
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}
