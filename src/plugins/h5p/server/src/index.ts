import h5pStaticMiddleware from "./middlewares/h5p-static";
import controller from "./controllers/h5p";
import routes from "./routes";
import service from "./services/h5p";
import bootstrap from "./bootstrap";
import register from "./register";

const config = {
  default: {},
  validator() {},
};

const policies = {};
const middlewares = {
  "h5p-static": h5pStaticMiddleware,
};
const services = { service };
const controllers = { controller };

const index = {
  register,
  bootstrap,
  config,
  controllers,
  routes,
  services,
  contentTypes: {},
  policies,
  middlewares,
};
export default index;
