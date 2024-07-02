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

const exerciseTemplate = fs.readFileSync("./templates/exercise.html", "utf-8");
app.get("/exercise", async (request, response) => {
  const card = await prisma.card.findFirst({
    where: { id: { gte: parseInt(request.query.index) || 0 } },
    orderBy: { id: "asc" },
  });
  const previousCard = await prisma.card.findFirst({
    where: { id: { lt: card.id } },
    orderBy: { id: "desc" },
  });
  const nextCard = await prisma.card.findFirst({
    where: { id: { gt: card.id } },
    orderBy: { id: "asc" },
  });
  let controlsHtml = "";
  if (previousCard !== null) {
    controlsHtml += `<a href="/exercise?index=${previousCard.id}">前へ</a>`;
  }
  if (nextCard !== null) {
    controlsHtml += `<a href="/exercise?index=${nextCard.id}">次へ</a>`;
  }
  const html = exerciseTemplate
    .replace("<!-- question -->", card.question)
    .replace("<!-- answer -->", card.answer)
    .replace("<!-- controls -->", controlsHtml);
  response.send(html);
});

app.post("/create", async (request, response) => {
  await prisma.card.create({
    data: { question: request.body.question, answer: request.body.answer },
  });
  response.redirect("/");
});

app.post("/delete", async (request, response) => {
  await prisma.card.delete({ where: { id: parseInt(request.body.id) } });
  response.redirect("/");
});

app.listen(3000);
