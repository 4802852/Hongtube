import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

const startBtn = document.getElementById("startBtn");
const video = document.getElementById("preview");

let stream;
let recorder;
let videoFile;
let videoTimeOut = null;

const files = {
  input: "recording.webm",
  output: "output.mp4",
  thumb: "thumbnail.jpg",
};

const downloadFile = (fileUrl, filename) => {
  const a = document.createElement("a");
  a.href = fileUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
};

const handleDownload = async () => {
  // 중복 실행 방지
  startBtn.removeEventListener("click", handleDownload);
  startBtn.innerText = "Transcoding...";
  startBtn.disabled = true;
  // load FFmpeg
  const ffmpeg = createFFmpeg({ log: true });
  await ffmpeg.load();
  // create virtual recording file in FFmpeg
  ffmpeg.FS("writeFile", files.input, await fetchFile(videoFile));
  // transcode video from webm to mp4
  await ffmpeg.run("-i", files.input, "-r", "60", files.output);
  // make thumbnail : "recording.webm" 파일의 "00:00:01"로 이동(-ss) 하여 "1" 개의 프레임을 "thumna2il.jpg" 파일로 저장(-frames:v)
  await ffmpeg.run(
    "-i",
    files.input,
    "-ss",
    "00:00:01",
    "-frames:v",
    "1",
    files.thumb
  );
  // get output.mp4 file from FFmpeg
  const mp4File = ffmpeg.FS("readFile", files.output);
  const mp4Blob = new Blob([mp4File.buffer], { type: "video/mp4" });
  const mp4Url = URL.createObjectURL(mp4Blob);
  // get thumbnail.jpg file from FFmpeg
  const thumbFile = ffmpeg.FS("readFile", files.thumb);
  const thumbBlob = new Blob([thumbFile.buffer], { type: "image/jpg" });
  const thumbUrl = URL.createObjectURL(thumbBlob);
  // download video
  // const a = document.createElement("a");
  // a.href = mp4Url;
  // a.download = "MyRecording.mp4";
  // document.body.appendChild(a);
  // a.click();
  downloadFile(mp4Url, "MyRecording.mp4");
  // download thumbnail
  // const thumbA = document.createElement("a");
  // thumbA.href = thumbUrl;
  // thumbA.download = "MyThumbnail.jpg";
  // document.body.appendChild(thumbA);
  // thumbA.click();
  downloadFile(thumbUrl, "MyThumbnail.jpg");
  // FFmpeg FS unlink
  ffmpeg.FS("unlink", files.input);
  ffmpeg.FS("unlink", files.output);
  ffmpeg.FS("unlink", files.thumb);
  // ObjectUrl 삭제
  URL.revokeObjectURL(mp4Url);
  URL.revokeObjectURL(thumbUrl);
  URL.revokeObjectURL(videoFile);
  // 버튼 Change
  startBtn.addEventListener("click", handleStart);
  startBtn.innerText = "Record Again";
  startBtn.disabled = false;
};

const handleStop = () => {
  if (videoTimeOut) {
    clearTimeout(videoTimeOut);
    videoTimeOut = null;
  }
  startBtn.innerText = "Download Recording";
  startBtn.removeEventListener("click", handleStop);
  startBtn.addEventListener("click", handleDownload);
  recorder.stop();
};

const handleStart = () => {
  startBtn.innerText = "Stop Recording";
  startBtn.removeEventListener("click", handleStart);
  startBtn.addEventListener("click", handleStop);
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (event) => {
    videoFile = URL.createObjectURL(event.data);
    video.srcObject = null;
    video.src = videoFile;
    video.loop = true;
    video.play();
  };
  recorder.start();
  videoTimeOut = setTimeout(() => {
    handleStop();
  }, 5000);
};

const init = async () => {
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { width: 512, height: 288 },
  });
  video.srcObject = stream;
  video.play();
};

init();
startBtn.addEventListener("click", handleStart);
