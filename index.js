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
const publicRoutes = [
  "/",
  "/landing page",
  "/services",
  "/about",
  "/signup",
  "/login",
  "/join",
];
const adminRoutes = [
  "/admin/dashboard",
  "/admin/groups-users",
  "/admin/billing-config",
  "/admin/content-support",
  "/admin/security-analytics",
];
const memberRoutes = [
  "/member/memberdashboard",
  "/member/contributions",
  "/member/loans",
  "/member/meetings",
  "/member/group",
  "/member/profile",
];
const treasurerRoutes = [
  "/treasurer/dashboard",
  "/treasurer/contributions",
  "/treasurer/loans",
  "/treasurer/members",
  "/treasurer/reconciliation",
  "/treasurer/reports",
  "/treasurer/settings",
];
const secretaryRoutes = [
  "/secretary/dashboard",
  "/secretary/meetings",
  "/secretary/documents",
  "/secretary/communications",
  "/secretary/member-records",
  "/secretary/calendar",
];
const chairpersonRoutes = [
  "/chairperson/dashboard",
  "/chairperson/members",
  "/chairperson/governance",
  "/chairperson/meetings",
  "/chairperson/welfare",
  "/chairperson/reports",
];
const privateRoutes = [
  ...adminRoutes,
  ...memberRoutes,
  ...treasurerRoutes,
  ...secretaryRoutes,
  ...chairpersonRoutes,
];

function requireRoles(allowedRoles) {
  return (req, res, next) => {
    const currentRole = req.session.role || req.session.user?.role;

    if (!req.session.user) {
      return res.status(401).render("pages/user/401.ejs");
    }

    if (!allowedRoles.includes(currentRole)) {
      return res.status(401).render("pages/user/401.ejs");
    }

    next();
  };
}

app.use((req, res, next) => {
  if (req.session.user || !privateRoutes.includes(req.path)) {
    next();
  } else {
    res.status(401).render("pages/user/401.ejs");
  }
});
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies (form data)
app.use(express.static("public")); // serve static assets (CSS, images, JS)

app.use(
  "/member",
  requireRoles(["member", "secretary", "treasurer", "chairperson"]),
);
app.use("/secretary", requireRoles(["secretary"]));
app.use("/treasurer", requireRoles(["treasurer"]));
app.use("/chairperson", requireRoles(["chairperson"]));
app.use("/admin", requireRoles(["admin"]));

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

app.get("/about", (req, res) => {
  res.render("pages/user/about.ejs");
});

app.get("/signup", (req, res) => {
  res.render("pages/user/signup.ejs");
});

app.post("/signup", (req, res) => {
  const {
    chama_name,
    invite_code,
    description,
    meeting_day,
    contribution_amount,
    currency,
    chair_fullname,
    chair_phone,
    chair_email,
    chair_password,
  } = req.body;

  bcrypt.hash(chair_password, 10, (hashError, hash) => {
    if (hashError) {
      console.log("Error hashing password: " + hashError.message);
      return res.status(500).render("pages/user/500.ejs");
    }

    // Step 1: Create the Chama
    connection.query(
      "INSERT INTO Chama (chama_name, invite_code, description, meeting_day, contribution_amount, currency) VALUES (?, ?, ?, ?, ?, ?)",
      [
        chama_name,
        invite_code,
        description || null,
        meeting_day,
        contribution_amount,
        currency,
      ],
      (chamaError, chamaResult) => {
        if (chamaError) {
          console.log("Error creating chama: " + chamaError.message);
          return res.status(500).render("pages/user/500.ejs");
        }
        const chama_id = chamaResult.insertId;

        // Step 2: Create the chairperson user account
        connection.query(
          "INSERT INTO Users (full_name, phone_number, email, password_hash, user_type) VALUES (?, ?, ?, ?, ?)",
          [chair_fullname, chair_phone, chair_email, hash, "chairperson"],
          (userError, userResult) => {
            if (userError) {
              console.log(
                "Error creating chairperson user: " + userError.message,
              );
              return res.status(500).render("pages/user/500.ejs");
            }
            const user_id = userResult.insertId;

            // Step 3: Link user to Chama as chairperson
            connection.query(
              "INSERT INTO Chama_Members (user_id, chama_id, role, joined_date) VALUES (?, ?, 'chairperson', CURDATE())",
              [user_id, chama_id],
              (memberError) => {
                if (memberError) {
                  console.log(
                    "Error linking chairperson: " + memberError.message,
                  );
                  return res.status(500).render("pages/user/500.ejs");
                }
                res.redirect("/login");
              },
            );
          },
        );
      },
    );
  });
});

app.get("/login", (req, res) => {
  res.render("pages/user/login.ejs", { error: null });
});

app.post("/auth", (req, res) => {
  const { chama_id, email, password } = req.body;

  connection.query(
    `SELECT u.user_id, u.full_name, u.email, u.phone_number, u.password_hash, cm.role, cm.chama_id
     FROM Users u
     JOIN Chama_Members cm ON u.user_id = cm.user_id
     WHERE u.email = ? AND cm.chama_id = ?`,
    [email, chama_id],
    (dbError, queryResult) => {
      if (dbError) {
        console.log("DB error occurred: " + dbError.message);
        return res.status(500).render("pages/user/500.ejs");
      }
      if (queryResult.length === 0) {
        return res.render("pages/user/login.ejs", {
          error: "Invalid credentials or you are not a member of this Chama.",
        });
      }
      bcrypt.compare(
        password,
        queryResult[0].password_hash,
        (compareError, isMatch) => {
          if (compareError) {
            console.log("Error comparing passwords: " + compareError.message);
            return res.status(500).render("pages/user/500.ejs");
          }
          if (!isMatch) {
            return res.render("pages/user/login.ejs", {
              error: "Invalid email or password.",
            });
          }
          req.session.user = queryResult[0];
          req.session.chama_id = parseInt(chama_id);
          req.session.role = queryResult[0].role;

          const roleRedirects = {
            chairperson: "/chairperson/dashboard",
            secretary: "/secretary/dashboard",
            treasurer: "/treasurer/dashboard",
            member: "/member/memberdashboard",
            admin: "/admin/dashboard",
          };
          res.redirect(
            roleRedirects[queryResult[0].role] || "/member/memberdashboard",
          );
        },
      );
    },
  );
});

app.get(
  "/view-as-member",
  requireRoles(["secretary", "treasurer", "chairperson"]),
  (req, res) => {
    res.redirect("/member/memberdashboard");
  },
);

app.get("/admin/dashboard", (req, res) => {
  res.render("pages/admin/dashboard.ejs");
});

app.get("/admin/groups-users", (req, res) => {
  res.render("pages/admin/groups-users.ejs");
});

app.get("/admin/billing-config", (req, res) => {
  res.render("pages/admin/billing-config.ejs");
});

app.get("/admin/content-support", (req, res) => {
  res.render("pages/admin/content-support.ejs");
});

app.get("/admin/security-analytics", (req, res) => {
  res.render("pages/admin/security-analytics.ejs");
});

//Member Routes
app.get("/member/memberdashboard", (req, res) => {
  res.render("pages/member/memberdashboard.ejs");
});

app.get("/member/contributions", (req, res) => {
  res.render("pages/member/contributions.ejs");
});

app.get("/member/loans", (req, res) => {
  res.render("pages/member/loans.ejs");
});

app.get("/member/meetings", (req, res) => {
  res.render("pages/member/meetings.ejs");
});

app.get("/member/group", (req, res) => {
  res.render("pages/member/group.ejs");
});

app.get("/member/profile", (req, res) => {
  res.render("pages/member/profile.ejs");
});

// Treasurer Routes
app.get("/treasurer/dashboard", (req, res) => {
  res.render("pages/treasurer/dashboard.ejs");
});

app.get("/treasurer/contributions", (req, res) => {
  res.render("pages/treasurer/contributions.ejs");
});

app.get("/treasurer/loans", (req, res) => {
  res.render("pages/treasurer/loans.ejs");
});

app.get("/treasurer/members", (req, res) => {
  res.render("pages/treasurer/members.ejs");
});

app.get("/treasurer/reconciliation", (req, res) => {
  res.render("pages/treasurer/reconciliation.ejs");
});

app.get("/treasurer/reports", (req, res) => {
  res.render("pages/treasurer/reports.ejs");
});

app.get("/treasurer/settings", (req, res) => {
  res.render("pages/treasurer/settings.ejs");
});

// Secretary Routes
app.get("/secretary/dashboard", (req, res) => {
  res.render("pages/secretary/dashboard.ejs");
});

app.get("/secretary/meetings", (req, res) => {
  res.render("pages/secretary/meetings.ejs");
});

app.get("/secretary/documents", (req, res) => {
  res.render("pages/secretary/documents.ejs");
});

app.get("/secretary/communications", (req, res) => {
  res.render("pages/secretary/communications.ejs");
});

app.get("/secretary/member-records", (req, res) => {
  res.render("pages/secretary/member-records.ejs");
});

app.get("/secretary/calendar", (req, res) => {
  res.render("pages/secretary/calendar.ejs");
});

// Chairperson Routes
app.get("/chairperson/dashboard", (req, res) => {
  res.render("pages/chairperson/dashboard.ejs");
});

app.get("/chairperson/members", (req, res) => {
  if (!req.session.user || req.session.role !== "chairperson") {
    return res.status(401).render("pages/user/401.ejs");
  }
  const chama_id = req.session.chama_id;

  connection.query(
    "SELECT invite_code, chama_name FROM Chama WHERE chama_id = ?",
    [chama_id],
    (chamaErr, chamaRows) => {
      if (chamaErr || chamaRows.length === 0) {
        return res.status(500).render("pages/user/500.ejs");
      }
      connection.query(
        `SELECT u.user_id, u.full_name, u.phone_number, u.email, cm.role, cm.joined_date
         FROM Users u
         JOIN Chama_Members cm ON u.user_id = cm.user_id
         WHERE cm.chama_id = ?
         ORDER BY cm.joined_date ASC`,
        [chama_id],
        (membersErr, members) => {
          if (membersErr) {
            return res.status(500).render("pages/user/500.ejs");
          }
          res.render("pages/chairperson/members.ejs", {
            chama: chamaRows[0],
            members,
            success: req.query.success || null,
            error: req.query.error || null,
          });
        },
      );
    },
  );
});

app.post("/chairperson/add-member", (req, res) => {
  if (!req.session.user || req.session.role !== "chairperson") {
    return res.status(401).render("pages/user/401.ejs");
  }
  const { full_name, phone_number, email, password, role } = req.body;
  const chama_id = req.session.chama_id;
  const allowedRoles = ["member", "treasurer", "secretary", "chairperson"];
  if (!allowedRoles.includes(role)) {
    return res.redirect("/chairperson/members?error=Invalid role selected.");
  }

  bcrypt.hash(password, 10, (hashError, hash) => {
    if (hashError) return res.status(500).render("pages/user/500.ejs");

    connection.query(
      "INSERT INTO Users (full_name, phone_number, email, password_hash, user_type) VALUES (?, ?, ?, ?, ?)",
      [full_name, phone_number, email, hash, role],
      (userError, userResult) => {
        if (userError) {
          console.log("Error adding member: " + userError.message);
          return res.redirect(
            "/chairperson/members?error=Could not add member. Email or phone may already be registered.",
          );
        }
        connection.query(
          "INSERT INTO Chama_Members (user_id, chama_id, role, joined_date) VALUES (?, ?, ?, CURDATE())",
          [userResult.insertId, chama_id, role],
          (memberError) => {
            if (memberError) {
              console.log("Error linking member: " + memberError.message);
              return res.redirect(
                "/chairperson/members?error=Could not link member to Chama.",
              );
            }
            res.redirect(
              "/chairperson/members?success=Member added successfully.",
            );
          },
        );
      },
    );
  });
});

app.get("/chairperson/governance", (req, res) => {
  res.render("pages/chairperson/governance.ejs");
});

app.get("/chairperson/meetings", (req, res) => {
  res.render("pages/chairperson/meetings.ejs");
});

app.get("/chairperson/welfare", (req, res) => {
  res.render("pages/chairperson/welfare.ejs");
});

app.get("/chairperson/reports", (req, res) => {
  res.render("pages/chairperson/reports.ejs");
});

app.get("/join", (req, res) => {
  res.render("pages/user/join.ejs", { error: null });
});

app.post("/join", (req, res) => {
  const { invite_code, full_name, phone_number, email, password } = req.body;

  connection.query(
    "SELECT chama_id FROM Chama WHERE invite_code = ?",
    [invite_code],
    (chamaErr, chamaRows) => {
      if (chamaErr) return res.status(500).render("pages/user/500.ejs");
      if (chamaRows.length === 0) {
        return res.render("pages/user/join.ejs", {
          error: "Invalid invite code. Please check and try again.",
        });
      }
      const chama_id = chamaRows[0].chama_id;

      bcrypt.hash(password, 10, (hashError, hash) => {
        if (hashError) return res.status(500).render("pages/user/500.ejs");

        connection.query(
          "INSERT INTO Users (full_name, phone_number, email, password_hash, user_type) VALUES (?, ?, ?, ?, 'member')",
          [full_name, phone_number, email, hash],
          (userError, userResult) => {
            if (userError) {
              return res.render("pages/user/join.ejs", {
                error:
                  "Could not create account. Email or phone may already be registered.",
              });
            }
            connection.query(
              "INSERT INTO Chama_Members (user_id, chama_id, role, joined_date) VALUES (?, ?, 'member', CURDATE())",
              [userResult.insertId, chama_id],
              (memberError) => {
                if (memberError)
                  return res.status(500).render("pages/user/500.ejs");
                res.redirect("/login");
              },
            );
          },
        );
      });
    },
  );
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("Error destroying session: " + err.message);
      res.status(500).render("pages/user/500.ejs");
    } else {
      res.redirect("/login");
    }
  });
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
