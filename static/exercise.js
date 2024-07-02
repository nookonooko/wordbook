const showAnswerButton = document.getElementById("show-answer-button");
const answer = document.getElementById("answer");

showAnswerButton.onclick = () => {
  answer.style.display = "block";
  showAnswerButton.style.display = "none";
};
