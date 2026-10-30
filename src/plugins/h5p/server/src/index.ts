import controllers from "./controllers";
import routes from "./routes";
import services from "./services";
import middlewares from "./middlewares";
import bootstrap from "./bootstrap";
import register from "./register";

const config = {
  default: {},
  validator() {},
};

const index = {
  register,
  bootstrap,
  config,
  controllers,
  routes,
  services,
  middlewares,
};
export default index;
