const { parse } = require("node-html-parser");

function stringifyStatus(status) {
  let status_string = "";
  const statuses = status.split(",");
  statuses.forEach((status) => {
    status_string += `&status=${status}`;
  });
  return status_string;
}

function pretty_date(date_string) {
  // given a string like "DD/MM/YYYY", return a string like "Tue, 6 Feb, 2023"
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var dateParts = date_string.split("/");
  // month is 0-based, that's why we need dataParts[1] - 1
  const date = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
  return `${days[date.getDay()]} ${date.getDate()} ${
    months[date.getMonth()]
  }, ${date.getFullYear()}`;
}

export default async function attendanceRoute(req, env) {
  const { searchParams } = new URL(req.url);
  const session = searchParams.get("session");
  const StartDate = searchParams.get("start"); // YYYY-MM-DD
  const EndDate = searchParams.get("end"); // YYYY-MM-DD
  const rankby = searchParams.get("rankby"); // type, date
  const status = searchParams.get("status"); // 1, 5, 15, 10, 14 comma seperated (can have more than one)

  if (!session || !StartDate || !EndDate || !rankby) {
    return new Response("missing-params", { status: 400 });
  }
  if (rankby !== "type" && rankby !== "date") {
    return new Response("invalid-rankby", { status: 400 });
  }

  let base_url = "https://isp.hci.edu.sg/students/attendance.asp";
  let request_url = `${base_url}?StartDate=${StartDate}&EndDate=${EndDate}&ranktype=${rankby}${stringifyStatus(
    status
  )}`;
  const response = await fetch(request_url, {
    headers: {
      cookie: "ASPSESSIONIDCUCTCBAD=" + session,
    },
  }).catch((err) => {
    return new Response("internal-server-error", { status: 500 });
  });

  const response_text = await response.text();
  const iembHTML = parse(response_text);

  const needsLogin = iembHTML.querySelector('form[name="loginform"]');
  if (needsLogin) {
    return new Response("refresh-token", { status: 401 });
  }

  const attendanceTableRows = iembHTML.querySelectorAll(
    'tr[onmouseover="ToggleTR(this)"]'
  );
  const attendance = [];
  attendanceTableRows.forEach((row) => {
    const attendanceRow = row.querySelectorAll("td");
    const attendanceData = {
      pretty_date: pretty_date(attendanceRow[1].text),
      date: attendanceRow[1].text,
      weekday: attendanceRow[2].text,
      status: attendanceRow[3].text,
      updated_by: attendanceRow[6].text,
    };
    attendance.push(attendanceData);
  });
  console.log(request_url);

  return new Response(JSON.stringify(attendance), response);
}
