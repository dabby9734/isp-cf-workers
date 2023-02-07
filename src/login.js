function stringifyPostData(data) {
  var postData = [];
  for (var property in data) {
    var encodedKey = encodeURIComponent(property);
    var encodedValue = encodeURIComponent(data[property]);
    postData.push(encodedKey + "=" + encodedValue);
  }
  postData = postData.join("&");
  return postData;
}

export default async function loginRoute(req, env) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const pw = searchParams.get("pw");

  if (!id || !pw) {
    return new Response("missing-credentials", { status: 400 });
  }

  const response = await fetch("https://isp.hci.edu.sg").catch((err) => {
    return new Response("internal-server-error", { status: 500 });
  });

  if (!response.ok) {
    return new Response("internal-server-error", { status: 500 });
  }

  const cookie_regex_match = response.headers
    .get("set-cookie")
    .match(/ASPSESSIONID([A-Z]+)=([A-Z]+);/);

  if (!cookie_regex_match) {
    return new Response("internal-server-error", { status: 500 });
  }
  const session_cookie_suffix = cookie_regex_match[1];
  const session_cookie = cookie_regex_match[2];

  const pwd_payload = btoa(pw);
  const login_req_data = {
    w: "30",
    x: id,
    y: "95c1003a9efb919d164f427468b3ca55",
    z: "0.2144739",
    Remember: "0",
    URL: "/index.asp?",
    v: pwd_payload,
  };
  const postData = stringifyPostData(login_req_data);
  const login_req_headers = {
    accept: "*/*",
    "Accept-Encoding": "gzip, deflate, br",
    "content-type": "application/x-www-form-urlencoded",
    cookie: `ASPSESSIONID${session_cookie_suffix}=${session_cookie}`,
    host: "isp.hci.edu.sg",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:99.0) Gecko/20100101 Firefox/99.0",
  };
  const login_response = await fetch("https://isp.hci.edu.sg/pwd_auth.asp", {
    method: "POST",
    headers: login_req_headers,
    body: postData,
    redirect: "manual",
  }).catch((err) => {
    return new Response("internal-server-error", { status: 500 });
  });

  const login_response_text = await login_response.text();
  if (login_response_text.includes("/error700.asp")) {
    return new Response("invalid-credentials", { status: 401 });
  } else if (login_response.status === 302) {
    return new Response(
      JSON.stringify({
        suffix: session_cookie_suffix,
        session: session_cookie,
      }),
      {
        status: 200,
      }
    );
  } else {
    return new Response("internal-server-error", { status: 500 });
  }
}
