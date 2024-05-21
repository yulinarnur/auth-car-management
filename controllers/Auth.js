import Users from "../models/UserModel.js";
import argon2 from "argon2";
import jwt from "jsonwebtoken";

export const Login = async (req, res) => {
  const user = await Users.findOne({
    where: {
      email: req.body.email,
    },
  });
  if (!user) return res.status(404).json({ msg: "Email tidak ditemukan" });
  const match = await argon2.verify(user.password, req.body.password);
  if (!match) return res.status(400).json({ msg: "Wrong Password" });
  req.session.userId = user.uuid;
  const uuid = user.uuid;
  const name = user.name;
  const email = user.email;
  const role = user.role;
  const accessToken = jwt.sign(
    { uuid, name, email, role },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "40s",
    }
  );
  const refreshToken = jwt.sign(
    { uuid, name, email, role },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "1d",
    }
  );
  await Users.update(
    { refresh_token: refreshToken },
    {
      where: {
        uuid: uuid,
      },
    }
  );
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({ accessToken });
  // res.status(200).json({ uuid, name, email, role });
};

export const Me = async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ msg: "Mohon login ke akun Anda!" });
  }
  const user = await Users.findOne({
    attributes: ["uuid", "name", "email", "role"],
    where: {
      uuid: req.session.userId,
    },
  });
  if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });
  res.status(200).json(user);
};

export const logOut = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(204);
  const user = await Users.findAll({
    where: {
      refresh_token: refreshToken,
    },
  });
  if (!user) return res.sendStatus(204);
  const userId = user.id;
  await Users.update(
    { refresh_token: null },
    {
      where: {
        id: userId,
      },
    }
  );
  res.clearCookie("refreshToken");
  return res.sendStatus(200);
  // req.session.destroy((err) => {
  //   if (err) return res.status(400).json({ msg: "Tidak dapat logout" });
  //   res.status(200).json({ msg: "Anda telah logout" });
  // });
};