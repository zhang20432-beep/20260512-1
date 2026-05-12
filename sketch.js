let capture;
let handPose;
let hands = [];
let bubbles = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  capture = createCapture(VIDEO);
  
  // 處理攝影機載入失敗的情況
  capture.elt.onerror = (err) => {
    console.error("攝影機載入錯誤:", err);
    noLoop(); // 停止繪製
  };

  capture.size(640, 480); 
  capture.hide(); // 隱藏預設的影片元件

  // 檢查 ml5 是否存在
  if (typeof ml5 === 'undefined') {
    console.error("ml5 函式庫載入失敗，請檢查網路或 index.html 中的連結");
    return;
  }

  // 初始化 ml5 handPose 辨識模型
  handPose = ml5.handPose(capture, { flipped: false }, modelLoaded);
}

function modelLoaded() {
  console.log("模型載入完成");
  // 確保模型載入後才開始偵測，避免 estimateHands 為 null 的錯誤
  handPose.detectStart(capture, (results) => {
    hands = results;
  });
}

function draw() {
  background('#e7c6ff');

  // 1. 在整個畫布置中上方顯示文字
  fill(0);
  noStroke();
  textSize(24);
  textAlign(CENTER, TOP); 
  text("414730514張OO", width / 2, 30);

  // 計算顯示影像的寬高（畫布寬高的 50%）
  let displayW = width * 0.5;
  let displayH = height * 0.5;

  // 檢查攝影機是否準備好，若沒準備好則顯示提示
  if (capture.width === 0) {
    fill(100);
    textAlign(CENTER, CENTER);
    textSize(20);
    text("正在啟動攝影機中...\n(若長時間沒反應，請檢查瀏覽器權限或使用 Live Server)", width / 2, height / 2);
    return;
  }

  push();
  translate(width / 2, height / 2); // 移動到畫布中心
  scale(-1, 1); // 水平翻轉達成鏡像效果
  imageMode(CENTER);
  image(capture, 0, 0, displayW, displayH); // 繪製攝影機影像

  // 2. 如果辨識到手部，繪製點、線與產生水泡
  if (hands.length > 0) {
    for (let hand of hands) {
      // 繪製手指間的連線 (骨架)
      stroke(255);
      strokeWeight(2);
      let connections = [
        [0, 1, 2, 3, 4],     // 大拇指
        [0, 5, 6, 7, 8],     // 食指
        [0, 9, 10, 11, 12],  // 中指
        [0, 13, 14, 15, 16], // 無名指
        [0, 17, 18, 19, 20], // 小指
        [5, 9, 13, 17]       // 掌心連線
      ];
      for (let chain of connections) {
        for (let i = 0; i < chain.length - 1; i++) {
          let p1 = hand.keypoints[chain[i]];
          let p2 = hand.keypoints[chain[i+1]];
          let x1 = map(p1.x, 0, capture.width, -displayW / 2, displayW / 2);
          let y1 = map(p1.y, 0, capture.height, -displayH / 2, displayH / 2);
          let x2 = map(p2.x, 0, capture.width, -displayW / 2, displayW / 2);
          let y2 = map(p2.y, 0, capture.height, -displayH / 2, displayH / 2);
          line(x1, y1, x2, y2);
        }
      }

      // 繪製關鍵點與產生水泡
      for (let i = 0; i < hand.keypoints.length; i++) {
        let kp = hand.keypoints[i];
        let x = map(kp.x, 0, capture.width, -displayW / 2, displayW / 2);
        let y = map(kp.y, 0, capture.height, -displayH / 2, displayH / 2);
        
        fill(255, 255, 0); // 黃色小圓圈
        noStroke();
        circle(x, y, 8);

        // 在指尖位置 (4, 8, 12, 16, 20) 產生水泡
        if ([4, 8, 12, 16, 20].includes(i)) {
          if (frameCount % 5 === 0) { // 控制水泡產生頻率
            bubbles.push(new Bubble(x, y));
          }
        }
      }
    }
  }

  // 3. 更新並繪製所有水泡
  for (let i = bubbles.length - 1; i >= 0; i--) {
    bubbles[i].update();
    bubbles[i].display();
    // 如果水泡跑出影像上方或壽命結束，則移除（破掉）
    if (bubbles[i].isFinished(displayH)) {
      bubbles.splice(i, 1);
    }
  }

  pop();
}

// 水泡類別
class Bubble {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = random(5, 15);
    this.speedY = random(1, 3);
    this.alpha = 200;
  }

  update() {
    this.y -= this.speedY; // 往上串升
    this.alpha -= 1.5;     // 逐漸變透明
  }

  display() {
    stroke(255, this.alpha);
    strokeWeight(1);
    fill(255, 255, 0, this.alpha * 0.5); // 半透明黃色
    circle(this.x, this.y, this.size);
  }

  isFinished(imgH) {
    // 當水泡太透明，或超過中央影像範圍上方一定距離時視為破掉
    return this.alpha < 0 || this.y < -imgH / 2 - 20;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
