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

let isDbHealthy = false;
connection.connect((connectError) => {
  if (connectError) {
    console.log("Database connection error: " + connectError.message);
    return;
  }

  isDbHealthy = true;
  console.log("Database connected successfully.");
});

setInterval(() => {
  connection.ping((pingError) => {
    if (pingError) {
      isDbHealthy = false;
      console.log("Database ping failed: " + pingError.message);
      return;
    }

    isDbHealthy = true;
  });
}, 60 * 1000).unref();
//2. Register middleware functions to handle incoming requests and responses
app.use(
  session({
    secret: "encryptionKey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000,
    },
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
  "/forgot-password",
];
const adminRoutes = [
  "/admin/dashboard",
  "/admin/groups-users",
  "/admin/billing-config",
  "/admin/content-support",
  "/admin/security-analytics",
];
const memberRoutes = [
  "/member/dashboard",
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

function renderDbUnavailableForAuth(req, res) {
  const dbMessage =
    "Database is temporarily unavailable. Please try again in a moment.";

  if (req.path === "/auth" || req.path === "/login") {
    return res.status(503).render("pages/user/login.ejs", { error: dbMessage });
  }

  if (req.path === "/signup") {
    return res.status(503).render("pages/user/signup.ejs", {
      error: dbMessage,
      formData: req.body || {},
    });
  }

  if (req.path === "/join") {
    return res.status(503).render("pages/user/join.ejs", { error: dbMessage });
  }

  return res.status(503).render("pages/user/500.ejs");
}

app.use((req, res, next) => {
  const requiresDb =
    req.path === "/auth" ||
    req.path === "/signup" ||
    req.path === "/join" ||
    req.path === "/forgot-password";

  if (requiresDb && !isDbHealthy) {
    return renderDbUnavailableForAuth(req, res);
  }

  return next();
});

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
  res.render("pages/user/signup.ejs", { error: null, formData: {} });
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

  const formData = {
    chama_name,
    invite_code,
    description,
    meeting_day,
    contribution_amount,
    currency,
    chair_fullname,
    chair_phone,
    chair_email,
  };

  if (
    !chama_name ||
    !invite_code ||
    !meeting_day ||
    !contribution_amount ||
    !currency ||
    !chair_fullname ||
    !chair_phone ||
    !chair_email ||
    !chair_password
  ) {
    return res.status(400).render("pages/user/signup.ejs", {
      error: "Please fill in all required fields.",
      formData,
    });
  }

  bcrypt.hash(chair_password, 10, (hashError, hash) => {
    if (hashError) {
      console.log("Error hashing password: " + hashError.message);
      return res.status(400).render("pages/user/signup.ejs", {
        error: "Could not process the password. Please try again.",
        formData,
      });
    }

    connection.beginTransaction((transactionError) => {
      if (transactionError) {
        console.log("Error starting transaction: " + transactionError.message);
        return res.status(400).render("pages/user/signup.ejs", {
          error: "Could not create your Chama at the moment. Please try again.",
          formData,
        });
      }

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
            return connection.rollback(() => {
              const duplicateError = chamaError.code === "ER_DUP_ENTRY";
              if (!duplicateError) {
                console.log("Error creating chama: " + chamaError.message);
              }
              return res.status(400).render("pages/user/signup.ejs", {
                error: duplicateError
                  ? "This Chama name or invite code already exists. Please use another one."
                  : "Could not create the Chama. Please try again.",
                formData,
              });
            });
          }

          const chama_id = chamaResult.insertId;

          connection.query(
            "INSERT INTO Users (full_name, phone_number, email, password_hash, user_type) VALUES (?, ?, ?, ?, ?)",
            [chair_fullname, chair_phone, chair_email, hash, "chairperson"],
            (userError, userResult) => {
              if (userError) {
                return connection.rollback(() => {
                  const duplicateError = userError.code === "ER_DUP_ENTRY";
                  if (!duplicateError) {
                    console.log(
                      "Error creating chairperson user: " + userError.message,
                    );
                  }
                  return res.status(400).render("pages/user/signup.ejs", {
                    error: duplicateError
                      ? "Chairperson email or phone number is already in use."
                      : "Could not create the chairperson account. Please try again.",
                    formData,
                  });
                });
              }

              const user_id = userResult.insertId;

              connection.query(
                "INSERT INTO Chama_Members (user_id, chama_id, role, email, phone_number, joined_date) VALUES (?, ?, 'chairperson', ?, ?, CURDATE())",
                [user_id, chama_id, chair_email, chair_phone],
                (memberError) => {
                  if (memberError) {
                    return connection.rollback(() => {
                      console.log(
                        "Error linking chairperson: " + memberError.message,
                      );
                      return res.status(400).render("pages/user/signup.ejs", {
                        error:
                          "Your account was created, but we could not complete setup. Please try again.",
                        formData,
                      });
                    });
                  }

                  connection.commit((commitError) => {
                    if (commitError) {
                      return connection.rollback(() => {
                        console.log(
                          "Error committing signup: " + commitError.message,
                        );
                        return res.status(400).render("pages/user/signup.ejs", {
                          error:
                            "Could not finish creating your Chama. Please try again.",
                          formData,
                        });
                      });
                    }

                    req.session.user = {
                      user_id,
                      full_name: chair_fullname,
                      email: chair_email,
                      phone_number: chair_phone,
                      role: "chairperson",
                      chama_id,
                    };
                    req.session.chama_id = chama_id;
                    req.session.role = "chairperson";
                    req.session.signupSuccess = `Chama created successfully! Your Chama ID is ${chama_id}. Use this ID to log in later. Welcome to your dashboard.`;
                    return req.session.save((sessionSaveError) => {
                      if (sessionSaveError) {
                        console.log(
                          "Error saving signup session: " +
                            sessionSaveError.message,
                        );
                        return res.status(500).render("pages/user/500.ejs");
                      }

                      return res.redirect("/chairperson/dashboard");
                    });
                  });
                },
              );
            },
          );
        },
      );
    });
  });
});

app.get("/login", (req, res) => {
  res.render("pages/user/login.ejs", { error: null });
});

app.get("/forgot-password", (req, res) => {
  res.render("pages/user/forgot-password.ejs");
});

app.post("/auth", (req, res) => {
  const { chama_id, email, password } = req.body;
  const parsedChamaId = parseInt(chama_id, 10);

  if (!parsedChamaId || !email || !password) {
    return res.render("pages/user/login.ejs", {
      error: "Please provide Chama ID, email and password.",
    });
  }

  connection.query(
    `SELECT u.user_id, u.full_name, u.email, u.phone_number, u.password_hash, u.user_type AS role, cm.chama_id
     FROM Users u
     JOIN Chama_Members cm ON u.user_id = cm.user_id
     WHERE u.email = ? AND cm.chama_id = ?`,
    [email, parsedChamaId],
    (dbError, queryResult) => {
      if (dbError) {
        console.log("DB error occurred: " + dbError.message);
        return res.render("pages/user/login.ejs", {
          error: "Unable to log you in right now. Please try again.",
        });
      }
      if (queryResult.length === 0) {
        return res.render("pages/user/login.ejs", {
          error: "Invalid credentials or you are not a member of this Chama.",
        });
      }

      const userRecord = queryResult[0];
      if (
        !userRecord.password_hash ||
        typeof userRecord.password_hash !== "string"
      ) {
        return res.render("pages/user/login.ejs", {
          error:
            "This account cannot log in with a password yet. Please contact support.",
        });
      }

      bcrypt.compare(
        password,
        userRecord.password_hash,
        (compareError, isMatch) => {
          if (compareError) {
            console.log("Error comparing passwords: " + compareError.message);
            return res.render("pages/user/login.ejs", {
              error: "Invalid email or password.",
            });
          }
          if (!isMatch) {
            return res.render("pages/user/login.ejs", {
              error: "Invalid email or password.",
            });
          }
          req.session.user = userRecord;
          req.session.chama_id = parsedChamaId;
          req.session.role = userRecord.role;

          const roleRedirects = {
            chairperson: "/chairperson/dashboard",
            secretary: "/secretary/dashboard",
            treasurer: "/treasurer/dashboard",
            member: "/member/dashboard",
            admin: "/admin/dashboard",
          };
          req.session.save((sessionSaveError) => {
            if (sessionSaveError) {
              console.log(
                "Error saving login session: " + sessionSaveError.message,
              );
              return res.status(500).render("pages/user/500.ejs");
            }

            return res.redirect(
              roleRedirects[userRecord.role] || "/member/dashboard",
            );
          });
        },
      );
    },
  );
});

app.get(
  "/view-as-member",
  requireRoles(["secretary", "treasurer", "chairperson"]),
  (req, res) => {
    res.redirect("/member/dashboard");
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
app.get("/member/dashboard", (req, res) => {
  res.render("pages/member/dashboard.ejs");
});

app.get("/member/memberdashboard", (req, res) => {
  res.redirect("/member/dashboard");
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
  if (!req.session.user || req.session.role !== "treasurer") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  if (!chama_id) {
    return res.status(401).render("pages/user/401.ejs");
  }

  connection.query(
    `SELECT u.user_id, u.full_name, u.phone_number, u.email, cm.role,
            DATE_FORMAT(cm.joined_date, '%Y-%m-%d') AS joined_date
     FROM Users u
     JOIN Chama_Members cm ON u.user_id = cm.user_id
     WHERE cm.chama_id = ?
     ORDER BY cm.joined_date ASC, u.full_name ASC`,
    [chama_id],
    (membersError, members) => {
      if (membersError) {
        console.log("Treasurer members load error: " + membersError.message);
        return res.status(500).render("pages/user/500.ejs");
      }

      return res.render("pages/treasurer/members.ejs", {
        members,
      });
    },
  );
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
  const success = req.session.signupSuccess || null;
  req.session.signupSuccess = null;

  res.render("pages/chairperson/dashboard.ejs", { success });
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
        `SELECT u.user_id, u.full_name, u.phone_number, u.email, u.user_type AS role, cm.joined_date
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
          "INSERT INTO Chama_Members (user_id, chama_id, role, email, phone_number, joined_date) VALUES (?, ?, ?, ?, ?, CURDATE())",
          [userResult.insertId, chama_id, role, email, phone_number],
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

  if (!invite_code || !full_name || !phone_number || !email || !password) {
    return res.render("pages/user/join.ejs", {
      error: "Please fill in all required fields.",
    });
  }

  connection.query(
    "SELECT chama_id FROM Chama WHERE invite_code = ?",
    [invite_code],
    (chamaErr, chamaRows) => {
      if (chamaErr) {
        console.log("Join lookup error: " + chamaErr.message);
        return res.render("pages/user/join.ejs", {
          error:
            "Unable to verify the invite code right now. Please try again.",
        });
      }
      if (chamaRows.length === 0) {
        return res.render("pages/user/join.ejs", {
          error: "Invalid invite code. Please check and try again.",
        });
      }
      const chama_id = chamaRows[0].chama_id;

      bcrypt.hash(password, 10, (hashError, hash) => {
        if (hashError) {
          console.log("Join hash error: " + hashError.message);
          return res.render("pages/user/join.ejs", {
            error: "Unable to create your account right now. Please try again.",
          });
        }

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
              "INSERT INTO Chama_Members (user_id, chama_id, role, email, phone_number, joined_date) VALUES (?, ?, 'member', ?, ?, CURDATE())",
              [userResult.insertId, chama_id, email, phone_number],
              (memberError) => {
                if (memberError) {
                  console.log("Join member link error: " + memberError.message);
                  return res.render("pages/user/join.ejs", {
                    error:
                      "Your account was created, but we could not complete joining this Chama. Please contact support.",
                  });
                }
                req.session.user = {
                  user_id: userResult.insertId,
                  full_name,
                  email,
                  phone_number,
                  role: "member",
                  chama_id,
                };
                req.session.chama_id = chama_id;
                req.session.role = "member";

                req.session.save((sessionSaveError) => {
                  if (sessionSaveError) {
                    console.log(
                      "Error saving join session: " + sessionSaveError.message,
                    );
                    return res.status(500).render("pages/user/500.ejs");
                  }

                  return res.redirect("/member/dashboard");
                });
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
