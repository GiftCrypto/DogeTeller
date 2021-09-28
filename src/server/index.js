const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const cors = require("cors");
const {userSchema} = require("./model/schemas");
const users = require("./routes/users");

const UserModel = mongoose.model("User", userSchema);

passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await UserModel.findOne({email: username}).exec();
      if (!user) {
        return done(null, false)
      } else {
        const res = await bcrypt.compare(password, user.passwordHash);
        return done(null, res);
      }
    } catch(err) {
      done(err);
    }
  }
));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());
const port = 5000;

// register API routes
app.use("/users", users);

mongoose.connect("mongodb://localhost:27018/tipdoge");
const db = mongoose.connection;

db.on("error", (err) => {
  console.error(err);
  console.log("Failed to connect to database!");
})

db.on("open", () => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});
