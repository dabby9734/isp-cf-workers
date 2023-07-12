const { parse } = require("node-html-parser");

export default async function examRoutes(req, env) {
  const { searchParams } = new URL(req.url);
  const session = searchParams.get("session");
  const session_cookie_suffix = searchParams.get("sess_suffix");
  const id = searchParams.get("id");

  if (!session || !session_cookie_suffix) {
    return new Response("missing-params", { status: 400 });
  }

  const response = await fetch(
    `https://isp.hci.edu.sg/students/exams.asp?exam=${id}`,
    {
      headers: {
        cookie: `ASPSESSIONID${session_cookie_suffix}=${session}`,
      },
    }
  ).catch((err) => {
    return new Response("internal-server-error", { status: 500 });
  });

  const response_text = await response.text();
  const iembHTML = parse(response_text);

  const needsLogin = iembHTML.querySelector('form[name="loginform"]');
  if (needsLogin) {
    return new Response("refresh-token", { status: 401 });
  }
  if (response.status === 200) {
    const examIds = iembHTML.querySelectorAll("#exam>option");
    const exams = [];
    examIds.forEach((examId) => {
      const examData = {
        exam_id: examId.getAttribute("value"),
        exam_name: examId.text,
      };
      exams.push(examData);
    });

    const examTableRows = iembHTML.querySelectorAll(
      'tr[onmouseover="ToggleTR(this)"]'
    );
    const examResults = [];

    if (examTableRows) {
      examTableRows.forEach((row) => {
        const examRow = row.querySelectorAll("td");
        const examData = {
          subject: examRow[1].text,
          mark: examRow[2].text,
          grade: examRow[3].text,
        };
        examResults.push(examData);
      });
    }

    const result = {
      exams: exams,
      exam_results: examResults,
    };

    return new Response(JSON.stringify(result), { status: 200 });
  } else {
    return new Response("internal-server-error", { status: 500 });
  }
}
