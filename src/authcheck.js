const { parse } = require("node-html-parser");

export default async function authCheckRoute(req, env) {
  const { searchParams } = new URL(req.url);
  const session = searchParams.get("session");
  const session_cookie_suffix = searchParams.get("sess_suffix");

  if (!session || !session_cookie_suffix) {
    return new Response("missing-params", { status: 400 });
  }

  const response = await fetch("https://isp.hci.edu.sg/index.asp?", {
    headers: {
      cookie: `ASPSESSIONID${session_cookie_suffix}=${session}`,
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
  if (response.status === 200) {
    return new Response("valid-token", { status: 200 });
  } else {
    return new Response("internal-server-error", { status: 500 });
  }
}
