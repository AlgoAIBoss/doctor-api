const express = require("express");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const bodyParser = require("body-parser");
const swaggerUI = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

// Additional utils
const globalErrorHandler = require("./controllers/ErrorController");
const UserRouter = require("./routes/UserRoute");
const DoctorRouter = require("./routes/DoctorRoute");

// 1) INIT FUNCTIONS
const app = express();
app.enable("trust proxy");

// Swagger Doc
app.use("/", swaggerUI.serve);
app.get("/", swaggerUI.setup(swaggerDocument));

// 2) BADY PARSERS
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// 3) ROUTES
app.use("/api/v1/user", UserRouter);
app.use("/api/v1/doctor", DoctorRouter);

// app.all("*", (req, res, next) => {
//     next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
//   });

app.use(globalErrorHandler);
module.exports = app;
