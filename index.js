//1.Import and configure package modulesat the top of the file
const mysql = require("mysql2");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const app = express();

const connection = mysql.createConnection({
  host: "localhost",
  database: "chamaos",
  user: "root",
  password: "sonnie2006.",
  port: 3306,
});
//2. Register middleware functions to handle incoming requests and responses
app.use(
  session({
    secret: "encryptionKey",
    resave: false,
    saveUninitialized: true,
    options: { secure: true, expires: new Date(Date.now() + 60 * 60 * 1000) }, //expires in 1 hour
  }),
);
let isLoggedIn;
let loggedInUser;
const privateRoutes = ["/admin/dashboard", "/member/profile", "/home"];
app.use((req, res, next) => {
  console.log("Middleware function executed!");
  if (req.session.user) {
    isLoggedIn = true;
    loggedInUser = req.session.user;
  } else {
    isLoggedIn = false;
  }
  if (isLoggedIn || !privateRoutes.includes(req.path)) {
    next();
  } else {
    res.status(401).render("pages/user/401.ejs");
  }
});
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies (form data)
app.use(express.static("public")); // serve static assets (CSS, images, JS)
//3. Register routes/pages/endpoint handlers
app.get("/", (req, res) => {
  res.render("pages/user/landingpage.ejs");
});

app.get("/landing page", (req, res) => {
  res.render("pages/user/landingpage.ejs");
});

app.get("/services", (req, res) => {
  res.render("pages/user/services.ejs");
});

app.get("/home", (req, res) => {
  res.render("pages/member/home.ejs");
});

app.get("/signup", (req, res) => {
  res.render("pages/user/signup.ejs");
});

app.post("/signup", (req, res) => {
  const saltRounds = 10;
  bcrypt.hash(req.body.password, saltRounds, (hashError, hash) => {
    if (hashError) {
      console.log("Error hashing password: " + hashError.message);
      res.status(500).render("pages/user/500.ejs");
    } else {
      const insertStatement = `INSERT INTO users (full_name, phone_number, email, gender, location, password_hash, user_type) VALUES
('${req.body.fullname}', '${req.body.phone}', '${req.body.email}', '${req.body.gender}', '${req.body.location}', '${hash}', 'member')`;

      connection.query(insertStatement, (insertError) => {
        if (insertError) {
          console.log("Error inserting user: " + insertError.message);
          res.status(500).render("pages/user/500.ejs");
        } else {
          res.redirect("/login");
        }
      });
    }
  });
});

app.get("/login", (req, res) => {
  res.render("pages/user/login.ejs");
});

app.post("/auth", (req, res) => {
  console.log(req.body);
  connection.query(
    `SELECT * FROM users WHERE email = '${req.body.email}'`,
    (dbError, queryResult) => {
      if (dbError) {
        console.log("DB error occurred: " + dbError.message);
        res.status(500).render("pages/user/500.ejs");
      } else {
        if (queryResult.length > 0) {
          bcrypt.compare(
            req.body.password,
            queryResult[0].password_hash,
            (compareError, isMatch) => {
              if (compareError) {
                console.log(
                  "Error comparing passwords: " + compareError.message,
                );
                res.status(500).render("pages/user/500.ejs");
              } else if (isMatch) {
                req.session.user = queryResult[0];
                res.redirect("/home");
              } else {
                res.send("Invalid email or password");
              }
            },
          );
        } else {
          res.send("Invalid email or password");
        }
      }
    },
  );
});

app.get("/dashboard", (req, res) => {
  res.render("pages/admin/dashboard.ejs");
});

//404 Handler - This should be the last route handler to catch all unmatched routes
app.use((req, res) => {
  res.status(404).render("pages/user/404.ejs");
});

//4. Start the server and listen for incoming requests
app.listen(3002, () => {
  console.log("Server running on port 3002");
});

//look at bcrypt to hash and encrypt passwords before storing them in the database.
