import { Router } from "itty-router";
import loginRoute from "./login";
import attendanceRoute from "./attendance";
import authCheckRoute from "./authcheck";

const router = Router();
router.get("/login", loginRoute);
router.get("/attendance", attendanceRoute);
router.get("/authcheck", authCheckRoute);

/*
This is the last route we define, it will match anything that hasn't hit a route we've defined
above, therefore it's useful as a 404 (and avoids us hitting worker exceptions, so make sure to include it!).
Visit any page that doesn't exist (e.g. /foobar) to see it in action.
*/
router.all("*", () => new Response("404, not found!", { status: 404 }));

export default {
  async fetch(request, env, ctx) {
    let resp = await router.handle(request);
    // const newResponse = new Response(resp.body, resp);
    resp.headers.append("Access-Control-Allow-Origin", "*");
    return resp;
  },
};
