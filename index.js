//1.Import and configure package modulesat the top of the file
const mysql = require("mysql2");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path"); //allows us to work with file and directory paths in a way that is compatible across different operating systems
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
      maxAge: 60 * 60 * 1000 * 24, // 24 hours
    },
  }),
);
const publicRoutes = [
  "/",
  "/landing page",
  "/services",
  "/about",
  "/privacy",
  "/signup",
  "/login",
  "/join",
  "/forgot-password",
  "/contact",
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
  "/secretary/upload-document",
  "/secretary/communications",
  "/secretary/member-records",
];
const chairpersonRoutes = [
  "/chairperson/dashboard",
  "/chairperson/members",
  "/chairperson/governance",
  "/chairperson/meetings",
  "/chairperson/reports",
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
app.use(express.json()); // Middleware to parse JSON bodies
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

app.get("/privacy", (req, res) => {
  res.render("pages/user/privacy.ejs");
});

app.post("/contact", (req, res) => {
  const { contact_name, contact_email, contact_message } = req.body;

  // Validation
  if (!contact_name || !contact_email || !contact_message) {
    return res.status(400).json({
      success: false,
      error: "Please fill in all fields.",
    });
  }

  // Trim values
  const name = String(contact_name).trim();
  const email = String(contact_email).trim();
  const message = String(contact_message).trim();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: "Please enter a valid email address.",
    });
  }

  // Validate message length
  if (message.length < 10) {
    return res.status(400).json({
      success: false,
      error: "Message must be at least 10 characters long.",
    });
  }

  // Store contact message in database
  connection.query(
    `INSERT INTO Contact_Messages (contact_name, contact_email, message, status)
     VALUES (?, ?, ?, 'new')`,
    [name, email, message],
    (insertError) => {
      if (insertError) {
        console.log("Contact form submission error: " + insertError.message);
        return res.status(500).json({
          success: false,
          error: "Failed to send message. Please try again later.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Thank you for your message. We will get back to you soon!",
      });
    },
  );
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
  const currentRole = req.session.role || req.session.user?.role || "member";
  const isCommitteeMember = ["chairperson", "secretary", "treasurer"].includes(
    currentRole,
  );

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
    const specialMeetings = meetingsList
      .filter((m) => m.meeting_kind === "special")
      .sort((a, b) => {
        const aStamp = `${a.meeting_date} ${a.meeting_time || "00:00"}`;
        const bStamp = `${b.meeting_date} ${b.meeting_time || "00:00"}`;
        return bStamp.localeCompare(aStamp);
      });

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
          specialMeetings,
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
            invite_scope,
            meeting_kind,
            agenda,
            decisions,
            CASE
              WHEN meeting_date >= CURDATE() THEN 'upcoming'
              ELSE 'completed'
            END AS meeting_status
     FROM Meetings
     WHERE chama_id = ?
       AND (? = 1 OR invite_scope = 'all_members')
     ORDER BY meeting_date DESC, meeting_time DESC, meeting_id DESC`,
    [chama_id, isCommitteeMember ? 1 : 0],
    (meetingsError, meetings) => {
      if (meetingsError) {
        if (meetingsError.code === "ER_BAD_FIELD_ERROR") {
          return connection.query(
            `SELECT meeting_id,
                    '' AS meeting_title,
                    DATE_FORMAT(meeting_date, '%Y-%m-%d') AS meeting_date,
                    '' AS meeting_time,
                    location,
                    CASE
                      WHEN agenda LIKE '[KIND:special][SCOPE:committee]%' THEN 'committee'
                      ELSE 'all_members'
                    END AS invite_scope,
                    CASE
                      WHEN agenda LIKE '[KIND:special]%' THEN 'special'
                      ELSE 'regular'
                    END AS meeting_kind,
                    REPLACE(
                      REPLACE(
                        agenda,
                        '[KIND:special][SCOPE:committee] ',
                        ''
                      ),
                      '[KIND:special][SCOPE:all_members] ',
                      ''
                    ) AS agenda,
                    decisions,
                    CASE
                      WHEN meeting_date >= CURDATE() THEN 'upcoming'
                      ELSE 'completed'
                    END AS meeting_status
             FROM Meetings
             WHERE chama_id = ?
               AND (
                 ? = 1
                 OR CASE
                      WHEN agenda LIKE '[KIND:special][SCOPE:committee]%' THEN 'committee'
                      ELSE 'all_members'
                    END = 'all_members'
               )
             ORDER BY meeting_date DESC, meeting_id DESC`,
            [chama_id, isCommitteeMember ? 1 : 0],
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
  const user_id = req.session.user?.user_id;

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
        `SELECT u.user_id,
          u.full_name,
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
                `SELECT IFNULL(SUM(CASE WHEN status != 'rejected' THEN amount ELSE 0 END), 0) AS total_loans_disbursed,
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
                    `SELECT gd.document_id, gd.title, gd.document_type, gd.file_name, gd.file_path,
                            DATE_FORMAT(gd.uploaded_at, '%Y-%m-%d %H:%i') AS uploaded_at,
                            IFNULL(u.full_name, 'System') AS uploaded_by_name
                     FROM Group_Documents gd
                     LEFT JOIN Users u ON u.user_id = gd.uploaded_by
                     WHERE gd.chama_id = ?
                       AND gd.document_type IN ('constitution', 'bylaws', 'governance')
                     ORDER BY gd.uploaded_at DESC, gd.document_id DESC`,
                    [chama_id],
                    (docsError, governanceDocuments) => {
                      if (docsError && docsError.code !== "ER_NO_SUCH_TABLE") {
                        console.log(
                          "Member group governance docs load error: " +
                            docsError.message,
                        );
                        return res.status(500).render("pages/user/500.ejs");
                      }

                      connection.query(
                        `SELECT dr.record_id,
                                dr.subject,
                                dr.description,
                                dr.status,
                                DATE_FORMAT(dr.created_at, '%Y-%m-%d %H:%i') AS created_at,
                                u.full_name AS reported_member_name
                         FROM Disciplinary_Records dr
                         LEFT JOIN Users u ON u.user_id = dr.reported_member_id
                         WHERE dr.chama_id = ? AND dr.reported_by = ?
                         ORDER BY dr.created_at DESC, dr.record_id DESC
                         LIMIT 20`,
                        [chama_id, user_id],
                        (recordsError, userDisciplinaryRecords) => {
                          if (
                            recordsError &&
                            recordsError.code !== "ER_NO_SUCH_TABLE"
                          ) {
                            console.log(
                              "Member group disciplinary records load error: " +
                                recordsError.message,
                            );
                            return res.status(500).render("pages/user/500.ejs");
                          }

                          connection.query(
                            `SELECT wr.request_id,
                                    u.full_name AS member_name,
                                    wr.request_type,
                                    wr.requested_amount,
                                    wr.reason,
                                    DATE_FORMAT(wr.reviewed_at, '%Y-%m-%d %H:%i') AS approved_at
                             FROM Welfare_Requests wr
                             JOIN Users u ON u.user_id = wr.requested_by
                             WHERE wr.chama_id = ?
                               AND wr.status = 'approved'
                             ORDER BY wr.reviewed_at DESC, wr.request_id DESC
                             LIMIT 20`,
                            [chama_id],
                            (welfareError, approvedWelfareRequests) => {
                              if (
                                welfareError &&
                                welfareError.code !== "ER_NO_SUCH_TABLE"
                              ) {
                                console.log(
                                  "Member group welfare load error: " +
                                    welfareError.message,
                                );
                                return res
                                  .status(500)
                                  .render("pages/user/500.ejs");
                              }

                              connection.query(
                                `SELECT IFNULL(SUM(requested_amount), 0) AS total_welfare_disbursed
                                 FROM Welfare_Requests
                                 WHERE chama_id = ?
                                   AND status = 'approved'`,
                                [chama_id],
                                (welfareSummaryError, welfareSummaryRows) => {
                                  if (
                                    welfareSummaryError &&
                                    welfareSummaryError.code !==
                                      "ER_NO_SUCH_TABLE"
                                  ) {
                                    console.log(
                                      "Member group welfare summary load error: " +
                                        welfareSummaryError.message,
                                    );
                                    return res
                                      .status(500)
                                      .render("pages/user/500.ejs");
                                  }

                                  const totalWelfareDisbursed = Number(
                                    welfareSummaryRows?.[0]
                                      ?.total_welfare_disbursed || 0,
                                  );

                                  return res.render("pages/member/group.ejs", {
                                    groupInfo,
                                    memberDirectory,
                                    financialSummary: {
                                      ...financialSummary,
                                      welfare_fund_balance:
                                        financialSummary.total_savings -
                                        totalWelfareDisbursed,
                                    },
                                    governanceDocuments:
                                      docsError &&
                                      docsError.code === "ER_NO_SUCH_TABLE"
                                        ? []
                                        : governanceDocuments,
                                    userDisciplinaryRecords:
                                      recordsError &&
                                      recordsError.code === "ER_NO_SUCH_TABLE"
                                        ? []
                                        : userDisciplinaryRecords,
                                    approvedWelfareRequests:
                                      welfareError &&
                                      welfareError.code === "ER_NO_SUCH_TABLE"
                                        ? []
                                        : approvedWelfareRequests,
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
                },
              );
            },
          );
        },
      );
    },
  );
});

app.post("/member/welfare-requests", (req, res) => {
  if (!req.session.user) {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const requested_by = req.session.user?.user_id;
  const request_type = String(req.body.request_type || "").trim();
  const requested_amount = Number(req.body.requested_amount || 0);
  const reason = String(req.body.reason || "").trim();

  const allowedTypes = [
    "medical",
    "bereavement",
    "emergency",
    "education",
    "other",
  ];

  if (!chama_id || !requested_by) {
    return res.status(401).render("pages/user/401.ejs");
  }

  if (
    !allowedTypes.includes(request_type) ||
    !Number.isFinite(requested_amount) ||
    requested_amount <= 0 ||
    !reason
  ) {
    return res.redirect(
      "/member/group?error=Please provide valid welfare request details.",
    );
  }

  connection.query(
    `INSERT INTO Welfare_Requests
     (chama_id, requested_by, request_type, requested_amount, reason, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [chama_id, requested_by, request_type, requested_amount, reason],
    (insertError) => {
      if (insertError) {
        if (insertError.code === "ER_NO_SUCH_TABLE") {
          return res.redirect(
            "/member/group?error=Welfare requests table is missing. Run latest migration.",
          );
        }

        console.log(
          "Member welfare request insert error: " + insertError.message,
        );
        return res.status(500).render("pages/user/500.ejs");
      }

      return res.redirect(
        "/member/group?success=Welfare request submitted successfully.",
      );
    },
  );
});

app.post("/member/disciplinary-records", (req, res) => {
  if (!req.session.user) {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const reported_by = req.session.user?.user_id;
  const reported_member_id = Number(req.body.reported_member_id || 0);
  const subject = String(req.body.subject || "").trim();
  const description = String(req.body.description || "").trim();

  if (!chama_id || !reported_by) {
    return res.status(401).render("pages/user/401.ejs");
  }

  if (!reported_member_id || !subject || !description) {
    return res.redirect(
      "/member/group?error=Please provide member, subject, and issue details.",
    );
  }

  connection.query(
    `SELECT 1
     FROM Chama_Members
     WHERE chama_id = ? AND user_id = ?
     LIMIT 1`,
    [chama_id, reported_member_id],
    (memberCheckError, memberCheckRows) => {
      if (memberCheckError) {
        console.log(
          "Member disciplinary record member check error: " +
            memberCheckError.message,
        );
        return res.status(500).render("pages/user/500.ejs");
      }

      if (!memberCheckRows || memberCheckRows.length === 0) {
        return res.redirect(
          "/member/group?error=Selected member is not part of this chama.",
        );
      }

      connection.query(
        `INSERT INTO Disciplinary_Records
         (chama_id, reported_by, reported_member_id, subject, description, status)
         VALUES (?, ?, ?, ?, ?, 'open')`,
        [chama_id, reported_by, reported_member_id, subject, description],
        (insertError) => {
          if (insertError) {
            if (insertError.code === "ER_NO_SUCH_TABLE") {
              return res.redirect(
                "/member/group?error=Disciplinary records table is missing. Run latest migration.",
              );
            }

            console.log(
              "Member disciplinary record insert error: " + insertError.message,
            );
            return res.status(500).render("pages/user/500.ejs");
          }

          return res.redirect(
            "/member/group?success=Disciplinary record submitted for committee review.",
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

app.post("/member/profile/change-password", (req, res) => {
  if (!req.session.user) {
    return res.status(401).render("pages/user/401.ejs");
  }

  const user_id = req.session.user?.user_id;
  if (!user_id) {
    return res.redirect(
      `/member/profile?error=${encodeURIComponent("Unable to identify your account.")}`,
    );
  }

  const { current_password, new_password, confirm_password } = req.body;

  // Validation
  if (!current_password || !new_password || !confirm_password) {
    return res.redirect(
      `/member/profile?error=${encodeURIComponent("Please fill in all password fields.")}`,
    );
  }

  if (new_password !== confirm_password) {
    return res.redirect(
      `/member/profile?error=${encodeURIComponent("New passwords do not match.")}`,
    );
  }

  // Validate password strength: at least 8 characters, uppercase, lowercase, numbers, and symbols
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(new_password)) {
    return res.redirect(
      `/member/profile?error=${encodeURIComponent("Password must be at least 8 characters and include uppercase, lowercase, numbers, and symbols.")}`,
    );
  }

  // Get current password hash from database
  connection.query(
    `SELECT password_hash FROM Users WHERE user_id = ?`,
    [user_id],
    (selectError, selectRows) => {
      if (selectError) {
        console.log("Password change select error: " + selectError.message);
        return res.redirect(
          `/member/profile?error=${encodeURIComponent("Failed to retrieve account. Please try again.")}`,
        );
      }

      if (!selectRows || selectRows.length === 0) {
        return res.redirect(
          `/member/profile?error=${encodeURIComponent("Account not found.")}`,
        );
      }

      const storedHash = selectRows[0].password_hash;

      // Compare current password with stored hash
      bcrypt.compare(current_password, storedHash, (compareError, isMatch) => {
        if (compareError) {
          console.log("Password comparison error: " + compareError.message);
          return res.redirect(
            `/member/profile?error=${encodeURIComponent("Failed to verify password. Please try again.")}`,
          );
        }

        if (!isMatch) {
          return res.redirect(
            `/member/profile?error=${encodeURIComponent("Current password is incorrect.")}`,
          );
        }

        // Hash new password
        bcrypt.hash(new_password, 10, (hashError, newHash) => {
          if (hashError) {
            console.log("Password hash error: " + hashError.message);
            return res.redirect(
              `/member/profile?error=${encodeURIComponent("Failed to process new password. Please try again.")}`,
            );
          }

          // Update password in database
          connection.query(
            `UPDATE Users SET password_hash = ? WHERE user_id = ?`,
            [newHash, user_id],
            (updateError) => {
              if (updateError) {
                console.log("Password update error: " + updateError.message);
                return res.redirect(
                  `/member/profile?error=${encodeURIComponent("Failed to update password. Please try again.")}`,
                );
              }

              return res.redirect(
                `/member/profile?success=${encodeURIComponent("Password changed successfully.")}`,
              );
            },
          );
        });
      });
    },
  );
});

// Treasurer Routes
app.get("/treasurer/dashboard", (req, res) => {
  if (!req.session.user || req.session.role !== "treasurer") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const buildTrend = (currentValue, previousValue) => {
    const current = Number(currentValue || 0);
    const previous = Number(previousValue || 0);
    const delta = current - previous;
    const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    const pct =
      previous === 0
        ? current > 0
          ? 100
          : 0
        : Math.round((Math.abs(delta) / Math.abs(previous)) * 100);
    return { direction, pct, delta };
  };

  connection.query(
    `SELECT IFNULL(SUM(amount), 0) AS total_contributions
     FROM Transactions
     WHERE chama_id = ?
       AND transaction_type = 'contribution'
       AND status = 'completed'`,
    [chama_id],
    (contribError, contribRows) => {
      if (contribError) {
        console.log(
          "Treasurer dashboard contributions error: " + contribError.message,
        );
        return res.status(500).render("pages/user/500.ejs");
      }

      const totalContributions = Number(
        contribRows[0]?.total_contributions || 0,
      );

      connection.query(
        `SELECT IFNULL(SUM(IFNULL(remaining_balance, amount)), 0) AS outstanding_loans,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_approvals
         FROM Loans
         WHERE chama_id = ? AND status != 'rejected'`,
        [chama_id],
        (loanStatsError, loanStatsRows) => {
          if (loanStatsError) {
            console.log(
              "Treasurer dashboard loan stats error: " + loanStatsError.message,
            );
            return res.status(500).render("pages/user/500.ejs");
          }

          const outstandingLoans = Number(
            loanStatsRows[0]?.outstanding_loans || 0,
          );
          const pendingApprovals = Number(
            loanStatsRows[0]?.pending_approvals || 0,
          );
          const availableCash = totalContributions - outstandingLoans;

          connection.query(
            `SELECT DATE_FORMAT(t.created_at, '%Y-%m-%d') AS transaction_date,
                    u.full_name AS member_name,
                    t.amount,
                    CASE
                      WHEN t.description LIKE 'Payment Method:%'
                        THEN TRIM(SUBSTRING_INDEX(t.description, ':', -1))
                      ELSE REPLACE(t.transaction_type, '_', ' ')
                    END AS method,
                    CONCAT('TX-', t.transaction_id) AS reference
             FROM Transactions t
             JOIN Users u ON u.user_id = t.user_id
             WHERE t.chama_id = ?
             ORDER BY t.created_at DESC, t.transaction_id DESC
             LIMIT 8`,
            [chama_id],
            (txError, recentTransactions) => {
              if (txError) {
                console.log(
                  "Treasurer dashboard transactions error: " + txError.message,
                );
                return res.status(500).render("pages/user/500.ejs");
              }

              connection.query(
                `SELECT
                   IFNULL(SUM(CASE WHEN DATE_FORMAT(created_at, '%Y-%m') = ? THEN amount ELSE 0 END), 0) AS current_contributions,
                   IFNULL(SUM(CASE WHEN DATE_FORMAT(created_at, '%Y-%m') = ? THEN amount ELSE 0 END), 0) AS previous_contributions
                 FROM Transactions
                 WHERE chama_id = ?
                   AND transaction_type = 'contribution'
                   AND status = 'completed'`,
                [currentMonth, previousMonth, chama_id],
                (monthlyContribError, monthlyContribRows) => {
                  if (monthlyContribError) {
                    console.log(
                      "Treasurer dashboard monthly contributions error: " +
                        monthlyContribError.message,
                    );
                    return res.status(500).render("pages/user/500.ejs");
                  }

                  connection.query(
                    `SELECT
                       IFNULL(SUM(CASE WHEN DATE_FORMAT(issue_date, '%Y-%m') = ? AND status = 'active' THEN amount ELSE 0 END), 0) AS current_loan_disbursed,
                       IFNULL(SUM(CASE WHEN DATE_FORMAT(issue_date, '%Y-%m') = ? AND status = 'active' THEN amount ELSE 0 END), 0) AS previous_loan_disbursed,
                       IFNULL(SUM(CASE WHEN DATE_FORMAT(issue_date, '%Y-%m') = ? AND status = 'pending' THEN 1 ELSE 0 END), 0) AS current_pending_count,
                       IFNULL(SUM(CASE WHEN DATE_FORMAT(issue_date, '%Y-%m') = ? AND status = 'pending' THEN 1 ELSE 0 END), 0) AS previous_pending_count
                     FROM Loans
                     WHERE chama_id = ?`,
                    [
                      currentMonth,
                      previousMonth,
                      currentMonth,
                      previousMonth,
                      chama_id,
                    ],
                    (monthlyLoanError, monthlyLoanRows) => {
                      if (monthlyLoanError) {
                        console.log(
                          "Treasurer dashboard monthly loan trend error: " +
                            monthlyLoanError.message,
                        );
                        return res.status(500).render("pages/user/500.ejs");
                      }

                      const monthlyContrib = monthlyContribRows[0] || {};
                      const monthlyLoan = monthlyLoanRows[0] || {};
                      const currentNetCash =
                        Number(monthlyContrib.current_contributions || 0) -
                        Number(monthlyLoan.current_loan_disbursed || 0);
                      const previousNetCash =
                        Number(monthlyContrib.previous_contributions || 0) -
                        Number(monthlyLoan.previous_loan_disbursed || 0);

                      const trends = {
                        totalContributions: buildTrend(
                          monthlyContrib.current_contributions,
                          monthlyContrib.previous_contributions,
                        ),
                        availableCash: buildTrend(
                          currentNetCash,
                          previousNetCash,
                        ),
                        outstandingLoans: buildTrend(
                          monthlyLoan.current_loan_disbursed,
                          monthlyLoan.previous_loan_disbursed,
                        ),
                        pendingApprovals: buildTrend(
                          monthlyLoan.current_pending_count,
                          monthlyLoan.previous_pending_count,
                        ),
                      };

                      return res.render("pages/treasurer/dashboard.ejs", {
                        dashboard: {
                          totalContributions,
                          availableCash,
                          outstandingLoans,
                          pendingApprovals,
                        },
                        trends,
                        asOfDateTime: `${toYmd(now)} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
                        recentTransactions,
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

app.post("/treasurer/loans/:loanId/repayment", (req, res) => {
  if (!req.session.user || req.session.role !== "treasurer") {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const loanId = Number(req.params.loanId);
  const chamaId = Number(req.session.chama_id);
  const repaymentAmount = Number(req.body.repayment_amount);
  const repaymentDescription =
    (req.body.repayment_description || "").toString().trim() ||
    "Loan repayment";

  if (
    !loanId ||
    !chamaId ||
    !Number.isFinite(repaymentAmount) ||
    repaymentAmount <= 0
  ) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid repayment details." });
  }

  connection.query(
    `SELECT loan_id, user_id, amount, IFNULL(remaining_balance, amount) AS remaining_balance, status
     FROM Loans
     WHERE loan_id = ? AND chama_id = ?
     LIMIT 1`,
    [loanId, chamaId],
    (loanError, loanRows) => {
      if (loanError) {
        console.log("Repayment loan lookup error: " + loanError.message);
        return res
          .status(500)
          .json({ success: false, error: "Failed to load loan record." });
      }

      if (!loanRows || loanRows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Loan not found for this chama." });
      }

      const loan = loanRows[0];
      const currentBalance = Number(loan.remaining_balance || 0);

      if (loan.status !== "active") {
        return res
          .status(400)
          .json({
            success: false,
            error: "Only active loans can receive repayments.",
          });
      }

      if (repaymentAmount > currentBalance) {
        return res.status(400).json({
          success: false,
          error:
            "Repayment amount cannot exceed outstanding balance (KES " +
            currentBalance.toLocaleString() +
            ").",
        });
      }

      const nextBalance = Number((currentBalance - repaymentAmount).toFixed(2));
      const nextStatus = nextBalance <= 0 ? "completed" : "active";

      connection.query(
        `INSERT INTO Transactions
           (chama_id, user_id, transaction_type, amount, description, status, loan_id, created_at)
         VALUES (?, ?, 'loan_repayment', ?, ?, 'completed', ?, NOW())`,
        [chamaId, loan.user_id, repaymentAmount, repaymentDescription, loanId],
        (txError) => {
          if (txError) {
            console.log(
              "Repayment transaction insert error: " + txError.message,
            );
            return res
              .status(500)
              .json({
                success: false,
                error: "Failed to save repayment transaction.",
              });
          }

          connection.query(
            `UPDATE Loans
             SET remaining_balance = ?, status = ?
             WHERE loan_id = ? AND chama_id = ?`,
            [Math.max(0, nextBalance), nextStatus, loanId, chamaId],
            (updateError, updateResult) => {
              if (updateError) {
                console.log(
                  "Repayment loan update error: " + updateError.message,
                );
                return res
                  .status(500)
                  .json({
                    success: false,
                    error: "Failed to update loan balance.",
                  });
              }

              if (!updateResult || updateResult.affectedRows === 0) {
                return res
                  .status(500)
                  .json({
                    success: false,
                    error: "Loan update was not applied.",
                  });
              }

              return res.json({
                success: true,
                message:
                  "Repayment recorded successfully." +
                  (nextStatus === "completed"
                    ? " Loan has been fully repaid."
                    : ""),
                loan_id: loanId,
                remaining_balance: Math.max(0, nextBalance),
                loan_status: nextStatus,
              });
            },
          );
        },
      );
    },
  );
});

app.get("/treasurer/members", (req, res) => {
  if (!req.session.user || req.session.role !== "treasurer") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  if (!chama_id) {
    return res.status(401).render("pages/user/401.ejs");
  }

  const statementUserId = Number(req.query.statement_user_id || 0);

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

      connection.query(
        `SELECT dr.record_id,
                dr.subject,
                dr.description,
                dr.status,
                DATE_FORMAT(dr.created_at, '%Y-%m-%d %H:%i') AS created_at,
                rb.full_name AS reported_by_name,
                rm.full_name AS reported_member_name
         FROM Disciplinary_Records dr
         LEFT JOIN Users rb ON rb.user_id = dr.reported_by
         LEFT JOIN Users rm ON rm.user_id = dr.reported_member_id
         WHERE dr.chama_id = ?
         ORDER BY dr.created_at DESC, dr.record_id DESC
         LIMIT 40`,
        [chama_id],
        (disciplinaryError, disciplinaryRecords) => {
          if (
            disciplinaryError &&
            disciplinaryError.code !== "ER_NO_SUCH_TABLE"
          ) {
            console.log(
              "Treasurer disciplinary records load error: " +
                disciplinaryError.message,
            );
            return res.status(500).render("pages/user/500.ejs");
          }

          const safeDisciplinaryRecords =
            disciplinaryError && disciplinaryError.code === "ER_NO_SUCH_TABLE"
              ? []
              : disciplinaryRecords;

          if (!statementUserId) {
            return res.render("pages/treasurer/members.ejs", {
              members,
              disciplinaryRecords: safeDisciplinaryRecords,
              statementSelectedMember: null,
              statementSummary: null,
              statementTransactions: [],
              statementLoans: [],
              statementError: null,
            });
          }

          const selectedMember = members.find(
            (member) => Number(member.user_id) === statementUserId,
          );

          if (!selectedMember) {
            return res.render("pages/treasurer/members.ejs", {
              members,
              disciplinaryRecords: safeDisciplinaryRecords,
              statementSelectedMember: null,
              statementSummary: null,
              statementTransactions: [],
              statementLoans: [],
              statementError: "Selected member was not found in this chama.",
            });
          }

          connection.query(
            `SELECT DATE_FORMAT(t.created_at, '%Y-%m-%d') AS transaction_date,
                    t.transaction_type,
                    t.amount,
                    t.status,
                    t.description
             FROM Transactions t
             WHERE t.chama_id = ? AND t.user_id = ?
             ORDER BY t.created_at DESC, t.transaction_id DESC
             LIMIT 50`,
            [chama_id, statementUserId],
            (txError, statementTransactions) => {
              if (txError) {
                console.log(
                  "Treasurer member statement tx error: " + txError.message,
                );
                return res.status(500).render("pages/user/500.ejs");
              }

              connection.query(
                `SELECT DATE_FORMAT(l.issue_date, '%Y-%m-%d') AS issue_date,
                        DATE_FORMAT(l.due_date, '%Y-%m-%d') AS due_date,
                        l.amount,
                        IFNULL(l.remaining_balance, l.amount) AS remaining_balance,
                        l.status
                 FROM Loans l
                 WHERE l.chama_id = ? AND l.user_id = ? AND l.status != 'rejected'
                 ORDER BY l.issue_date DESC, l.loan_id DESC`,
                [chama_id, statementUserId],
                (loanError, statementLoans) => {
                  if (loanError) {
                    console.log(
                      "Treasurer member statement loans error: " +
                        loanError.message,
                    );
                    return res.status(500).render("pages/user/500.ejs");
                  }

                  connection.query(
                    `SELECT
                       IFNULL(SUM(CASE WHEN transaction_type = 'contribution' AND status = 'completed' THEN amount ELSE 0 END), 0) AS total_contributed,
                       IFNULL(SUM(CASE WHEN transaction_type = 'loan_repayment' AND status = 'completed' THEN amount ELSE 0 END), 0) AS total_loan_repaid,
                       COUNT(*) AS transaction_count
                     FROM Transactions
                     WHERE chama_id = ? AND user_id = ?`,
                    [chama_id, statementUserId],
                    (summaryTxError, txSummaryRows) => {
                      if (summaryTxError) {
                        console.log(
                          "Treasurer member statement summary tx error: " +
                            summaryTxError.message,
                        );
                        return res.status(500).render("pages/user/500.ejs");
                      }

                      connection.query(
                        `SELECT
                           IFNULL(SUM(CASE WHEN status != 'rejected' THEN amount ELSE 0 END), 0) AS total_loaned,
                           IFNULL(SUM(CASE WHEN status = 'active' THEN IFNULL(remaining_balance, amount) ELSE 0 END), 0) AS total_outstanding,
                           SUM(CASE WHEN status != 'rejected' THEN 1 ELSE 0 END) AS loan_count
                         FROM Loans
                         WHERE chama_id = ? AND user_id = ?`,
                        [chama_id, statementUserId],
                        (summaryLoanError, loanSummaryRows) => {
                          if (summaryLoanError) {
                            console.log(
                              "Treasurer member statement summary loan error: " +
                                summaryLoanError.message,
                            );
                            return res.status(500).render("pages/user/500.ejs");
                          }

                          const txSummary = txSummaryRows[0] || {};
                          const loanSummary = loanSummaryRows[0] || {};

                          return res.render("pages/treasurer/members.ejs", {
                            members,
                            disciplinaryRecords: safeDisciplinaryRecords,
                            statementSelectedMember: selectedMember,
                            statementSummary: {
                              totalContributed: Number(
                                txSummary.total_contributed || 0,
                              ),
                              totalLoanRepaid: Number(
                                txSummary.total_loan_repaid || 0,
                              ),
                              totalLoaned: Number(
                                loanSummary.total_loaned || 0,
                              ),
                              totalOutstanding: Number(
                                loanSummary.total_outstanding || 0,
                              ),
                              transactionCount: Number(
                                txSummary.transaction_count || 0,
                              ),
                              loanCount: Number(loanSummary.loan_count || 0),
                            },
                            statementTransactions,
                            statementLoans,
                            statementError: null,
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
    },
  );
});

app.get("/treasurer/member-statement/export", (req, res) => {
  if (!req.session.user || req.session.role !== "treasurer") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const chama_id = req.session.chama_id;
  const statementUserId = Number(req.query.user_id || 0);
  const format = req.query.format || "csv";

  if (!statementUserId) {
    return res.status(400).json({ error: "Member ID required" });
  }

  connection.query(
    `SELECT u.user_id, u.full_name, u.phone_number, u.email
     FROM Users u
     JOIN Chama_Members cm ON u.user_id = cm.user_id
     WHERE cm.chama_id = ? AND u.user_id = ?
     LIMIT 1`,
    [chama_id, statementUserId],
    (memberError, memberRows) => {
      if (memberError || memberRows.length === 0) {
        return res.status(404).json({ error: "Member not found" });
      }

      const selectedMember = memberRows[0];

      connection.query(
        `SELECT DATE_FORMAT(t.created_at, '%Y-%m-%d') AS transaction_date,
                t.transaction_type,
                t.amount,
                t.status,
                t.description
         FROM Transactions t
         WHERE t.chama_id = ? AND t.user_id = ?
         ORDER BY t.created_at DESC, t.transaction_id DESC
         LIMIT 100`,
        [chama_id, statementUserId],
        (txError, statementTransactions) => {
          if (txError) {
            return res
              .status(500)
              .json({ error: "Failed to fetch transactions" });
          }

          connection.query(
            `SELECT DATE_FORMAT(l.issue_date, '%Y-%m-%d') AS issue_date,
                    DATE_FORMAT(l.due_date, '%Y-%m-%d') AS due_date,
                    l.amount,
                    IFNULL(l.remaining_balance, l.amount) AS remaining_balance,
                    l.status
             FROM Loans l
             WHERE l.chama_id = ? AND l.user_id = ? AND l.status != 'rejected'
             ORDER BY l.issue_date DESC, l.loan_id DESC`,
            [chama_id, statementUserId],
            (loanError, statementLoans) => {
              if (loanError) {
                return res.status(500).json({ error: "Failed to fetch loans" });
              }

              connection.query(
                `SELECT
                   IFNULL(SUM(CASE WHEN transaction_type = 'contribution' AND status = 'completed' THEN amount ELSE 0 END), 0) AS total_contributed,
                   IFNULL(SUM(CASE WHEN transaction_type = 'loan_repayment' AND status = 'completed' THEN amount ELSE 0 END), 0) AS total_loan_repaid
                 FROM Transactions
                 WHERE chama_id = ? AND user_id = ?`,
                [chama_id, statementUserId],
                (summaryTxError, txSummaryRows) => {
                  if (summaryTxError) {
                    return res
                      .status(500)
                      .json({ error: "Failed to fetch summary" });
                  }

                  connection.query(
                    `SELECT
                       IFNULL(SUM(CASE WHEN status != 'rejected' THEN amount ELSE 0 END), 0) AS total_loaned,
                       IFNULL(SUM(CASE WHEN status = 'active' THEN IFNULL(remaining_balance, amount) ELSE 0 END), 0) AS total_outstanding
                     FROM Loans
                     WHERE chama_id = ? AND user_id = ?`,
                    [chama_id, statementUserId],
                    (summaryLoanError, loanSummaryRows) => {
                      if (summaryLoanError) {
                        return res
                          .status(500)
                          .json({ error: "Failed to fetch loan summary" });
                      }

                      const txSummary = txSummaryRows[0] || {};
                      const loanSummary = loanSummaryRows[0] || {};

                      if (format === "csv") {
                        const now = new Date();
                        const reportDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                        const filename = `Statement-${selectedMember.full_name.replace(/\s+/g, "_")}-${reportDate}.csv`;

                        let csv = "";
                        csv += "MEMBER STATEMENT REPORT\n";
                        csv += `Generated: ${reportDate}\n\n`;
                        csv += `Member: ${selectedMember.full_name}\n`;
                        csv += `Email: ${selectedMember.email || "N/A"}\n`;
                        csv += `Phone: ${selectedMember.phone_number || "N/A"}\n\n`;

                        csv += "SUMMARY\n";
                        csv += `Total Contributed,"KES ${Number(txSummary.total_contributed || 0).toLocaleString()}"\n`;
                        csv += `Total Loaned,"KES ${Number(loanSummary.total_loaned || 0).toLocaleString()}"\n`;
                        csv += `Outstanding Balance,"KES ${Number(loanSummary.total_outstanding || 0).toLocaleString()}"\n`;
                        csv += `Loan Repaid,"KES ${Number(txSummary.total_loan_repaid || 0).toLocaleString()}"\n\n`;

                        csv += "TRANSACTION HISTORY\n";
                        csv += "Date,Type,Amount,Status,Description\n";
                        statementTransactions.forEach((tx) => {
                          csv += `${tx.transaction_date},${tx.transaction_type},${tx.amount},${tx.status},"${(tx.description || "").replace(/"/g, '""')}"\n`;
                        });

                        csv += "\nLOAN HISTORY\n";
                        csv +=
                          "Issue Date,Due Date,Amount,Remaining Balance,Status\n";
                        statementLoans.forEach((loan) => {
                          csv += `${loan.issue_date},${loan.due_date},${loan.amount},${loan.remaining_balance},${loan.status}\n`;
                        });

                        res.setHeader(
                          "Content-Type",
                          "text/csv; charset=utf-8",
                        );
                        res.setHeader(
                          "Content-Disposition",
                          `attachment; filename="${filename}"`,
                        );
                        return res.send(csv);
                      }

                      return res
                        .status(400)
                        .json({ error: "Format not supported" });
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
  if (!req.session.user || req.session.role !== "secretary") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;

  if (!chama_id) {
    return res.render("pages/secretary/dashboard.ejs", {
      recentMeetings: [],
      upcomingMeetings: [],
      totalMembers: 0,
      uploadedDocs: 0,
      attendanceStats: { avgRate: 0, lastPresent: 0, lastAbsent: 0 },
    });
  }

  connection.query(
    `SELECT COUNT(*) AS total FROM Chama_Members WHERE chama_id = ?`,
    [chama_id],
    (membersError, membersRows) => {
      if (membersError) {
        console.log(
          "Secretary dashboard members count error: " + membersError.message,
        );
      }
      const totalMembers =
        !membersError && membersRows.length > 0
          ? Number(membersRows[0].total)
          : 0;

      connection.query(
        `SELECT m.meeting_id,
                IFNULL(m.meeting_title, 'Meeting') AS meeting_title,
                DATE_FORMAT(m.meeting_date, '%Y-%m-%d') AS meeting_date,
                IFNULL(m.status, 'completed') AS status,
                (SELECT COUNT(*) FROM Meeting_Attendance ma
                 WHERE ma.meeting_id = m.meeting_id AND IFNULL(ma.attended, 0) = 1) AS attendee_count
         FROM Meetings m
         WHERE m.chama_id = ?
           AND (
             m.meeting_date < CURDATE()
             OR (
               m.meeting_date = CURDATE()
               AND (
                 (m.meeting_time IS NOT NULL AND m.meeting_time <= CURTIME())
                 OR EXISTS (
                   SELECT 1
                   FROM Meeting_Attendance ma
                   WHERE ma.meeting_id = m.meeting_id
                 )
               )
             )
           )
         ORDER BY m.meeting_date DESC, m.meeting_id DESC
         LIMIT 3`,
        [chama_id],
        (recentError, recentMeetings) => {
          if (recentError && recentError.code === "ER_BAD_FIELD_ERROR") {
            return connection.query(
              `SELECT m.meeting_id,
                      'Meeting' AS meeting_title,
                      DATE_FORMAT(m.meeting_date, '%Y-%m-%d') AS meeting_date,
                      'completed' AS status,
                      (SELECT COUNT(*) FROM Meeting_Attendance ma
                       WHERE ma.meeting_id = m.meeting_id AND IFNULL(ma.attended, 0) = 1) AS attendee_count
               FROM Meetings m
               WHERE m.chama_id = ?
                 AND (
                   m.meeting_date < CURDATE()
                   OR (
                     m.meeting_date = CURDATE()
                     AND EXISTS (
                       SELECT 1
                       FROM Meeting_Attendance ma
                       WHERE ma.meeting_id = m.meeting_id
                     )
                   )
                 )
               ORDER BY m.meeting_date DESC, m.meeting_id DESC
               LIMIT 3`,
              [chama_id],
              (fbError, fbMeetings) => {
                loadUpcoming(fbError ? [] : fbMeetings);
              },
            );
          }
          if (recentError) {
            console.log(
              "Secretary dashboard recent meetings error: " +
                recentError.message,
            );
          }
          loadUpcoming(recentError ? [] : recentMeetings);
        },
      );

      function loadUpcoming(recentData) {
        connection.query(
          `SELECT meeting_id,
                  IFNULL(meeting_title, 'Meeting') AS meeting_title,
                  DATE_FORMAT(meeting_date, '%Y-%m-%d') AS meeting_date,
                  DATE_FORMAT(meeting_time, '%H:%i') AS meeting_time,
                  IFNULL(location, '') AS location
           FROM Meetings
           WHERE chama_id = ?
             AND (
               meeting_date > CURDATE()
               OR (
                 meeting_date = CURDATE()
                 AND (
                   meeting_time IS NULL
                   OR meeting_time > CURTIME()
                 )
                 AND NOT EXISTS (
                   SELECT 1
                   FROM Meeting_Attendance ma
                   WHERE ma.meeting_id = Meetings.meeting_id
                 )
               )
             )
           ORDER BY meeting_date ASC, meeting_id ASC
           LIMIT 3`,
          [chama_id],
          (upcomingError, upcomingMeetings) => {
            if (upcomingError && upcomingError.code === "ER_BAD_FIELD_ERROR") {
              return connection.query(
                `SELECT meeting_id,
                        'Meeting' AS meeting_title,
                        DATE_FORMAT(meeting_date, '%Y-%m-%d') AS meeting_date,
                        '' AS meeting_time,
                        IFNULL(location, '') AS location
                 FROM Meetings
                 WHERE chama_id = ?
                   AND (
                     meeting_date > CURDATE()
                     OR (
                       meeting_date = CURDATE()
                       AND NOT EXISTS (
                         SELECT 1
                         FROM Meeting_Attendance ma
                         WHERE ma.meeting_id = Meetings.meeting_id
                       )
                     )
                   )
                 ORDER BY meeting_date ASC, meeting_id ASC
                 LIMIT 3`,
                [chama_id],
                (fbError, fbMeetings) => {
                  loadAttendanceStats(recentData, fbError ? [] : fbMeetings);
                },
              );
            }
            if (upcomingError) {
              console.log(
                "Secretary dashboard upcoming meetings error: " +
                  upcomingError.message,
              );
            }
            loadAttendanceStats(
              recentData,
              upcomingError ? [] : upcomingMeetings,
            );
          },
        );
      }

      function loadAttendanceStats(recentData, upcomingData) {
        connection.query(
          `SELECT
             COUNT(DISTINCT ma.meeting_id) AS meetings_with_attendance,
             SUM(CASE WHEN IFNULL(ma.attended, 0) = 1 THEN 1 ELSE 0 END) AS total_present
           FROM Meeting_Attendance ma
           JOIN Meetings m ON m.meeting_id = ma.meeting_id
           WHERE m.chama_id = ?
             AND (
               m.meeting_date < CURDATE()
               OR (
                 m.meeting_date = CURDATE()
                 AND (
                   (m.meeting_time IS NOT NULL AND m.meeting_time <= CURTIME())
                   OR EXISTS (
                     SELECT 1
                     FROM Meeting_Attendance ma2
                     WHERE ma2.meeting_id = m.meeting_id
                   )
                 )
               )
             )`,
          [chama_id],
          (attError, attRows) => {
            if (attError) {
              console.log(
                "Secretary dashboard attendance stats error: " +
                  attError.message,
              );
            }
            const meetingsWithAttendance =
              !attError && attRows.length > 0
                ? Number(attRows[0].meetings_with_attendance || 0)
                : 0;
            const totalPresent =
              !attError && attRows.length > 0
                ? Number(attRows[0].total_present || 0)
                : 0;
            const avgRate =
              totalMembers > 0 && meetingsWithAttendance > 0
                ? Math.round(
                    (totalPresent / (totalMembers * meetingsWithAttendance)) *
                      100,
                  )
                : 0;
            const lastPresent =
              recentData.length > 0
                ? Number(recentData[0].attendee_count || 0)
                : 0;
            const lastAbsent = Math.max(totalMembers - lastPresent, 0);

            loadDocs(recentData, upcomingData, {
              avgRate,
              lastPresent,
              lastAbsent,
            });
          },
        );
      }

      function loadDocs(recentData, upcomingData, attendanceStats) {
        connection.query(
          `SELECT COUNT(*) AS total FROM Group_Documents WHERE chama_id = ?`,
          [chama_id],
          (docsError, docsRows) => {
            if (docsError && docsError.code !== "ER_NO_SUCH_TABLE") {
              console.log(
                "Secretary dashboard docs count error: " + docsError.message,
              );
            }
            const uploadedDocs =
              !docsError && docsRows.length > 0 ? Number(docsRows[0].total) : 0;
            return res.render("pages/secretary/dashboard.ejs", {
              recentMeetings: recentData,
              upcomingMeetings: upcomingData,
              totalMembers,
              uploadedDocs,
              attendanceStats,
            });
          },
        );
      }
    },
  );
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
              WHEN meeting_date > CURDATE() THEN 'upcoming'
              WHEN meeting_date = CURDATE()
                   AND (meeting_time IS NULL OR meeting_time > CURTIME())
                   AND NOT EXISTS (
                     SELECT 1
                     FROM Meeting_Attendance ma
                     WHERE ma.meeting_id = Meetings.meeting_id
                   )
                THEN 'upcoming'
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
                      WHEN meeting_date > CURDATE() THEN 'upcoming'
                      WHEN meeting_date = CURDATE()
                           AND NOT EXISTS (
                             SELECT 1
                             FROM Meeting_Attendance ma
                             WHERE ma.meeting_id = Meetings.meeting_id
                           )
                        THEN 'upcoming'
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
  if (!req.session.user || req.session.role !== "secretary") {
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
    (docsError, documents) => {
      if (docsError && docsError.code !== "ER_NO_SUCH_TABLE") {
        console.log("Secretary documents load error: " + docsError.message);
        return res.status(500).render("pages/user/500.ejs");
      }

      return res.render("pages/secretary/documents.ejs", {
        documents:
          docsError && docsError.code === "ER_NO_SUCH_TABLE" ? [] : documents,
        success: req.query.success || null,
        error: req.query.error || null,
      });
    },
  );
});

app.post(
  "/secretary/upload-document",
  governanceDocsUpload.single("doc_file"),
  (req, res) => {
    if (!req.session.user || req.session.role !== "secretary") {
      return res.status(401).render("pages/user/401.ejs");
    }

    const { doc_title, doc_type } = req.body;
    const chama_id = req.session.chama_id;
    const uploaded_by = req.session.user.user_id;

    if (!doc_title || !doc_title.trim() || !doc_type) {
      return res.redirect(
        "/secretary/documents?error=Document name and type are required.",
      );
    }

    if (!req.file) {
      return res.redirect(
        "/secretary/documents?error=Please select a file to upload.",
      );
    }

    const file_name = req.file.originalname;
    const file_path = `/uploads/governance/${req.file.filename}`;

    connection.query(
      `INSERT INTO Group_Documents (chama_id, title, document_type, file_name, file_path, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [chama_id, doc_title.trim(), doc_type, file_name, file_path, uploaded_by],
      (insertError) => {
        if (insertError) {
          console.log(
            "Document upload error [" +
              insertError.code +
              "]: " +
              insertError.message,
          );
          if (
            insertError.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD" ||
            insertError.code === "ER_WARN_DATA_TRUNCATED" ||
            insertError.code === "ER_DATA_TRUNCATED" ||
            insertError.code === "ER_NO_SUCH_TABLE"
          ) {
            return res.redirect(
              "/secretary/documents?error=Database schema is outdated. Run the latest DB migration to add new document types.",
            );
          }
          return res.redirect(
            "/secretary/documents?error=Could not save document record: " +
              insertError.message,
          );
        }

        return res.redirect(
          "/secretary/documents?success=Document uploaded successfully.",
        );
      },
    );
  },
);

app.get("/secretary/communications", (req, res) => {
  if (!req.session.user || req.session.role !== "secretary") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const success =
    req.query.success === "1"
      ? "Announcement sent successfully."
      : req.query.success || null;
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

app.post("/secretary/send-newsletter", (req, res) => {
  if (!req.session.user || req.session.role !== "secretary") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const uploaded_by = req.session.user.user_id;
  const title = String(req.body.title || "").trim();
  const period = String(req.body.period || "").trim();
  const send_date = String(req.body.send_date || "").trim();
  const content = String(req.body.content || "").trim();
  const included_sections_raw = req.body.included_sections;
  const included_sections = Array.isArray(included_sections_raw)
    ? included_sections_raw
    : included_sections_raw
      ? [included_sections_raw]
      : [];

  if (!title || !content) {
    return res.redirect(
      "/secretary/communications?error=Newsletter title and content are required.",
    );
  }

  const safeBase = title
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const savedFileName = `${Date.now()}-${safeBase || "newsletter"}.txt`;
  const absoluteFilePath = path.join(governanceDocsUploadDir, savedFileName);
  const file_path = `/uploads/governance/${savedFileName}`;

  const lines = [
    `Newsletter Title: ${title}`,
    `Period: ${period || "N/A"}`,
    `Send Date: ${send_date || "N/A"}`,
    "",
    "Included Sections:",
    included_sections.length > 0
      ? included_sections.map((s) => `- ${s}`).join("\n")
      : "- None selected",
    "",
    "Content:",
    content,
  ];

  try {
    fs.mkdirSync(governanceDocsUploadDir, { recursive: true });
    fs.writeFileSync(absoluteFilePath, lines.join("\n"), "utf8");
  } catch (fileError) {
    console.log("Newsletter file write error: " + fileError.message);
    return res.redirect(
      "/secretary/communications?error=Could not generate newsletter file.",
    );
  }

  connection.query(
    `INSERT INTO Group_Documents
     (chama_id, title, document_type, file_name, file_path, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      chama_id,
      title,
      "newsletter",
      `${safeBase || "newsletter"}.txt`,
      file_path,
      uploaded_by,
    ],
    (insertError) => {
      if (insertError) {
        if (
          insertError.code === "ER_NO_SUCH_TABLE" ||
          insertError.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD"
        ) {
          return res.redirect(
            "/secretary/communications?error=Documents schema is outdated. Run latest DB migration.",
          );
        }

        console.log("Newsletter save error: " + insertError.message);
        return res.redirect(
          "/secretary/communications?error=Could not save newsletter.",
        );
      }

      return res.redirect(
        "/secretary/communications?success=Newsletter sent and saved to documents.",
      );
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

      connection.query(
        `SELECT dr.record_id,
                dr.subject,
                dr.description,
                dr.status,
                DATE_FORMAT(dr.created_at, '%Y-%m-%d %H:%i') AS created_at,
                rb.full_name AS reported_by_name,
                rm.full_name AS reported_member_name
         FROM Disciplinary_Records dr
         LEFT JOIN Users rb ON rb.user_id = dr.reported_by
         LEFT JOIN Users rm ON rm.user_id = dr.reported_member_id
         WHERE dr.chama_id = ?
         ORDER BY dr.created_at DESC, dr.record_id DESC
         LIMIT 40`,
        [chama_id],
        (disciplinaryError, disciplinaryRecords) => {
          if (
            disciplinaryError &&
            disciplinaryError.code !== "ER_NO_SUCH_TABLE"
          ) {
            console.log(
              "Secretary disciplinary records load error: " +
                disciplinaryError.message,
            );
            return res.status(500).render("pages/user/500.ejs");
          }

          return res.render("pages/secretary/member-records.ejs", {
            members,
            disciplinaryRecords:
              disciplinaryError && disciplinaryError.code === "ER_NO_SUCH_TABLE"
                ? []
                : disciplinaryRecords,
            success: req.query.success || null,
            error: req.query.error || null,
          });
        },
      );
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

// Chairperson Routes
app.get("/chairperson/dashboard", (req, res) => {
  if (!req.session.user || req.session.role !== "chairperson") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  if (!chama_id) {
    return res.status(401).render("pages/user/401.ejs");
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const success = req.session.signupSuccess || null;
  req.session.signupSuccess = null;

  connection.query(
    `SELECT contribution_amount
     FROM Chama
     WHERE chama_id = ?
     LIMIT 1`,
    [chama_id],
    (chamaError, chamaRows) => {
      if (chamaError) {
        console.log(
          "Chairperson dashboard chama settings error: " + chamaError.message,
        );
        return res.status(500).render("pages/user/500.ejs");
      }

      const contributionAmount = Number(chamaRows[0]?.contribution_amount || 0);

      connection.query(
        `SELECT COUNT(*) AS active_members,
                SUM(CASE WHEN DATE_FORMAT(joined_date, '%Y-%m') = ? THEN 1 ELSE 0 END) AS new_members
         FROM Chama_Members
         WHERE chama_id = ?`,
        [currentMonth, chama_id],
        (memberError, memberRows) => {
          if (memberError) {
            console.log(
              "Chairperson dashboard members error: " + memberError.message,
            );
            return res.status(500).render("pages/user/500.ejs");
          }

          const activeMembers = Number(memberRows[0]?.active_members || 0);
          const newMembers = Number(memberRows[0]?.new_members || 0);

          connection.query(
            `SELECT
               SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_issues,
               SUM(CASE WHEN status = 'active' AND due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue_loans
             FROM Loans
             WHERE chama_id = ? AND status != 'rejected'`,
            [chama_id],
            (issueError, issueRows) => {
              if (issueError) {
                console.log(
                  "Chairperson dashboard issues error: " + issueError.message,
                );
                return res.status(500).render("pages/user/500.ejs");
              }

              const pendingApprovals = Number(
                issueRows[0]?.pending_issues || 0,
              );
              const overdueLoans = Number(issueRows[0]?.overdue_loans || 0);
              const pendingIssues = pendingApprovals + overdueLoans;

              connection.query(
                `SELECT COUNT(*) AS upcoming_events
                 FROM Meetings
                 WHERE chama_id = ?
                   AND (
                     meeting_date > CURDATE()
                     OR (meeting_date = CURDATE() AND IFNULL(meeting_time, '23:59:59') >= CURTIME())
                   )`,
                [chama_id],
                (meetingCountError, meetingCountRows) => {
                  if (meetingCountError) {
                    console.log(
                      "Chairperson dashboard meeting count error: " +
                        meetingCountError.message,
                    );
                    return res.status(500).render("pages/user/500.ejs");
                  }

                  const upcomingEvents = Number(
                    meetingCountRows[0]?.upcoming_events || 0,
                  );

                  connection.query(
                    `SELECT
                       IFNULL(SUM(CASE WHEN DATE_FORMAT(created_at, '%Y-%m') = ? THEN amount ELSE 0 END), 0) AS collected
                     FROM Transactions
                     WHERE chama_id = ?
                       AND transaction_type = 'contribution'
                       AND status = 'completed'`,
                    [currentMonth, chama_id],
                    (contribError, contribRows) => {
                      if (contribError) {
                        console.log(
                          "Chairperson dashboard contributions error: " +
                            contribError.message,
                        );
                        return res.status(500).render("pages/user/500.ejs");
                      }

                      const collectedContributions = Number(
                        contribRows[0]?.collected || 0,
                      );
                      const expectedContributions =
                        activeMembers * contributionAmount;
                      const contributionRate =
                        expectedContributions > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (collectedContributions /
                                  expectedContributions) *
                                  100,
                              ),
                            )
                          : 0;

                      connection.query(
                        `SELECT
                           SUM(CASE WHEN IFNULL(ma.attended, 0) = 1 THEN 1 ELSE 0 END) AS attended_count,
                           COUNT(ma.attendance_id) AS attendance_records
                         FROM Meetings m
                         LEFT JOIN Meeting_Attendance ma ON ma.meeting_id = m.meeting_id
                         WHERE m.chama_id = ?`,
                        [chama_id],
                        (attendanceError, attendanceRows) => {
                          if (attendanceError) {
                            console.log(
                              "Chairperson dashboard attendance error: " +
                                attendanceError.message,
                            );
                            return res.status(500).render("pages/user/500.ejs");
                          }

                          const attendedCount = Number(
                            attendanceRows[0]?.attended_count || 0,
                          );
                          const attendanceRecords = Number(
                            attendanceRows[0]?.attendance_records || 0,
                          );
                          const attendanceRate =
                            attendanceRecords > 0
                              ? Math.round(
                                  (attendedCount / attendanceRecords) * 100,
                                )
                              : 0;

                          connection.query(
                            `SELECT
                               SUM(CASE WHEN document_type = 'constitution' THEN 1 ELSE 0 END) AS constitution_count,
                               SUM(CASE WHEN document_type = 'bylaws' THEN 1 ELSE 0 END) AS bylaws_count
                             FROM Group_Documents
                             WHERE chama_id = ?`,
                            [chama_id],
                            (govError, govRows) => {
                              if (
                                govError &&
                                govError.code !== "ER_NO_SUCH_TABLE"
                              ) {
                                console.log(
                                  "Chairperson dashboard governance error: " +
                                    govError.message,
                                );
                                return res
                                  .status(500)
                                  .render("pages/user/500.ejs");
                              }

                              const constitutionCount = Number(
                                govRows?.[0]?.constitution_count || 0,
                              );
                              const bylawsCount = Number(
                                govRows?.[0]?.bylaws_count || 0,
                              );
                              const governanceScore =
                                constitutionCount > 0 && bylawsCount > 0
                                  ? 100
                                  : constitutionCount > 0 || bylawsCount > 0
                                    ? 60
                                    : 20;

                              const groupHealthScore = Math.round(
                                contributionRate * 0.5 +
                                  attendanceRate * 0.3 +
                                  governanceScore * 0.2,
                              );

                              connection.query(
                                `SELECT activity_date, activity, owner, status
                                 FROM (
                                   SELECT
                                     t.created_at AS activity_date,
                                     CONCAT('Contribution received: ', u.full_name) AS activity,
                                     'Treasury' AS owner,
                                     CASE
                                       WHEN t.status = 'completed' THEN 'completed'
                                       ELSE 'pending'
                                     END AS status
                                   FROM Transactions t
                                   JOIN Users u ON u.user_id = t.user_id
                                   WHERE t.chama_id = ?
                                     AND t.transaction_type = 'contribution'

                                   UNION ALL

                                   SELECT
                                     gd.uploaded_at AS activity_date,
                                     CONCAT('Document uploaded: ', gd.title) AS activity,
                                     IFNULL(u2.full_name, 'System') AS owner,
                                     'completed' AS status
                                   FROM Group_Documents gd
                                   LEFT JOIN Users u2 ON u2.user_id = gd.uploaded_by
                                   WHERE gd.chama_id = ?

                                   UNION ALL

                                   SELECT
                                     m.created_at AS activity_date,
                                     CONCAT('Meeting scheduled: ', IFNULL(m.meeting_title, 'General meeting')) AS activity,
                                     'Leadership' AS owner,
                                     CASE
                                       WHEN m.meeting_date < CURDATE() THEN 'held'
                                       ELSE 'upcoming'
                                     END AS status
                                   FROM Meetings m
                                   WHERE m.chama_id = ?
                                 ) AS activities
                                 ORDER BY activity_date DESC
                                 LIMIT 8`,
                                [chama_id, chama_id, chama_id],
                                (activityError, recentActivities) => {
                                  if (
                                    activityError &&
                                    (activityError.code ===
                                      "ER_NO_SUCH_TABLE" ||
                                      activityError.code ===
                                        "ER_BAD_FIELD_ERROR")
                                  ) {
                                    return res.render(
                                      "pages/chairperson/dashboard.ejs",
                                      {
                                        success,
                                        metrics: {
                                          groupHealthScore,
                                          activeMembers,
                                          pendingIssues,
                                          upcomingEvents,
                                          attendanceRate,
                                          contributionRate,
                                          newMembers,
                                        },
                                        recentActivities: [],
                                      },
                                    );
                                  }

                                  if (activityError) {
                                    console.log(
                                      "Chairperson dashboard activities error: " +
                                        activityError.message,
                                    );
                                    return res
                                      .status(500)
                                      .render("pages/user/500.ejs");
                                  }

                                  return res.render(
                                    "pages/chairperson/dashboard.ejs",
                                    {
                                      success,
                                      metrics: {
                                        groupHealthScore,
                                        activeMembers,
                                        pendingIssues,
                                        upcomingEvents,
                                        attendanceRate,
                                        contributionRate,
                                        newMembers,
                                      },
                                      recentActivities,
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
                },
              );
            },
          );
        },
      );
    },
  );
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

          connection.query(
            `SELECT dr.record_id,
                    dr.subject,
                    dr.description,
                    dr.status,
                    DATE_FORMAT(dr.created_at, '%Y-%m-%d %H:%i') AS created_at,
                    rb.full_name AS reported_by_name,
                    rm.full_name AS reported_member_name
             FROM Disciplinary_Records dr
             LEFT JOIN Users rb ON rb.user_id = dr.reported_by
             LEFT JOIN Users rm ON rm.user_id = dr.reported_member_id
             WHERE dr.chama_id = ?
             ORDER BY dr.created_at DESC, dr.record_id DESC
             LIMIT 40`,
            [chama_id],
            (disciplinaryErr, disciplinaryRecords) => {
              if (
                disciplinaryErr &&
                disciplinaryErr.code !== "ER_NO_SUCH_TABLE"
              ) {
                console.log(
                  "Chairperson disciplinary records load error: " +
                    disciplinaryErr.message,
                );
                return res.status(500).render("pages/user/500.ejs");
              }

              res.render("pages/chairperson/members.ejs", {
                chama: chamaRows[0],
                members,
                disciplinaryRecords:
                  disciplinaryErr && disciplinaryErr.code === "ER_NO_SUCH_TABLE"
                    ? []
                    : disciplinaryRecords,
                success: req.query.success || null,
                error: req.query.error || null,
              });
            },
          );
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
       AND document_type IN ('constitution', 'bylaws')
     ORDER BY uploaded_at DESC, document_id DESC`,
    [chama_id],
    (docsError, governanceDocuments) => {
      if (docsError && docsError.code !== "ER_NO_SUCH_TABLE") {
        console.log(
          "Chairperson governance docs load error: " + docsError.message,
        );
        return res.status(500).render("pages/user/500.ejs");
      }

      connection.query(
        `SELECT u.full_name,
                COALESCE(cm.phone_number, u.phone_number) AS phone_number,
                cm.role,
                DATE_FORMAT(cm.joined_date, '%Y-%m-%d') AS joined_date
         FROM Chama_Members cm
         JOIN Users u ON u.user_id = cm.user_id
         WHERE cm.chama_id = ?
           AND cm.role IN ('chairperson', 'treasurer', 'secretary')
         ORDER BY FIELD(cm.role, 'chairperson', 'treasurer', 'secretary'),
                  u.full_name ASC`,
        [chama_id],
        (committeeError, committeeMembers) => {
          if (committeeError) {
            console.log(
              "Chairperson governance committee load error: " +
                committeeError.message,
            );
            return res.status(500).render("pages/user/500.ejs");
          }

          return res.render("pages/chairperson/governance.ejs", {
            governanceDocuments:
              docsError && docsError.code === "ER_NO_SUCH_TABLE"
                ? []
                : governanceDocuments,
            committeeMembers,
            success: req.query.success || null,
            error: req.query.error || null,
          });
        },
      );
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
  if (!req.session.user || req.session.role !== "chairperson") {
    return res.status(401).render("pages/user/401.ejs");
  }

  return res.render("pages/chairperson/meetings.ejs", {
    success: req.query.success || null,
    error: req.query.error || null,
  });
});

app.post("/chairperson/meetings/create", (req, res) => {
  if (!req.session.user || req.session.role !== "chairperson") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const {
    meeting_title,
    meeting_date,
    meeting_time,
    meeting_location,
    meeting_agenda,
    invite_scope,
  } = req.body;

  const cleanedTitle = String(meeting_title || "").trim();
  const cleanedLocation = String(meeting_location || "").trim();
  const cleanedAgenda = String(meeting_agenda || "").trim();
  const cleanedInviteScope = ["committee", "all_members"].includes(
    String(invite_scope || "").trim(),
  )
    ? String(invite_scope).trim()
    : "all_members";

  if (
    !cleanedTitle ||
    !meeting_date ||
    !meeting_time ||
    !cleanedLocation ||
    !cleanedAgenda
  ) {
    return res.redirect(
      "/chairperson/meetings?error=Please fill in all required meeting fields.",
    );
  }

  connection.query(
    `INSERT INTO Meetings
      (chama_id, meeting_title, meeting_date, meeting_time, location, invite_scope, meeting_kind, agenda)
     VALUES (?, ?, ?, ?, ?, ?, 'special', ?)`,
    [
      chama_id,
      cleanedTitle,
      meeting_date,
      meeting_time,
      cleanedLocation,
      cleanedInviteScope,
      cleanedAgenda,
    ],
    (createError) => {
      if (createError) {
        if (createError.code === "ER_BAD_FIELD_ERROR") {
          const fallbackAgenda = `[KIND:special][SCOPE:${cleanedInviteScope}] ${cleanedAgenda}`;

          return connection.query(
            `INSERT INTO Meetings
              (chama_id, meeting_title, meeting_date, meeting_time, location, agenda)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              chama_id,
              cleanedTitle,
              meeting_date,
              meeting_time,
              cleanedLocation,
              fallbackAgenda,
            ],
            (fallbackCreateError) => {
              if (fallbackCreateError) {
                console.log(
                  "Chairperson create meeting fallback error: " +
                    fallbackCreateError.message,
                );
                return res.redirect(
                  "/chairperson/meetings?error=Could not schedule special meeting.",
                );
              }

              return res.redirect(
                "/chairperson/meetings?success=Special meeting scheduled successfully.",
              );
            },
          );
        }

        console.log("Chairperson create meeting error: " + createError.message);
        return res.redirect(
          "/chairperson/meetings?error=Could not schedule special meeting.",
        );
      }

      return res.redirect(
        "/chairperson/meetings?success=Special meeting scheduled successfully.",
      );
    },
  );
});

app.get("/chairperson/reports", (req, res) => {
  if (!req.session.user || req.session.role !== "chairperson") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const summary = {
    committeeReviews: 0,
    openDisciplinaryIssues: 0,
    governanceDocuments: 0,
    attendanceTrend: 0,
  };

  connection.query(
    `SELECT document_id, title, file_name, file_path,
            DATE_FORMAT(uploaded_at, '%Y-%m-%d %H:%i') AS uploaded_at
     FROM Group_Documents
     WHERE chama_id = ? AND document_type = 'governance'
     ORDER BY uploaded_at DESC, document_id DESC`,
    [chama_id],
    (reportsError, executiveReports) => {
      if (reportsError && reportsError.code !== "ER_NO_SUCH_TABLE") {
        console.log(
          "Chairperson executive reports load error: " + reportsError.message,
        );
        return res.status(500).render("pages/user/500.ejs");
      }

      const safeExecutiveReports =
        reportsError && reportsError.code === "ER_NO_SUCH_TABLE"
          ? []
          : executiveReports;

      connection.query(
        `SELECT COUNT(*) AS total
         FROM Disciplinary_Records
         WHERE chama_id = ? AND DATE_FORMAT(created_at, '%Y-%m') = ?`,
        [chama_id, currentMonth],
        (reviewsError, reviewsRows) => {
          if (reviewsError && reviewsError.code !== "ER_NO_SUCH_TABLE") {
            console.log(
              "Chairperson reports committee reviews error: " +
                reviewsError.message,
            );
            return res.status(500).render("pages/user/500.ejs");
          }

          summary.committeeReviews = Number(reviewsRows?.[0]?.total || 0);

          connection.query(
            `SELECT COUNT(*) AS total
             FROM Disciplinary_Records
             WHERE chama_id = ?
               AND LOWER(IFNULL(status, 'open')) NOT IN ('resolved', 'closed')`,
            [chama_id],
            (issuesError, issuesRows) => {
              if (issuesError && issuesError.code !== "ER_NO_SUCH_TABLE") {
                console.log(
                  "Chairperson reports disciplinary issues error: " +
                    issuesError.message,
                );
                return res.status(500).render("pages/user/500.ejs");
              }

              summary.openDisciplinaryIssues = Number(
                issuesRows?.[0]?.total || 0,
              );

              connection.query(
                `SELECT COUNT(*) AS total
                 FROM Group_Documents
                 WHERE chama_id = ?
                   AND document_type IN ('constitution', 'bylaws', 'governance')`,
                [chama_id],
                (docsError, docsRows) => {
                  if (docsError && docsError.code !== "ER_NO_SUCH_TABLE") {
                    console.log(
                      "Chairperson reports governance docs summary error: " +
                        docsError.message,
                    );
                    return res.status(500).render("pages/user/500.ejs");
                  }

                  summary.governanceDocuments = Number(
                    docsRows?.[0]?.total || 0,
                  );

                  connection.query(
                    `SELECT
                       SUM(CASE WHEN IFNULL(ma.attended, 0) = 1 THEN 1 ELSE 0 END) AS attended_count,
                       COUNT(ma.attendance_id) AS attendance_records
                     FROM Meetings m
                     LEFT JOIN Meeting_Attendance ma ON ma.meeting_id = m.meeting_id
                     WHERE m.chama_id = ?
                       AND m.meeting_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
                    [chama_id],
                    (attendanceError, attendanceRows) => {
                      if (
                        attendanceError &&
                        attendanceError.code !== "ER_NO_SUCH_TABLE"
                      ) {
                        console.log(
                          "Chairperson reports attendance trend error: " +
                            attendanceError.message,
                        );
                        return res.status(500).render("pages/user/500.ejs");
                      }

                      const attendedCount = Number(
                        attendanceRows?.[0]?.attended_count || 0,
                      );
                      const attendanceRecords = Number(
                        attendanceRows?.[0]?.attendance_records || 0,
                      );
                      summary.attendanceTrend =
                        attendanceRecords > 0
                          ? Math.round(
                              (attendedCount / attendanceRecords) * 100,
                            )
                          : 0;

                      return res.render("pages/chairperson/reports.ejs", {
                        executiveReports: safeExecutiveReports,
                        summary,
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
    },
  );
});

app.post("/chairperson/reports/create", (req, res) => {
  if (!req.session.user || req.session.role !== "chairperson") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const uploaded_by = req.session.user.user_id;
  const title = String(req.body.title || "").trim();
  const content = String(req.body.content || "").trim();

  if (!title || !content) {
    return res.redirect(
      "/chairperson/reports?error=Please provide both report title and report details.",
    );
  }

  const safeTitle = title
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
  const timestamp = Date.now();
  const generatedFileName = `executive-report-${safeTitle || "report"}-${timestamp}.txt`;
  const absolutePath = path.join(governanceDocsUploadDir, generatedFileName);
  const filePath = `/uploads/governance/${generatedFileName}`;
  const fileBody = `Executive Report\nTitle: ${title}\nGenerated: ${new Date().toISOString()}\n\n${content}\n`;

  fs.writeFile(absolutePath, fileBody, "utf8", (writeError) => {
    if (writeError) {
      console.log("Executive report file write error: " + writeError.message);
      return res.status(500).render("pages/user/500.ejs");
    }

    connection.query(
      `INSERT INTO Group_Documents
       (chama_id, title, document_type, file_name, file_path, uploaded_by)
       VALUES (?, ?, 'governance', ?, ?, ?)`,
      [chama_id, title, generatedFileName, filePath, uploaded_by],
      (insertError) => {
        if (insertError) {
          if (insertError.code === "ER_NO_SUCH_TABLE") {
            return res.redirect(
              "/chairperson/reports?error=Documents table is missing. Run latest migration.",
            );
          }

          console.log("Executive report save error: " + insertError.message);
          return res.status(500).render("pages/user/500.ejs");
        }

        return res.redirect(
          "/chairperson/reports?success=Executive report created successfully.",
        );
      },
    );
  });
});

app.get("/chairperson/welfare", (req, res) => {
  if (!req.session.user || req.session.role !== "chairperson") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;

  connection.query(
    `SELECT wr.request_id,
            u.full_name AS member_name,
            wr.request_type,
            wr.requested_amount,
            wr.reason,
            DATE_FORMAT(wr.created_at, '%Y-%m-%d %H:%i') AS requested_on
     FROM Welfare_Requests wr
     JOIN Users u ON u.user_id = wr.requested_by
     WHERE wr.chama_id = ?
       AND wr.status = 'pending'
     ORDER BY wr.created_at ASC, wr.request_id ASC`,
    [chama_id],
    (pendingError, pendingRequests) => {
      if (pendingError && pendingError.code !== "ER_NO_SUCH_TABLE") {
        console.log(
          "Chairperson welfare pending requests load error: " +
            pendingError.message,
        );
        return res.status(500).render("pages/user/500.ejs");
      }

      connection.query(
        `SELECT
           IFNULL(SUM(CASE WHEN status = 'approved' THEN requested_amount ELSE 0 END), 0) AS total_approved,
           IFNULL(SUM(CASE
                        WHEN status = 'approved'
                          AND YEAR(reviewed_at) = YEAR(CURDATE())
                          AND QUARTER(reviewed_at) = QUARTER(CURDATE())
                        THEN requested_amount
                        ELSE 0
                      END), 0) AS disbursed_quarter,
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS open_requests
         FROM Welfare_Requests
         WHERE chama_id = ?`,
        [chama_id],
        (summaryError, summaryRows) => {
          if (summaryError && summaryError.code !== "ER_NO_SUCH_TABLE") {
            console.log(
              "Chairperson welfare summary load error: " + summaryError.message,
            );
            return res.status(500).render("pages/user/500.ejs");
          }

          connection.query(
            `SELECT IFNULL(SUM(CASE
                                 WHEN transaction_type = 'contribution'
                                      AND status = 'completed'
                                 THEN amount
                                 ELSE 0
                               END), 0) AS total_savings
             FROM Transactions
             WHERE chama_id = ?`,
            [chama_id],
            (savingsError, savingsRows) => {
              if (savingsError) {
                console.log(
                  "Chairperson welfare savings load error: " +
                    savingsError.message,
                );
                return res.status(500).render("pages/user/500.ejs");
              }

              const summary = summaryRows?.[0] || {};
              const totalSavings = Number(savingsRows?.[0]?.total_savings || 0);
              const totalApproved = Number(summary.total_approved || 0);
              const welfareSummary = {
                currentBalance: totalSavings - totalApproved,
                disbursedQuarter: Number(summary.disbursed_quarter || 0),
                openRequests: Number(summary.open_requests || 0),
              };

              return res.render("pages/chairperson/welfare.ejs", {
                pendingRequests:
                  pendingError && pendingError.code === "ER_NO_SUCH_TABLE"
                    ? []
                    : pendingRequests,
                welfareSummary,
                success: req.query.success || null,
                error: req.query.error || null,
              });
            },
          );
        },
      );
    },
  );
});

app.post("/chairperson/welfare/decision", (req, res) => {
  if (!req.session.user || req.session.role !== "chairperson") {
    return res.status(401).render("pages/user/401.ejs");
  }

  const chama_id = req.session.chama_id;
  const reviewed_by = req.session.user.user_id;
  const requestId = Number(req.body.request_id || 0);
  const decision = String(req.body.decision || "")
    .trim()
    .toLowerCase();
  const decisionStatus =
    decision === "approve"
      ? "approved"
      : decision === "reject"
        ? "rejected"
        : null;

  if (!requestId || !decisionStatus) {
    return res.redirect(
      "/chairperson/welfare?error=Invalid welfare decision submitted.",
    );
  }

  connection.query(
    `UPDATE Welfare_Requests
     SET status = ?, reviewed_by = ?, reviewed_at = NOW()
     WHERE request_id = ? AND chama_id = ? AND status = 'pending'`,
    [decisionStatus, reviewed_by, requestId, chama_id],
    (updateError, updateResult) => {
      if (updateError) {
        if (updateError.code === "ER_NO_SUCH_TABLE") {
          return res.redirect(
            "/chairperson/welfare?error=Welfare requests table is missing. Run latest migration.",
          );
        }

        console.log(
          "Chairperson welfare decision error: " + updateError.message,
        );
        return res.status(500).render("pages/user/500.ejs");
      }

      if (!updateResult || updateResult.affectedRows === 0) {
        return res.redirect(
          "/chairperson/welfare?error=Request not found or already reviewed.",
        );
      }

      return res.redirect(
        `/chairperson/welfare?success=Welfare request ${decisionStatus}.`,
      );
    },
  );
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
