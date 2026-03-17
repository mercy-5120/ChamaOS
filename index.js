//1.Import and configure package modulesat the top of the file
const mysql = require("mysql2");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();

const meetingUploadDir = path.join(__dirname, "public", "uploads", "meetings");

const meetingAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(meetingUploadDir, { recursive: true });
    cb(null, meetingUploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const meetingAttachmentUpload = multer({ storage: meetingAttachmentStorage });

const governanceDocsUploadDir = path.join(
  __dirname,
  "public",
  "uploads",
  "governance",
);

const governanceDocsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(governanceDocsUploadDir, { recursive: true });
    cb(null, governanceDocsUploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const governanceDocsUpload = multer({ storage: governanceDocsStorage });

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

function toYmd(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNextMonthlyDueDate(dueDay, referenceDate = new Date()) {
  const parsed = Number(dueDay);
  const validDay = Number.isFinite(parsed)
    ? Math.max(1, Math.min(28, parsed))
    : 5;

  let year = referenceDate.getFullYear();
  let month = referenceDate.getMonth();

  if (referenceDate.getDate() >= validDay) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return new Date(year, month, validDay);
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
  const chama_id = req.session.chama_id;
  const user_id = req.session.user?.user_id;

  if (!chama_id || !user_id) {
    return res.render("pages/member/dashboard.ejs", {
      announcements: [],
      activeLoans: [],
      contributionSummary: {
        total_contributed: 0,
        last_payment: null,
        transaction_count: 0,
      },
      upcomingMeetings: [],
    });
  }

  connection.query(
    `SELECT a.title, a.content, a.priority,
            DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i') AS created_at,
            u.full_name AS posted_by
     FROM Announcements a
     JOIN Users u ON u.user_id = a.posted_by
     WHERE a.chama_id = ?
     ORDER BY a.created_at DESC
     LIMIT 10`,
    [chama_id],
    (annError, announcements) => {
      if (annError) {
        console.log(
          "Member dashboard announcements load error: " + annError.message,
        );
      }

      connection.query(
        `SELECT loan_id, amount,
                IFNULL(remaining_balance, amount) AS remaining_balance,
                DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date,
                status
         FROM Loans
         WHERE chama_id = ? AND user_id = ? AND status = 'active'
         ORDER BY due_date ASC, loan_id DESC`,
        [chama_id, user_id],
        (loanError, activeLoans) => {
          if (loanError) {
            console.log(
              "Member dashboard active loans load error: " + loanError.message,
            );
          }

          connection.query(
            `SELECT IFNULL(SUM(amount), 0) AS total_contributed,
                    DATE_FORMAT(MAX(created_at), '%Y-%m-%d') AS last_payment,
                    COUNT(*) AS transaction_count
             FROM Transactions
             WHERE chama_id = ?
               AND user_id = ?
               AND transaction_type = 'contribution'
               AND status = 'completed'`,
            [chama_id, user_id],
            (contribError, summaryRows) => {
              if (contribError) {
                console.log(
                  "Member dashboard contribution summary load error: " +
                    contribError.message,
                );
              }

              const contributionSummary =
                !contribError && summaryRows.length > 0
                  ? summaryRows[0]
                  : {
                      total_contributed: 0,
                      last_payment: null,
                      transaction_count: 0,
                    };

              function loadMeetingsAndRender(nextDueDate) {
                contributionSummary.nextDueDate = nextDueDate;

                connection.query(
                  `SELECT meeting_id,
                          meeting_title,
                          DATE_FORMAT(meeting_date, '%Y-%m-%d') AS meeting_date,
                          DATE_FORMAT(meeting_time, '%H:%i') AS meeting_time,
                          location,
                          agenda
                   FROM Meetings
                   WHERE chama_id = ? AND meeting_date >= CURDATE()
                   ORDER BY meeting_date ASC, meeting_time ASC
                   LIMIT 5`,
                  [chama_id],
                  (meetingError, upcomingMeetings) => {
                    if (meetingError) {
                      if (meetingError.code === "ER_BAD_FIELD_ERROR") {
                        return connection.query(
                          `SELECT meeting_id,
                                  '' AS meeting_title,
                                  DATE_FORMAT(meeting_date, '%Y-%m-%d') AS meeting_date,
                                  '' AS meeting_time,
                                  location,
                                  agenda
                           FROM Meetings
                           WHERE chama_id = ? AND meeting_date >= CURDATE()
                           ORDER BY meeting_date ASC
                           LIMIT 5`,
                          [chama_id],
                          (fbError, fbMeetings) => {
                            return res.render("pages/member/dashboard.ejs", {
                              announcements: annError ? [] : announcements,
                              activeLoans: loanError ? [] : activeLoans,
                              contributionSummary,
                              upcomingMeetings: fbError ? [] : fbMeetings,
                            });
                          },
                        );
                      }
                      console.log(
                        "Member dashboard meetings load error: " +
                          meetingError.message,
                      );
                    }

                    return res.render("pages/member/dashboard.ejs", {
                      announcements: annError ? [] : announcements,
                      activeLoans: loanError ? [] : activeLoans,
                      contributionSummary,
                      upcomingMeetings: meetingError ? [] : upcomingMeetings,
                    });
                  },
                );
              }

              connection.query(
                `SELECT contribution_amount, IFNULL(contribution_due_day, 5) AS contribution_due_day
                 FROM Chama
                 WHERE chama_id = ?
                 LIMIT 1`,
                [chama_id],
                (settingsError, settingsRows) => {
                  if (
                    settingsError &&
                    settingsError.code === "ER_BAD_FIELD_ERROR"
                  ) {
                    return loadMeetingsAndRender(null);
                  }
                  if (settingsError) {
                    console.log(
                      "Member dashboard chama settings load error: " +
                        settingsError.message,
                    );
                    return loadMeetingsAndRender(null);
                  }
                  const contribution_due_day =
                    settingsRows.length > 0
                      ? Number(settingsRows[0].contribution_due_day || 5)
                      : 5;
                  const nextDueDate = toYmd(
                    getNextMonthlyDueDate(contribution_due_day),
                  );
                  return loadMeetingsAndRender(nextDueDate);
                },
              );
            },
          );
        },
      );
    },
  );
});

app.get("/member/memberdashboard", (req, res) => {
  res.redirect("/member/dashboard");
});

app.get("/member/contributions", (req, res) => {
  if (!req.session.user) {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const user_id = req.session.user.user_id;

  connection.query(
    `SELECT transaction_id, amount, status,
            DATE_FORMAT(created_at, '%Y-%m-%d') AS contribution_date,
            description
     FROM Transactions
     WHERE chama_id = ?
       AND user_id = ?
       AND transaction_type = 'contribution'
     ORDER BY created_at DESC, transaction_id DESC`,
    [chama_id, user_id],
    (historyError, contributions) => {
      if (historyError) {
        console.log(
          "Member contribution history load error: " + historyError.message,
        );
        return res.status(500).render("pages/user/500.ejs");
      }

      const paidContributions = contributions.filter(
        (tx) => tx.status === "completed",
      );
      const totalPaid = paidContributions.reduce(
        (sum, tx) => sum + Number(tx.amount || 0),
        0,
      );
      const averageContribution =
        paidContributions.length > 0 ? totalPaid / paidContributions.length : 0;

      function loadReminderPreferencesAndRender(
        contribution_amount,
        contribution_due_day,
      ) {
        const nextDueDateValue = getNextMonthlyDueDate(
          contribution_due_day,
          new Date(),
        );
        const nextDueDate = toYmd(nextDueDateValue);

        const cycleStart = new Date(nextDueDateValue);
        cycleStart.setMonth(cycleStart.getMonth() - 1);

        const currentCyclePaid = paidContributions.reduce((sum, tx) => {
          const paidDate = new Date(`${tx.contribution_date}T00:00:00`);
          if (Number.isNaN(paidDate.getTime())) return sum;
          if (paidDate >= cycleStart && paidDate < nextDueDateValue) {
            return sum + Number(tx.amount || 0);
          }
          return sum;
        }, 0);

        const amountRemaining = Math.max(
          Number(contribution_amount || 0) - Number(currentCyclePaid || 0),
          0,
        );

        const today = new Date();
        const todayMidnight = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        );
        const dueMidnight = new Date(
          nextDueDateValue.getFullYear(),
          nextDueDateValue.getMonth(),
          nextDueDateValue.getDate(),
        );
        const daysUntilDue = Math.ceil(
          (dueMidnight.getTime() - todayMidnight.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        const reminderState =
          amountRemaining <= 0
            ? "paid"
            : daysUntilDue <= 2
              ? "urgent"
              : daysUntilDue <= 7
                ? "warning"
                : "upcoming";

        connection.query(
          `SELECT sms_enabled, email_enabled
           FROM Member_Reminder_Preferences
           WHERE chama_id = ? AND user_id = ?
           LIMIT 1`,
          [chama_id, user_id],
          (prefsError, prefsRows) => {
            if (prefsError && prefsError.code !== "ER_NO_SUCH_TABLE") {
              console.log(
                "Member reminder preferences load error: " + prefsError.message,
              );
              return res.status(500).render("pages/user/500.ejs");
            }

            const reminderPreferences =
              !prefsError && prefsRows.length > 0
                ? {
                    sms_enabled: Number(prefsRows[0].sms_enabled) === 1,
                    email_enabled: Number(prefsRows[0].email_enabled) === 1,
                  }
                : {
                    sms_enabled: false,
                    email_enabled: true,
                  };

            return res.render("pages/member/contributions.ejs", {
              contributions,
              contributionStats: {
                totalPaid,
                averageContribution,
                paymentStatus:
                  paidContributions.length > 0
                    ? "On Record"
                    : "No payments yet",
                paymentCount: paidContributions.length,
              },
              contributionPlan: {
                contribution_amount,
                contribution_due_day,
                nextDueDate,
              },
              reminderInfo: {
                state: reminderState,
                currentCyclePaid,
                amountRemaining,
                daysUntilDue,
              },
              reminderPreferences,
              success: req.query.success || null,
              error: req.query.error || null,
            });
          },
        );
      }

      connection.query(
        `SELECT contribution_amount, IFNULL(contribution_due_day, 5) AS contribution_due_day
         FROM Chama
         WHERE chama_id = ?
         LIMIT 1`,
        [chama_id],
        (settingsError, settingsRows) => {
          if (settingsError && settingsError.code === "ER_BAD_FIELD_ERROR") {
            return connection.query(
              `SELECT contribution_amount
               FROM Chama
               WHERE chama_id = ?
               LIMIT 1`,
              [chama_id],
              (fallbackError, fallbackRows) => {
                if (fallbackError) {
                  console.log(
                    "Member contribution settings fallback error: " +
                      fallbackError.message,
                  );
                }

                const contribution_amount =
                  !fallbackError && fallbackRows.length > 0
                    ? Number(fallbackRows[0].contribution_amount || 0)
                    : 0;
                const contribution_due_day = 5;

                return loadReminderPreferencesAndRender(
                  contribution_amount,
                  contribution_due_day,
                );
              },
            );
          }

          if (settingsError) {
            console.log(
              "Member contribution settings load error: " +
                settingsError.message,
            );
          }

          const contribution_amount =
            !settingsError && settingsRows.length > 0
              ? Number(settingsRows[0].contribution_amount || 0)
              : 0;
          const contribution_due_day =
            !settingsError && settingsRows.length > 0
              ? Number(settingsRows[0].contribution_due_day || 5)
              : 5;

          return loadReminderPreferencesAndRender(
            contribution_amount,
            contribution_due_day,
          );
        },
      );
    },
  );
});

app.post("/member/contributions/reminders", (req, res) => {
  if (!req.session.user) {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const user_id = req.session.user.user_id;

  const sms_enabled = req.body.sms_enabled ? 1 : 0;
  const email_enabled = req.body.email_enabled ? 1 : 0;

  connection.query(
    `INSERT INTO Member_Reminder_Preferences (chama_id, user_id, sms_enabled, email_enabled)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       sms_enabled = VALUES(sms_enabled),
       email_enabled = VALUES(email_enabled)`,
    [chama_id, user_id, sms_enabled, email_enabled],
    (saveError) => {
      if (saveError) {
        if (saveError.code === "ER_NO_SUCH_TABLE") {
          return res.redirect(
            `/member/contributions?error=${encodeURIComponent("Reminder settings table not found. Run latest migration.")}`,
          );
        }

        console.log("Reminder preferences save error: " + saveError.message);
        return res.redirect(
          `/member/contributions?error=${encodeURIComponent("Failed to save reminder preferences.")}`,
        );
      }

      return res.redirect(
        `/member/contributions?success=${encodeURIComponent("Payment reminder preferences updated.")}`,
      );
    },
  );
});

app.get("/member/loans", (req, res) => {
  if (!req.session.user) {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const user_id = req.session.user.user_id;

  connection.query(
    `SELECT loan_id, amount, DATE_FORMAT(issue_date, '%Y-%m-%d') AS applied_date,
            DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date, status,
            DATE_FORMAT(approved_at, '%Y-%m-%d %H:%i') AS approved_at,
            DATE_FORMAT(rejected_at, '%Y-%m-%d %H:%i') AS rejected_at,
            IFNULL(remaining_balance, amount) AS remaining_balance
     FROM Loans
     WHERE chama_id = ? AND user_id = ?
     ORDER BY issue_date DESC, loan_id DESC`,
    [chama_id, user_id],
    (loansError, loans) => {
      if (loansError) {
        console.log("Member loans load error: " + loansError.message);
        return res.status(500).render("pages/user/500.ejs");
      }

      const activeLoans = loans.filter((loan) => loan.status === "active");
      const pendingApplications = loans.filter(
        (loan) => loan.status === "pending",
      );
      const loanHistory = loans.filter(
        (loan) => loan.status !== "active" && loan.status !== "pending",
      );

      connection.query(
        `SELECT contribution_amount, IFNULL(contribution_due_day, 5) AS contribution_due_day
         FROM Chama
         WHERE chama_id = ?
         LIMIT 1`,
        [chama_id],
        (settingsError, settingsRows) => {
          if (settingsError && settingsError.code === "ER_BAD_FIELD_ERROR") {
            return connection.query(
              `SELECT contribution_amount
               FROM Chama
               WHERE chama_id = ?
               LIMIT 1`,
              [chama_id],
              (fallbackError, fallbackRows) => {
                if (fallbackError) {
                  console.log(
                    "Member loans settings fallback error: " +
                      fallbackError.message,
                  );
                }

                const contribution_amount =
                  !fallbackError && fallbackRows.length > 0
                    ? Number(fallbackRows[0].contribution_amount || 0)
                    : 0;
                const contribution_due_day = 5;
                const nextDueDate = toYmd(
                  getNextMonthlyDueDate(contribution_due_day, new Date()),
                );

                return res.render("pages/member/loans.ejs", {
                  activeLoans,
                  pendingApplications,
                  loanHistory,
                  success: req.query.success || null,
                  error: req.query.error || null,
                  contributionDueSettings: {
                    contribution_amount,
                    contribution_due_day,
                    nextDueDate,
                  },
                });
              },
            );
          }

          if (settingsError) {
            console.log(
              "Member loans settings load error: " + settingsError.message,
            );
          }

          const contribution_amount =
            !settingsError && settingsRows.length > 0
              ? Number(settingsRows[0].contribution_amount || 0)
              : 0;
          const contribution_due_day =
            !settingsError && settingsRows.length > 0
              ? Number(settingsRows[0].contribution_due_day || 5)
              : 5;
          const nextDueDate = toYmd(
            getNextMonthlyDueDate(contribution_due_day, new Date()),
          );

          return res.render("pages/member/loans.ejs", {
            activeLoans,
            pendingApplications,
            loanHistory,
            success: req.query.success || null,
            error: req.query.error || null,
            contributionDueSettings: {
              contribution_amount,
              contribution_due_day,
              nextDueDate,
            },
          });
        },
      );
    },
  );
});

app.post("/member/loans/apply", (req, res) => {
  if (!req.session.user || req.session.role !== "member") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const { loan_amount, repayment_period } = req.body;
  const amount = Number(loan_amount);
  const repaymentMonths = Number(repayment_period);
  const chama_id = req.session.chama_id;
  const user_id = req.session.user.user_id;

  if (!amount || amount <= 0 || !repaymentMonths || repaymentMonths <= 0) {
    return res.redirect(
      "/member/loans?error=Enter a valid loan amount and repayment period.",
    );
  }

  connection.query(
    `SELECT loan_id FROM Loans
     WHERE chama_id = ? AND user_id = ? AND status = 'pending'
     LIMIT 1`,
    [chama_id, user_id],
    (existingError, existingRows) => {
      if (existingError) {
        console.log("Loan apply check error: " + existingError.message);
        return res.status(500).render("pages/user/500.ejs");
      }

      if (existingRows.length > 0) {
        return res.redirect(
          "/member/loans?error=You already have a pending loan application.",
        );
      }

      connection.query(
        `INSERT INTO Loans (chama_id, user_id, amount, issue_date, due_date, status, remaining_balance)
         VALUES (?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), 'pending', ?)`,
        [chama_id, user_id, amount, repaymentMonths, amount],
        (insertError) => {
          if (insertError) {
            console.log("Loan apply insert error: " + insertError.message);
            return res.redirect(
              "/member/loans?error=Could not submit loan application.",
            );
          }

          return res.redirect(
            "/member/loans?success=Loan application submitted successfully.",
          );
        },
      );
    },
  );
});

app.get("/member/meetings", (req, res) => {
  if (!req.session.user) {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const user_id = req.session.user.user_id;

  function loadAttendanceAndRender(meetingsList) {
    const upcomingMeetings = meetingsList
      .filter((m) => m.meeting_status === "upcoming")
      .sort((a, b) => {
        const aStamp = `${a.meeting_date} ${a.meeting_time || "00:00"}`;
        const bStamp = `${b.meeting_date} ${b.meeting_time || "00:00"}`;
        return aStamp.localeCompare(bStamp);
      });
    const pastMeetings = meetingsList.filter(
      (m) => m.meeting_status === "completed",
    );

    connection.query(
      `SELECT ma.meeting_id, ma.attended
       FROM Meeting_Attendance ma
       JOIN Meetings m ON ma.meeting_id = m.meeting_id
       WHERE m.chama_id = ? AND ma.user_id = ?`,
      [chama_id, user_id],
      (attError, attendanceRows) => {
        if (attError && attError.code !== "ER_NO_SUCH_TABLE") {
          console.log("Member attendance load error: " + attError.message);
        }

        const attendanceMap = {};
        (attendanceRows || []).forEach((row) => {
          attendanceMap[row.meeting_id] = row.attended;
        });

        let attended = 0,
          absent = 0;
        pastMeetings.forEach((m) => {
          if (attendanceMap[m.meeting_id] === 1) attended++;
          else if (
            Object.prototype.hasOwnProperty.call(attendanceMap, m.meeting_id)
          )
            absent++;
        });
        const totalMeetings = pastMeetings.length;
        const rate =
          totalMeetings > 0 ? Math.round((attended / totalMeetings) * 100) : 0;
        const attendanceStats = { totalMeetings, attended, absent, rate };

        return res.render("pages/member/meetings.ejs", {
          upcomingMeetings,
          pastMeetings,
          attendanceMap,
          attendanceStats,
        });
      },
    );
  }

  connection.query(
    `SELECT meeting_id,
            meeting_title,
            DATE_FORMAT(meeting_date, '%Y-%m-%d') AS meeting_date,
            DATE_FORMAT(meeting_time, '%H:%i') AS meeting_time,
            location,
            agenda,
            decisions,
            CASE
              WHEN meeting_date >= CURDATE() THEN 'upcoming'
              ELSE 'completed'
            END AS meeting_status
     FROM Meetings
     WHERE chama_id = ?
     ORDER BY meeting_date DESC, meeting_time DESC, meeting_id DESC`,
    [chama_id],
    (meetingsError, meetings) => {
      if (meetingsError) {
        if (meetingsError.code === "ER_BAD_FIELD_ERROR") {
          return connection.query(
            `SELECT meeting_id,
                    '' AS meeting_title,
                    DATE_FORMAT(meeting_date, '%Y-%m-%d') AS meeting_date,
                    '' AS meeting_time,
                    location,
                    agenda,
                    decisions,
                    CASE
                      WHEN meeting_date >= CURDATE() THEN 'upcoming'
                      ELSE 'completed'
                    END AS meeting_status
             FROM Meetings
             WHERE chama_id = ?
             ORDER BY meeting_date DESC, meeting_id DESC`,
            [chama_id],
            (fallbackError, fallbackMeetings) => {
              if (fallbackError) {
                console.log(
                  "Member meetings fallback load error: " +
                    fallbackError.message,
                );
                return res.status(500).render("pages/user/500.ejs");
              }
              return loadAttendanceAndRender(fallbackMeetings);
            },
          );
        }

        console.log("Member meetings load error: " + meetingsError.message);
        return res.status(500).render("pages/user/500.ejs");
      }

      return loadAttendanceAndRender(meetings);
    },
  );
});

app.get("/member/group", (req, res) => {
  if (!req.session.user) {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;

  connection.query(
    `SELECT chama_name, description, meeting_day, contribution_amount,
            currency, is_active,
            DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at
     FROM Chama
     WHERE chama_id = ?
     LIMIT 1`,
    [chama_id],
    (groupError, groupRows) => {
      if (groupError) {
        console.log("Member group info load error: " + groupError.message);
        return res.status(500).render("pages/user/500.ejs");
      }

      const groupInfo =
        groupRows && groupRows.length > 0
          ? groupRows[0]
          : {
              chama_name: "-",
              description: null,
              meeting_day: null,
              contribution_amount: 0,
              currency: "KES",
              is_active: 1,
              created_at: null,
            };

      connection.query(
        `SELECT u.full_name,
                COALESCE(cm.phone_number, u.phone_number) AS phone_number,
                COALESCE(cm.email, u.email) AS email,
                cm.role,
                DATE_FORMAT(cm.joined_date, '%Y-%m-%d') AS joined_date
         FROM Chama_Members cm
         JOIN Users u ON u.user_id = cm.user_id
         WHERE cm.chama_id = ?
         ORDER BY FIELD(cm.role, 'chairperson', 'secretary', 'treasurer', 'member'),
                  u.full_name ASC`,
        [chama_id],
        (membersError, memberDirectory) => {
          if (membersError) {
            console.log(
              "Member group directory load error: " + membersError.message,
            );
            return res.status(500).render("pages/user/500.ejs");
          }

          connection.query(
            `SELECT IFNULL(SUM(CASE
                                WHEN transaction_type = 'contribution'
                                     AND status = 'completed'
                                THEN amount
                                ELSE 0
                              END), 0) AS total_savings,
                    IFNULL(SUM(CASE
                                WHEN transaction_type = 'loan_repayment'
                                     AND status = 'completed'
                                THEN amount
                                ELSE 0
                              END), 0) AS total_repayments
             FROM Transactions
             WHERE chama_id = ?`,
            [chama_id],
            (txnError, txnRows) => {
              if (txnError) {
                console.log(
                  "Member group transaction summary load error: " +
                    txnError.message,
                );
                return res.status(500).render("pages/user/500.ejs");
              }

              connection.query(
                `SELECT IFNULL(SUM(amount), 0) AS total_loans_disbursed,
                        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_loans
                 FROM Loans
                 WHERE chama_id = ?`,
                [chama_id],
                (loanError, loanRows) => {
                  if (loanError) {
                    console.log(
                      "Member group loan summary load error: " +
                        loanError.message,
                    );
                    return res.status(500).render("pages/user/500.ejs");
                  }

                  const txnSummary =
                    txnRows && txnRows.length > 0
                      ? txnRows[0]
                      : { total_savings: 0, total_repayments: 0 };
                  const loanSummary =
                    loanRows && loanRows.length > 0
                      ? loanRows[0]
                      : { total_loans_disbursed: 0, active_loans: 0 };

                  const financialSummary = {
                    total_savings: Number(txnSummary.total_savings || 0),
                    total_loans_disbursed: Number(
                      loanSummary.total_loans_disbursed || 0,
                    ),
                    active_loans: Number(loanSummary.active_loans || 0),
                    total_repayments: Number(txnSummary.total_repayments || 0),
                  };

                  connection.query(
                    `SELECT document_id, title, document_type, file_name, file_path,
                            DATE_FORMAT(uploaded_at, '%Y-%m-%d %H:%i') AS uploaded_at
                     FROM Group_Documents
                     WHERE chama_id = ?
                     ORDER BY uploaded_at DESC, document_id DESC`,
                    [chama_id],
                    (docsError, governanceDocuments) => {
                      if (docsError && docsError.code !== "ER_NO_SUCH_TABLE") {
                        console.log(
                          "Member group governance docs load error: " +
                            docsError.message,
                        );
                        return res.status(500).render("pages/user/500.ejs");
                      }

                      return res.render("pages/member/group.ejs", {
                        groupInfo,
                        memberDirectory,
                        financialSummary,
                        governanceDocuments:
                          docsError && docsError.code === "ER_NO_SUCH_TABLE"
                            ? []
                            : governanceDocuments,
                      });
                    },
                  );
                },
              );
            },
          );
        },
      );
    },
  );
});

app.get("/member/profile", (req, res) => {
  if (!req.session.user) {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const user_id = req.session.user?.user_id;

  if (!chama_id || !user_id) {
    return res.render("pages/member/profile.ejs", {
      profile: {
        user_id: "-",
        full_name: "-",
        email: "-",
        phone_number: "-",
        gender: "-",
        location: "-",
        role: "member",
        joined_date: null,
      },
      contributionSummary: {
        total_contributed: 0,
        last_payment: null,
        transaction_count: 0,
      },
      activeLoans: [],
      upcomingMeetings: [],
      success: req.query.success || null,
      error: req.query.error || null,
    });
  }

  connection.query(
    `SELECT u.user_id,
            u.full_name,
            u.email,
            u.phone_number,
            u.gender,
            u.location,
            cm.role,
            DATE_FORMAT(cm.joined_date, '%Y-%m-%d') AS joined_date
     FROM Users u
     LEFT JOIN Chama_Members cm
       ON cm.user_id = u.user_id AND cm.chama_id = ?
     WHERE u.user_id = ?
     LIMIT 1`,
    [chama_id, user_id],
    (profileError, profileRows) => {
      if (profileError) {
        console.log("Member profile load error: " + profileError.message);
        return res.status(500).render("pages/user/500.ejs");
      }

      const profile =
        profileRows && profileRows.length > 0
          ? profileRows[0]
          : {
              user_id,
              full_name: "-",
              email: "-",
              phone_number: "-",
              gender: "-",
              location: "-",
              role: "member",
              joined_date: null,
            };

      connection.query(
        `SELECT IFNULL(SUM(amount), 0) AS total_contributed,
                DATE_FORMAT(MAX(created_at), '%Y-%m-%d') AS last_payment,
                COUNT(*) AS transaction_count
         FROM Transactions
         WHERE chama_id = ?
           AND user_id = ?
           AND transaction_type = 'contribution'
           AND status = 'completed'`,
        [chama_id, user_id],
        (contribError, summaryRows) => {
          if (contribError) {
            console.log(
              "Member profile contribution summary load error: " +
                contribError.message,
            );
          }

          const contributionSummary =
            !contribError && summaryRows.length > 0
              ? summaryRows[0]
              : {
                  total_contributed: 0,
                  last_payment: null,
                  transaction_count: 0,
                };

          connection.query(
            `SELECT loan_id, amount,
                    IFNULL(remaining_balance, amount) AS remaining_balance,
                    DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date,
                    status
             FROM Loans
             WHERE chama_id = ? AND user_id = ? AND status = 'active'
             ORDER BY due_date ASC, loan_id DESC`,
            [chama_id, user_id],
            (loanError, activeLoans) => {
              if (loanError) {
                console.log(
                  "Member profile active loans load error: " +
                    loanError.message,
                );
              }

              connection.query(
                `SELECT meeting_id,
                        meeting_title,
                        DATE_FORMAT(meeting_date, '%Y-%m-%d') AS meeting_date,
                        DATE_FORMAT(meeting_time, '%H:%i') AS meeting_time,
                        location,
                        agenda
                 FROM Meetings
                 WHERE chama_id = ? AND meeting_date >= CURDATE()
                 ORDER BY meeting_date ASC, meeting_time ASC
                 LIMIT 5`,
                [chama_id],
                (meetingError, upcomingMeetings) => {
                  if (
                    meetingError &&
                    meetingError.code === "ER_BAD_FIELD_ERROR"
                  ) {
                    return connection.query(
                      `SELECT meeting_id,
                              '' AS meeting_title,
                              DATE_FORMAT(meeting_date, '%Y-%m-%d') AS meeting_date,
                              '' AS meeting_time,
                              location,
                              agenda
                       FROM Meetings
                       WHERE chama_id = ? AND meeting_date >= CURDATE()
                       ORDER BY meeting_date ASC
                       LIMIT 5`,
                      [chama_id],
                      (fallbackMeetingError, fallbackMeetings) => {
                        return res.render("pages/member/profile.ejs", {
                          profile,
                          contributionSummary,
                          activeLoans: loanError ? [] : activeLoans,
                          upcomingMeetings: fallbackMeetingError
                            ? []
                            : fallbackMeetings,
                          success: req.query.success || null,
                          error: req.query.error || null,
                        });
                      },
                    );
                  }

                  if (meetingError) {
                    console.log(
                      "Member profile meetings load error: " +
                        meetingError.message,
                    );
                  }

                  return res.render("pages/member/profile.ejs", {
                    profile,
                    contributionSummary,
                    activeLoans: loanError ? [] : activeLoans,
                    upcomingMeetings: meetingError ? [] : upcomingMeetings,
                    success: req.query.success || null,
                    error: req.query.error || null,
                  });
                },
              );
            },
          );
        },
      );
    },
  );
});

app.post("/member/profile/update", (req, res) => {
  if (!req.session.user) {
    return res.status(401).render("pages/user/401.ejs");
  }

  const user_id = req.session.user?.user_id;
  if (!user_id) {
    return res.redirect(
      `/member/profile?error=${encodeURIComponent("Unable to identify your account.")}`,
    );
  }

  const genderInput = String(req.body.gender || "")
    .trim()
    .toLowerCase();
  const validGenders = ["", "male", "female", "other"];
  if (!validGenders.includes(genderInput)) {
    return res.redirect(
      `/member/profile?error=${encodeURIComponent("Please select a valid gender option.")}`,
    );
  }

  const email = String(req.body.email || "").trim() || null;
  const phone_number = String(req.body.phone || "").trim() || null;
  const location = String(req.body.city || "").trim() || null;
  const gender = genderInput || null;

  connection.query(
    `UPDATE Users
     SET email = ?,
         phone_number = ?,
         gender = ?,
         location = ?
     WHERE user_id = ?`,
    [email, phone_number, gender, location, user_id],
    (updateError) => {
      if (updateError) {
        if (updateError.code === "ER_DUP_ENTRY") {
          return res.redirect(
            `/member/profile?error=${encodeURIComponent("That phone number is already in use.")}`,
          );
        }

        console.log("Member profile update error: " + updateError.message);
        return res.redirect(
          `/member/profile?error=${encodeURIComponent("Failed to update profile. Please try again.")}`,
        );
      }

      return res.redirect(
        `/member/profile?success=${encodeURIComponent("Profile updated successfully.")}`,
      );
    },
  );
});

// Treasurer Routes
app.get("/treasurer/dashboard", (req, res) => {
  res.render("pages/treasurer/dashboard.ejs");
});

app.get("/treasurer/contributions", (req, res) => {
  if (!req.session.user || req.session.role !== "treasurer") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;

  connection.query(
    `SELECT t.transaction_id, t.amount, t.status,
            DATE_FORMAT(t.created_at, '%Y-%m-%d') AS contribution_date,
            t.description,
            u.full_name AS member_name
     FROM Transactions t
     JOIN Users u ON u.user_id = t.user_id
     WHERE t.chama_id = ? AND t.transaction_type = 'contribution'
     ORDER BY t.created_at DESC, t.transaction_id DESC
     LIMIT 10`,
    [chama_id],
    (recentError, recentContributions) => {
      if (recentError) {
        console.log(
          "Treasurer recent contributions load error: " + recentError.message,
        );
        return res.status(500).render("pages/user/500.ejs");
      }

      connection.query(
        `SELECT u.user_id, u.full_name
         FROM Users u
         JOIN Chama_Members cm ON cm.user_id = u.user_id
         WHERE cm.chama_id = ?
         ORDER BY u.full_name ASC`,
        [chama_id],
        (membersError, members) => {
          if (membersError) {
            console.log(
              "Treasurer contribution members load error: " +
                membersError.message,
            );
            return res.status(500).render("pages/user/500.ejs");
          }

          return res.render("pages/treasurer/contributions.ejs", {
            recentContributions,
            members,
            success: req.query.success || null,
            error: req.query.error || null,
          });
        },
      );
    },
  );
});

app.post("/treasurer/contributions/record", (req, res) => {
  if (!req.session.user || req.session.role !== "treasurer") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const { user_id, amount, method, contribution_date } = req.body;
  const numericAmount = Number(amount);

  if (!user_id || !numericAmount || numericAmount <= 0 || !method) {
    return res.redirect(
      "/treasurer/contributions?error=Provide member, amount, and payment method.",
    );
  }

  connection.query(
    `SELECT member_id
     FROM Chama_Members
     WHERE chama_id = ? AND user_id = ?
     LIMIT 1`,
    [chama_id, user_id],
    (memberError, memberRows) => {
      if (memberError) {
        console.log("Contribution member check error: " + memberError.message);
        return res.status(500).render("pages/user/500.ejs");
      }

      if (memberRows.length === 0) {
        return res.redirect(
          "/treasurer/contributions?error=Selected user is not a member of this chama.",
        );
      }

      const txDate = contribution_date
        ? `${contribution_date} 12:00:00`
        : new Date();
      const txMonth = contribution_date
        ? contribution_date.slice(0, 7)
        : new Date().toISOString().slice(0, 7);

      connection.query(
        `INSERT INTO Transactions
           (chama_id, user_id, transaction_type, amount, month, description, status, created_at)
         VALUES
           (?, ?, 'contribution', ?, ?, ?, 'completed', ?)`,
        [
          chama_id,
          user_id,
          numericAmount,
          txMonth,
          `Payment Method: ${method}`,
          txDate,
        ],
        (insertError) => {
          if (insertError) {
            console.log("Contribution insert error: " + insertError.message);
            return res.redirect(
              "/treasurer/contributions?error=Could not record contribution.",
            );
          }

          connection.query(
            `UPDATE Chama_Members
             SET total_contributions = IFNULL(total_contributions, 0) + ?
             WHERE chama_id = ? AND user_id = ?`,
            [numericAmount, chama_id, user_id],
            (updateError) => {
              if (updateError) {
                console.log(
                  "Contribution total update warning: " + updateError.message,
                );
              }

              return res.redirect(
                "/treasurer/contributions?success=Contribution recorded successfully.",
              );
            },
          );
        },
      );
    },
  );
});

app.get("/treasurer/loans", (req, res) => {
  if (!req.session.user || req.session.role !== "treasurer") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;

  connection.query(
    `SELECT l.loan_id, l.amount, l.status,
            DATE_FORMAT(l.issue_date, '%Y-%m-%d') AS applied_date,
            DATE_FORMAT(l.due_date, '%Y-%m-%d') AS due_date,
            DATE_FORMAT(l.approved_at, '%Y-%m-%d %H:%i') AS approved_at,
            DATE_FORMAT(l.rejected_at, '%Y-%m-%d %H:%i') AS rejected_at,
            IFNULL(l.remaining_balance, l.amount) AS remaining_balance,
            u.full_name AS member_name
     FROM Loans l
     JOIN Users u ON u.user_id = l.user_id
     WHERE l.chama_id = ?
     ORDER BY l.issue_date DESC, l.loan_id DESC`,
    [chama_id],
    (loansError, loans) => {
      if (loansError) {
        console.log("Treasurer loans load error: " + loansError.message);
        return res.status(500).render("pages/user/500.ejs");
      }

      const pendingLoans = loans.filter((loan) => loan.status === "pending");
      const activeLoans = loans.filter((loan) => loan.status === "active");
      const rejectedLoans = loans.filter((loan) => loan.status === "rejected");

      return res.render("pages/treasurer/loans.ejs", {
        pendingLoans,
        activeLoans,
        rejectedLoans,
        success: req.query.success || null,
        error: req.query.error || null,
      });
    },
  );
});

app.post("/treasurer/loans/:loanId/decision", (req, res) => {
  if (!req.session.user || req.session.role !== "treasurer") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const { loanId } = req.params;
  const { decision } = req.body;
  const chama_id = req.session.chama_id;

  if (!loanId || !decision) {
    return res.redirect("/treasurer/loans?error=Invalid loan action.");
  }

  if (decision === "approve") {
    connection.query(
      `UPDATE Loans
       SET status = 'active', approved_at = NOW(), rejected_at = NULL
       WHERE loan_id = ? AND chama_id = ? AND status = 'pending'`,
      [loanId, chama_id],
      (updateError, updateResult) => {
        if (updateError) {
          console.log("Loan approve error: " + updateError.message);
          return res.redirect("/treasurer/loans?error=Could not approve loan.");
        }

        if (updateResult.affectedRows === 0) {
          return res.redirect(
            "/treasurer/loans?error=Loan was not found in pending applications.",
          );
        }

        return res.redirect(
          "/treasurer/loans?success=Loan approved successfully.",
        );
      },
    );
    return;
  }

  if (decision === "disapprove") {
    connection.query(
      `UPDATE Loans
       SET status = 'rejected', rejected_at = NOW(), approved_at = NULL
       WHERE loan_id = ? AND chama_id = ? AND status = 'pending'`,
      [loanId, chama_id],
      (updateError, updateResult) => {
        if (updateError) {
          console.log("Loan disapprove error: " + updateError.message);
          return res.redirect(
            "/treasurer/loans?error=Could not disapprove loan.",
          );
        }

        if (updateResult.affectedRows === 0) {
          return res.redirect(
            "/treasurer/loans?error=Loan was not found in pending applications.",
          );
        }

        return res.redirect(
          "/treasurer/loans?success=Loan disapproved and moved to rejected history.",
        );
      },
    );
    return;
  }

  return res.redirect("/treasurer/loans?error=Unknown decision provided.");
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

app.get("/treasurer/settings", (req, res) => {
  if (!req.session.user || req.session.role !== "treasurer") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;

  connection.query(
    `SELECT contribution_amount,
            IFNULL(contribution_due_day, 5) AS contribution_due_day,
            currency
     FROM Chama
     WHERE chama_id = ?
     LIMIT 1`,
    [chama_id],
    (settingsError, settingsRows) => {
      if (settingsError && settingsError.code === "ER_BAD_FIELD_ERROR") {
        return connection.query(
          `SELECT contribution_amount, currency
           FROM Chama
           WHERE chama_id = ?
           LIMIT 1`,
          [chama_id],
          (fallbackError, fallbackRows) => {
            if (fallbackError || fallbackRows.length === 0) {
              console.log(
                "Treasurer settings fallback load error: " +
                  fallbackError?.message,
              );
              return res.status(500).render("pages/user/500.ejs");
            }

            const settings = {
              ...fallbackRows[0],
              contribution_due_day: 5,
            };
            const nextDueDate = toYmd(
              getNextMonthlyDueDate(settings.contribution_due_day, new Date()),
            );

            return res.render("pages/treasurer/settings.ejs", {
              settings,
              nextDueDate,
              success: req.query.success || null,
              error: req.query.error || null,
            });
          },
        );
      }

      if (settingsError || settingsRows.length === 0) {
        console.log("Treasurer settings load error: " + settingsError?.message);
        return res.status(500).render("pages/user/500.ejs");
      }

      const settings = settingsRows[0];
      const nextDueDate = toYmd(
        getNextMonthlyDueDate(settings.contribution_due_day, new Date()),
      );

      return res.render("pages/treasurer/settings.ejs", {
        settings,
        nextDueDate,
        success: req.query.success || null,
        error: req.query.error || null,
      });
    },
  );
});

app.post("/treasurer/settings", (req, res) => {
  if (!req.session.user || req.session.role !== "treasurer") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const contributionAmount = Number(req.body.contribution_amount);

  if (!contributionAmount || contributionAmount <= 0) {
    return res.redirect(
      "/treasurer/settings?error=Enter a valid monthly contribution amount.",
    );
  }

  // Business rule requested: contribution due day is fixed to the 5th.
  connection.query(
    `UPDATE Chama
     SET contribution_amount = ?, contribution_due_day = 5
     WHERE chama_id = ?`,
    [contributionAmount, chama_id],
    (updateError) => {
      if (updateError) {
        if (updateError.code === "ER_BAD_FIELD_ERROR") {
          return connection.query(
            `UPDATE Chama
             SET contribution_amount = ?
             WHERE chama_id = ?`,
            [contributionAmount, chama_id],
            (fallbackUpdateError) => {
              if (fallbackUpdateError) {
                console.log(
                  "Treasurer settings fallback update error: " +
                    fallbackUpdateError.message,
                );
                return res.redirect(
                  "/treasurer/settings?error=Could not save settings.",
                );
              }

              return res.redirect(
                "/treasurer/settings?success=Settings saved successfully.",
              );
            },
          );
        }

        console.log("Treasurer settings update error: " + updateError.message);
        return res.redirect(
          "/treasurer/settings?error=Could not save settings.",
        );
      }

      return res.redirect(
        "/treasurer/settings?success=Settings saved successfully.",
      );
    },
  );
});

// Secretary Routes
app.get("/secretary/dashboard", (req, res) => {
  res.render("pages/secretary/dashboard.ejs");
});

app.get("/secretary/meetings", (req, res) => {
  if (!req.session.user || req.session.role !== "secretary") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;

  const loadMembersAndRender = (meetingsData) => {
    connection.query(
      `SELECT u.user_id, u.full_name, cm.role
       FROM Users u
       JOIN Chama_Members cm ON cm.user_id = u.user_id
       WHERE cm.chama_id = ?
       ORDER BY u.full_name ASC`,
      [chama_id],
      (membersError, members) => {
        if (membersError) {
          console.log(
            "Secretary meeting members load error: " + membersError.message,
          );
          return res.status(500).render("pages/user/500.ejs");
        }

        return res.render("pages/secretary/meetings.ejs", {
          meetings: meetingsData,
          members,
          success: req.query.success || null,
          error: req.query.error || null,
        });
      },
    );
  };

  connection.query(
    `SELECT meeting_id,
            meeting_title,
            DATE_FORMAT(meeting_date, '%Y-%m-%d') AS meeting_date,
            DATE_FORMAT(meeting_time, '%H:%i') AS meeting_time,
            location,
            agenda,
            CASE
              WHEN meeting_date >= CURDATE() THEN 'upcoming'
              ELSE 'completed'
            END AS meeting_status
     FROM Meetings
     WHERE chama_id = ?
     ORDER BY meeting_date DESC, meeting_time DESC, meeting_id DESC`,
    [chama_id],
    (meetingsError, meetings) => {
      if (meetingsError) {
        if (meetingsError.code === "ER_BAD_FIELD_ERROR") {
          return connection.query(
            `SELECT meeting_id,
                    '' AS meeting_title,
                    DATE_FORMAT(meeting_date, '%Y-%m-%d') AS meeting_date,
                    '' AS meeting_time,
                    location,
                    agenda,
                    CASE
                      WHEN meeting_date >= CURDATE() THEN 'upcoming'
                      ELSE 'completed'
                    END AS meeting_status
             FROM Meetings
             WHERE chama_id = ?
             ORDER BY meeting_date DESC, meeting_id DESC`,
            [chama_id],
            (fallbackError, fallbackMeetings) => {
              if (fallbackError) {
                console.log(
                  "Secretary meetings fallback load error: " +
                    fallbackError.message,
                );
                return res.status(500).render("pages/user/500.ejs");
              }

              return loadMembersAndRender(fallbackMeetings);
            },
          );
        }

        console.log("Secretary meetings load error: " + meetingsError.message);
        return res.status(500).render("pages/user/500.ejs");
      }

      return loadMembersAndRender(meetings);
    },
  );
});

app.post("/secretary/meetings/attendance", (req, res) => {
  if (!req.session.user || req.session.role !== "secretary") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const meetingId = Number(req.body.meeting_id);

  if (!meetingId || meetingId <= 0) {
    return res.redirect(
      "/secretary/meetings?error=Please select a valid meeting.",
    );
  }

  const selectedRaw = req.body.present_members;
  const selectedMembers = Array.isArray(selectedRaw)
    ? selectedRaw
    : selectedRaw
      ? [selectedRaw]
      : [];

  const selectedMemberIds = [
    ...new Set(
      selectedMembers
        .map((memberId) => Number(memberId))
        .filter((memberId) => Number.isInteger(memberId) && memberId > 0),
    ),
  ];

  connection.query(
    `SELECT meeting_id
     FROM Meetings
     WHERE meeting_id = ? AND chama_id = ?
     LIMIT 1`,
    [meetingId, chama_id],
    (meetingError, meetingRows) => {
      if (meetingError) {
        console.log("Attendance meeting lookup error: " + meetingError.message);
        return res.status(500).render("pages/user/500.ejs");
      }

      if (!meetingRows || meetingRows.length === 0) {
        return res.redirect(
          "/secretary/meetings?error=Meeting not found for this chama.",
        );
      }

      connection.query(
        "DELETE FROM Meeting_Attendance WHERE meeting_id = ?",
        [meetingId],
        (deleteError) => {
          if (deleteError) {
            console.log("Attendance reset error: " + deleteError.message);
            return res.status(500).render("pages/user/500.ejs");
          }

          if (selectedMemberIds.length === 0) {
            return res.redirect(
              `/secretary/meetings/${meetingId}?success=${encodeURIComponent("Attendance saved successfully.")}`,
            );
          }

          connection.query(
            `SELECT user_id
             FROM Chama_Members
             WHERE chama_id = ? AND user_id IN (?)`,
            [chama_id, selectedMemberIds],
            (membersError, validMembers) => {
              if (membersError) {
                console.log(
                  "Attendance member validation error: " + membersError.message,
                );
                return res.status(500).render("pages/user/500.ejs");
              }

              const validMemberIds = validMembers.map((row) =>
                Number(row.user_id),
              );
              if (validMemberIds.length === 0) {
                return res.redirect(
                  "/secretary/meetings?error=No valid members selected.",
                );
              }

              const placeholders = validMemberIds
                .map(() => "(?, ?, 1)")
                .join(", ");
              const params = [];
              validMemberIds.forEach((memberId) => {
                params.push(meetingId, memberId);
              });

              connection.query(
                `INSERT INTO Meeting_Attendance (meeting_id, user_id, attended)
                 VALUES ${placeholders}`,
                params,
                (insertError) => {
                  if (insertError) {
                    console.log(
                      "Attendance save error: " + insertError.message,
                    );
                    return res.status(500).render("pages/user/500.ejs");
                  }

                  return res.redirect(
                    `/secretary/meetings/${meetingId}?success=${encodeURIComponent("Attendance saved successfully.")}`,
                  );
                },
              );
            },
          );
        },
      );
    },
  );
});

app.post(
  "/secretary/meetings/attachments",
  meetingAttachmentUpload.array("attachments", 10),
  (req, res) => {
    if (!req.session.user || req.session.role !== "secretary") {
      return res.status(401).render("pages/user/401.ejs");
    }

    const chama_id = req.session.chama_id;
    const meetingId = Number(req.body.meeting_id);

    if (!meetingId || meetingId <= 0) {
      return res.redirect(
        "/secretary/meetings?error=Please select a valid meeting for attachments.",
      );
    }

    const uploadedFiles = req.files || [];
    if (uploadedFiles.length === 0) {
      return res.redirect(
        "/secretary/meetings?error=Please choose at least one attachment.",
      );
    }

    connection.query(
      `SELECT meeting_id
       FROM Meetings
       WHERE meeting_id = ? AND chama_id = ?
       LIMIT 1`,
      [meetingId, chama_id],
      (meetingError, meetingRows) => {
        if (meetingError) {
          console.log(
            "Attachment meeting lookup error: " + meetingError.message,
          );
          return res.status(500).render("pages/user/500.ejs");
        }

        if (!meetingRows || meetingRows.length === 0) {
          return res.redirect(
            "/secretary/meetings?error=Meeting not found for this chama.",
          );
        }

        const placeholders = uploadedFiles.map(() => "(?, ?, ?, ?)").join(", ");
        const params = [];
        uploadedFiles.forEach((file) => {
          params.push(
            meetingId,
            file.originalname,
            `/uploads/meetings/${file.filename}`,
            req.session.user.user_id,
          );
        });

        connection.query(
          `INSERT INTO Meeting_Attachments (meeting_id, file_name, file_path, uploaded_by)
           VALUES ${placeholders}`,
          params,
          (insertError) => {
            if (insertError) {
              if (insertError.code === "ER_NO_SUCH_TABLE") {
                return res.redirect(
                  "/secretary/meetings?error=Attachment table is missing. Run DB migration first.",
                );
              }

              console.log("Attachment save error: " + insertError.message);
              return res.status(500).render("pages/user/500.ejs");
            }

            return res.redirect(
              `/secretary/meetings/${meetingId}?success=${encodeURIComponent("Attachments uploaded successfully.")}`,
            );
          },
        );
      },
    );
  },
);

app.get("/secretary/meetings/:meetingId", (req, res) => {
  if (!req.session.user || req.session.role !== "secretary") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const meetingId = Number(req.params.meetingId);

  if (!meetingId || meetingId <= 0) {
    return res.status(404).render("pages/user/404.ejs");
  }

  connection.query(
    `SELECT meeting_id,
            meeting_title,
            DATE_FORMAT(meeting_date, '%Y-%m-%d') AS meeting_date,
            DATE_FORMAT(meeting_time, '%H:%i') AS meeting_time,
            location,
            agenda,
            decisions
     FROM Meetings
     WHERE meeting_id = ? AND chama_id = ?
     LIMIT 1`,
    [meetingId, chama_id],
    (meetingError, meetingRows) => {
      const loadMeetingAndSummary = (meetingData) => {
        connection.query(
          `SELECT COUNT(*) AS total_members,
                  SUM(CASE WHEN ma.attended = 1 THEN 1 ELSE 0 END) AS present_count
           FROM Chama_Members cm
           LEFT JOIN Meeting_Attendance ma
             ON ma.user_id = cm.user_id AND ma.meeting_id = ?
           WHERE cm.chama_id = ?`,
          [meetingId, chama_id],
          (summaryError, summaryRows) => {
            if (summaryError) {
              console.log(
                "Meeting attendance summary load error: " +
                  summaryError.message,
              );
              return res.status(500).render("pages/user/500.ejs");
            }

            const totalMembers = Number(summaryRows[0]?.total_members || 0);
            const presentCount = Number(summaryRows[0]?.present_count || 0);
            const absentCount = Math.max(totalMembers - presentCount, 0);

            connection.query(
              `SELECT u.full_name
               FROM Meeting_Attendance ma
               JOIN Users u ON u.user_id = ma.user_id
               WHERE ma.meeting_id = ? AND ma.attended = 1
               ORDER BY u.full_name ASC`,
              [meetingId],
              (presentError, presentMembers) => {
                if (presentError) {
                  console.log(
                    "Meeting present members load error: " +
                      presentError.message,
                  );
                  return res.status(500).render("pages/user/500.ejs");
                }

                connection.query(
                  `SELECT u.full_name
                   FROM Chama_Members cm
                   JOIN Users u ON u.user_id = cm.user_id
                   LEFT JOIN Meeting_Attendance ma
                     ON ma.user_id = cm.user_id AND ma.meeting_id = ?
                   WHERE cm.chama_id = ?
                     AND (ma.user_id IS NULL OR ma.attended = 0)
                   ORDER BY u.full_name ASC`,
                  [meetingId, chama_id],
                  (absentError, absentMembers) => {
                    if (absentError) {
                      console.log(
                        "Meeting absent members load error: " +
                          absentError.message,
                      );
                      return res.status(500).render("pages/user/500.ejs");
                    }

                    connection.query(
                      `SELECT attachment_id,
                              file_name,
                              file_path,
                              DATE_FORMAT(uploaded_at, '%Y-%m-%d %H:%i') AS uploaded_at
                       FROM Meeting_Attachments
                       WHERE meeting_id = ?
                       ORDER BY uploaded_at DESC, attachment_id DESC`,
                      [meetingId],
                      (attachmentError, attachments) => {
                        if (
                          attachmentError &&
                          attachmentError.code !== "ER_NO_SUCH_TABLE"
                        ) {
                          console.log(
                            "Meeting attachments load error: " +
                              attachmentError.message,
                          );
                          return res.status(500).render("pages/user/500.ejs");
                        }

                        return res.render(
                          "pages/secretary/meeting-details.ejs",
                          {
                            meeting: meetingData,
                            success: req.query.success || null,
                            attendanceSummary: {
                              totalMembers,
                              presentCount,
                              absentCount,
                            },
                            presentMembers,
                            absentMembers,
                            attachments:
                              attachmentError &&
                              attachmentError.code === "ER_NO_SUCH_TABLE"
                                ? []
                                : attachments,
                          },
                        );
                      },
                    );
                  },
                );
              },
            );
          },
        );
      };

      if (meetingError) {
        if (meetingError.code === "ER_BAD_FIELD_ERROR") {
          return connection.query(
            `SELECT meeting_id,
                    '' AS meeting_title,
                    DATE_FORMAT(meeting_date, '%Y-%m-%d') AS meeting_date,
                    '' AS meeting_time,
                    location,
                    agenda,
                    decisions
             FROM Meetings
             WHERE meeting_id = ? AND chama_id = ?
             LIMIT 1`,
            [meetingId, chama_id],
            (fallbackError, fallbackRows) => {
              if (fallbackError) {
                console.log(
                  "Meeting details fallback load error: " +
                    fallbackError.message,
                );
                return res.status(500).render("pages/user/500.ejs");
              }

              if (!fallbackRows || fallbackRows.length === 0) {
                return res.status(404).render("pages/user/404.ejs");
              }

              return loadMeetingAndSummary(fallbackRows[0]);
            },
          );
        }

        console.log("Meeting details load error: " + meetingError.message);
        return res.status(500).render("pages/user/500.ejs");
      }

      if (!meetingRows || meetingRows.length === 0) {
        return res.status(404).render("pages/user/404.ejs");
      }

      return loadMeetingAndSummary(meetingRows[0]);
    },
  );
});

app.post("/secretary/meetings/create", (req, res) => {
  if (!req.session.user || req.session.role !== "secretary") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const {
    meeting_title,
    meeting_date,
    meeting_time,
    meeting_location,
    meeting_agenda,
  } = req.body;

  if (
    !meeting_title ||
    !meeting_title.trim() ||
    !meeting_date ||
    !meeting_time ||
    !meeting_location ||
    !meeting_location.trim() ||
    !meeting_agenda ||
    !meeting_agenda.trim()
  ) {
    return res.redirect(
      "/secretary/meetings?error=Please fill in all required meeting fields.",
    );
  }

  connection.query(
    `INSERT INTO Meetings (chama_id, meeting_title, meeting_date, meeting_time, location, agenda)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      chama_id,
      meeting_title.trim(),
      meeting_date,
      meeting_time,
      meeting_location.trim(),
      meeting_agenda.trim(),
    ],
    (createError) => {
      if (createError) {
        if (createError.code === "ER_BAD_FIELD_ERROR") {
          return connection.query(
            `INSERT INTO Meetings (chama_id, meeting_date, location, agenda)
             VALUES (?, ?, ?, ?)`,
            [
              chama_id,
              meeting_date,
              meeting_location.trim(),
              `Title: ${meeting_title.trim()} | Time: ${meeting_time}\n${meeting_agenda.trim()}`,
            ],
            (fallbackCreateError) => {
              if (fallbackCreateError) {
                console.log(
                  "Create meeting fallback error: " +
                    fallbackCreateError.message,
                );
                return res.redirect(
                  "/secretary/meetings?error=Could not create meeting record.",
                );
              }

              return res.redirect(
                "/secretary/meetings?success=Meeting record created successfully.",
              );
            },
          );
        }

        console.log("Create meeting error: " + createError.message);
        return res.redirect(
          "/secretary/meetings?error=Could not create meeting record.",
        );
      }

      return res.redirect(
        "/secretary/meetings?success=Meeting record created successfully.",
      );
    },
  );
});

app.get("/secretary/documents", (req, res) => {
  res.render("pages/secretary/documents.ejs");
});

app.get("/secretary/communications", (req, res) => {
  if (!req.session.user || req.session.role !== "secretary") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const success =
    req.query.success === "1" ? "Announcement sent successfully." : null;
  const error = req.query.error || null;

  connection.query(
    `SELECT a.announcement_id, a.title, a.content, a.priority,
            DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i') AS created_at,
            u.full_name AS posted_by
     FROM Announcements a
     JOIN Users u ON u.user_id = a.posted_by
     WHERE a.chama_id = ?
     ORDER BY a.created_at DESC`,
    [chama_id],
    (err, announcements) => {
      res.render("pages/secretary/communications.ejs", {
        announcements: err ? [] : announcements,
        success,
        error,
      });
    },
  );
});

app.post("/secretary/send-announcement", (req, res) => {
  if (!req.session.user || req.session.role !== "secretary") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const { title, content, priority } = req.body;
  const chama_id = req.session.chama_id;
  const posted_by = req.session.user.user_id;

  if (!title || !title.trim() || !content || !content.trim()) {
    return res.redirect(
      "/secretary/communications?error=Title and content are required.",
    );
  }

  connection.query(
    "INSERT INTO Announcements (chama_id, posted_by, title, content, priority) VALUES (?, ?, ?, ?, ?)",
    [chama_id, posted_by, title.trim(), content.trim(), priority || "normal"],
    (err) => {
      if (err) {
        console.log("Announcement insert error: " + err.message);
        return res.redirect(
          "/secretary/communications?error=Could not save announcement. Please try again.",
        );
      }
      return res.redirect("/secretary/communications?success=1");
    },
  );
});

app.get("/secretary/member-records", (req, res) => {
  if (!req.session.user || req.session.role !== "secretary") {
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
        console.log("Secretary members load error: " + membersError.message);
        return res.status(500).render("pages/user/500.ejs");
      }

      return res.render("pages/secretary/member-records.ejs", {
        members,
        success: req.query.success || null,
        error: req.query.error || null,
      });
    },
  );
});

app.post("/secretary/add-member", (req, res) => {
  if (!req.session.user || req.session.role !== "secretary") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const { full_name, phone_number, email, password } = req.body;
  const chama_id = req.session.chama_id;

  if (!full_name || !phone_number || !email || !password || !chama_id) {
    return res.redirect(
      "/secretary/member-records?error=Please fill in all required fields.",
    );
  }

  bcrypt.hash(password, 10, (hashError, hash) => {
    if (hashError) {
      return res.status(500).render("pages/user/500.ejs");
    }

    connection.query(
      "INSERT INTO Users (full_name, phone_number, email, password_hash, user_type) VALUES (?, ?, ?, ?, 'member')",
      [full_name, phone_number, email, hash],
      (userError, userResult) => {
        if (userError) {
          console.log("Secretary add member user error: " + userError.message);
          return res.redirect(
            "/secretary/member-records?error=Could not add member. Email or phone may already be registered.",
          );
        }

        connection.query(
          "INSERT INTO Chama_Members (user_id, chama_id, role, email, phone_number, joined_date) VALUES (?, ?, 'member', ?, ?, CURDATE())",
          [userResult.insertId, chama_id, email, phone_number],
          (memberError) => {
            if (memberError) {
              console.log(
                "Secretary add member link error: " + memberError.message,
              );
              return res.redirect(
                "/secretary/member-records?error=Could not link member to this Chama.",
              );
            }

            return res.redirect(
              "/secretary/member-records?success=Member added successfully.",
            );
          },
        );
      },
    );
  });
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
  if (!req.session.user || req.session.role !== "chairperson") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;

  connection.query(
    `SELECT document_id, title, document_type, file_name, file_path,
            DATE_FORMAT(uploaded_at, '%Y-%m-%d %H:%i') AS uploaded_at
     FROM Group_Documents
     WHERE chama_id = ?
     ORDER BY uploaded_at DESC, document_id DESC`,
    [chama_id],
    (docsError, governanceDocuments) => {
      if (docsError && docsError.code !== "ER_NO_SUCH_TABLE") {
        console.log(
          "Chairperson governance docs load error: " + docsError.message,
        );
        return res.status(500).render("pages/user/500.ejs");
      }

      return res.render("pages/chairperson/governance.ejs", {
        governanceDocuments:
          docsError && docsError.code === "ER_NO_SUCH_TABLE"
            ? []
            : governanceDocuments,
        success: req.query.success || null,
        error: req.query.error || null,
      });
    },
  );
});

app.post(
  "/chairperson/governance/documents",
  governanceDocsUpload.single("governance_document"),
  (req, res) => {
    if (!req.session.user || req.session.role !== "chairperson") {
      return res.status(401).render("pages/user/401.ejs");
    }

    const chama_id = req.session.chama_id;
    const uploaded_by = req.session.user.user_id;
    const title = String(req.body.title || "").trim();
    const document_type = String(req.body.document_type || "").trim();

    if (!req.file) {
      return res.redirect(
        "/chairperson/governance?error=Please choose a document to upload.",
      );
    }

    if (!title || !document_type) {
      return res.redirect(
        "/chairperson/governance?error=Please provide title and document type.",
      );
    }

    if (!["constitution", "bylaws"].includes(document_type)) {
      return res.redirect(
        "/chairperson/governance?error=Invalid document type selected.",
      );
    }

    const file_path = `/uploads/governance/${req.file.filename}`;

    connection.query(
      `INSERT INTO Group_Documents
       (chama_id, title, document_type, file_name, file_path, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        chama_id,
        title,
        document_type,
        req.file.originalname,
        file_path,
        uploaded_by,
      ],
      (insertError) => {
        if (insertError) {
          if (insertError.code === "ER_NO_SUCH_TABLE") {
            return res.redirect(
              "/chairperson/governance?error=Governance documents table is missing. Run latest migration.",
            );
          }

          console.log(
            "Chairperson governance document upload error: " +
              insertError.message,
          );
          return res.status(500).render("pages/user/500.ejs");
        }

        return res.redirect(
          "/chairperson/governance?success=Document uploaded successfully.",
        );
      },
    );
  },
);

app.get("/chairperson/meetings", (req, res) => {
  res.render("pages/chairperson/meetings.ejs");
});

app.get("/chairperson/welfare", (req, res) => {
  res.render("pages/chairperson/welfare.ejs");
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
