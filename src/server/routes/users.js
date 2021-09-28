const express = require("express");
const passport = require("passport");
const mongoose = require("mongoose");
const Validator = require("jsonschema").Validator;
const bcrypt = require("bcrypt");
const {userSchema} = require("../model/schemas");
const {registerUserSchema} = require("../../common/Schemas");
const errorMessages = require("./errorMessages");

const router = express.Router();

const UserModel = mongoose.model("User", userSchema);

const v = new Validator();

router.post("/login",
    passport.authenticate("local", {session: false}),
    (req, res) => {
      res.json({
        msg: "hello"
      });
    }
);

router.post("/register", 
    async (req, res) => {
      const params = {
        email: req.body.email,
        password: req.body.password,
      };
      /* eslint-disable */
      const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      /* eslint-enable */
      const validEmail = re.test(String(params.email).toLowerCase());
      const validate = v.validate(params, registerUserSchema);
      if (!validEmail || !validate.valid) {
        res.status(400).json({
          error: errorMessages.BAD_ARGS,
        });
      } else {
        const passwordHash = await bcrypt.hash(params.password, 10);
        const user = new UserModel({
          email: params.email,
          passwordHash,
        });
        try {
          const saved = await user.save();
          res.status(200).json({
            success: saved ? true : false,
          });
        } catch (error) {
          // errors with code 11000 can be ignored
          if (error.code !== 11000) {
            console.error(error);
          }
          res.status(200).json({
            success: false,
          });
        }
      }
    }
);

module.exports = router;
