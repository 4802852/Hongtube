const videoContainer = document.getElementById("videoContainer");
const form = document.getElementById("commentForm");
const textarea = form.querySelector("textarea");
const btn = form.querySelector("button");

const handleSubmit = (event) => {
  event.preventDefault();
  const text = textarea.value;
  const video = videoContainer.dataset.id;
};

// 다른 event 와 다르게 form의 submit 이벤트를 확인하여 handleSubmit 진행
form.addEventListener("submit", handleSubmit);
