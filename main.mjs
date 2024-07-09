import fs from "node:fs";
import express from "express";
import { PrismaClient } from "@prisma/client";
import escapeHTML from "escape-html";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static("static"));
const prisma = new PrismaClient();

const indexTemplate = fs.readFileSync("./templates/index.html", "utf-8");
app.get("/", async (request, response) => {
  const cards = await prisma.card.findMany();
  const html = indexTemplate.replace(
    "<!-- cards -->",
    cards
      .map(
        (card) => `
          <tr>
            <td>${escapeHTML(card.question)}</td>
            <td>${escapeHTML(card.answer)}</td>
            <td>${escapeHTML(card.star)}</td>
            <td>
              <form action="/delete" method="post">
                <input type="hidden" name="id" value="${card.id}" />
                <button type="submit">削除</button>
              </form>
            </td>
          </tr>
        `,
      )
      .join(""),
  );
  response.send(html);
});

const exerciseTemplateExercise = fs.readFileSync("./templates/exercise.html", "utf-8");
const exerciseTemplateExerciseSelect = fs.readFileSync("./templates/exerciseselect.html", "utf-8");

app.get("/exerciseselect", async(request, response) => {
  response.send(exerciseTemplateExerciseSelect);
  // response.redirect("/exercise");
 
})

app.post("/exercise", async (request, response) => {
  // カードが存在しない場合は, 元のページにリダイレクト
  const cardCount = await prisma.card.count();
  if (cardCount === 0) {
    response.redirect("/");
    return;
  }
  const selectedstar = parseInt(request.body.star);

  const card = await prisma.card.findFirst({
    where: { 
      id: { gte: parseInt(request.query.index) || 0 } , 
      star : selectedstar
    },
    orderBy: { id: "asc" },
  });
  const previousCard = await prisma.card.findFirst({
    where: { 
      id: { lt: card.id },
      star : selectedstar
    },
    orderBy: { id: "desc" },
  });
  const nextCard = await prisma.card.findFirst({
    where: { 
      id: { gt: card.id },
      star : selectedstar
    },
    orderBy: { id: "asc" },
  });


  let controlsHtml = "";
  if (previousCard !== null) {
    // controlsHtml += `<a href="/exercise?index=${previousCard.id}&star=${selectedstar}">前へ</a>`;
    controlsHtml +=`<a href="#" onclick="sendPostRequest(${previousCard.id}, ${selectedstar}); return false;">前へ</a>`;
  }
  if (nextCard !== null) {
    // controlsHtml += `<a href="/exercise?index=${nextCard.id}&star=${selectedstar}">次へ</a>`;
    controlsHtml +=`<a href="#" onclick="sendPostRequest(${nextCard.id}, ${selectedstar}); return false;">次へ</a>`;
  }
  if (controlsHtml !== "") {
    controlsHtml = `<h2>操作</h2>` + controlsHtml;
  }

  const html = exerciseTemplateExercise
    .replace("<!-- question -->", card.question)
    .replace("<!-- answer -->", card.answer)
    .replace("<!-- star -->", card.star)
    .replace("<!-- controls -->", controlsHtml);
  response.send(html);
});

app.use("/create", async (request, response) => {
  await prisma.card.create({
    data: { question: request.body.question, answer: request.body.answer, star: parseInt(request.body.star, 10)},
  });
  response.redirect("/");
});

app.post("/delete", async (request, response) => {
  await prisma.card.delete({ where: { id: parseInt(request.body.id) } });
  response.redirect("/");
});

app.listen(3000);
