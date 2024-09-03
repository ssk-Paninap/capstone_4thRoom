const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');
const natural = require('natural');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const app = express();
const port = 3000;
const Sentiment = require('sentiment');
const sentiment = new Sentiment();
// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static('components'));
app.use('/media', express.static('media'));
// Database connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'schoolchatbot'
});

connection.connect(error => {
    if (error) throw error;
    console.log('Database connected!');
});

// JWT secret key
const JWT_SECRET = 'your_jwt_secret_key';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Failed to authenticate token' });
        req.userId = decoded.id;
        next();
    });
};

const verifyAdminToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Failed to authenticate token' });
        if (decoded.role !== 'primary_admin' && decoded.role !== 'secondary_admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        req.userId = decoded.id;
        next();
    });
};
const verifyPrimaryAdminToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Failed to authenticate token' });
        if (decoded.role !== 'primary_admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        req.userId = decoded.id;
        next();
    });
};

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    limits: {
        fileSize: 5 * 1024 * 1024 // limit file size to 5MB
    }
});
//admin codes

// Admin signup route
app.post('/admin-signup', async (req, res) => {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(checkUserQuery, [email], async (error, results) => {
        if (error) {
            console.error('Error checking user:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }

        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = 'INSERT INTO users (name, email, password, role, user_type) VALUES (?, ?, ?, ?, ?)';
        connection.query(query, [name, email, hashedPassword, role, 'employee'], (error, results) => {
            if (error) {
                console.error('Error inserting user:', error);
                return res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
            res.json({ success: true });
        });
    });
});


// Admin login route
app.post('/admin-login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = ? AND role IN ("primary_admin", "secondary_admin")';
    connection.query(query, [email], async (error, results) => {
        if (error) {
            console.error('Error fetching admin:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }

        if (results.length > 0) {
            const admin = results[0];
            const isMatch = await bcrypt.compare(password, admin.password);
            if (isMatch) {
                const token = jwt.sign({ id: admin.id, role: admin.role }, JWT_SECRET, { expiresIn: '1h' });
                res.json({ success: true, token: token, userId: admin.id, role: admin.role });
            } else {
                res.json({ success: false, message: 'Invalid password' });
            }
        } else {
            res.json({ success: false, message: 'Admin not found' });
        }
    });
});

app.post('/add-secondary-admin', verifyPrimaryAdminToken, async (req, res) => {
    const { name, email, password } = req.body;

    // Check if user already exists
    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(checkUserQuery, [email], async (error, results) => {
        if (error) {
            console.error('Error checking user:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }

        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = 'INSERT INTO users (name, email, password, role, user_type) VALUES (?, ?, ?, ?, ?)';
        connection.query(query, [name, email, hashedPassword, 'secondary_admin', 'employee'], (error, results) => {
            if (error) {
                console.error('Error inserting user:', error);
                return res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
            res.json({ success: true, message: 'Secondary admin added successfully' });
        });
    });
});

app.get('/secondary-admins', verifyPrimaryAdminToken, (req, res) => {
    const query = 'SELECT id, name, email FROM users WHERE role = "secondary_admin"';
    connection.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching secondary admins:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        res.json({ success: true, admins: results });
    });
});

// Route to delete a secondary admin (only accessible by primary admin)
app.delete('/delete-secondary-admin/:id', verifyPrimaryAdminToken, (req, res) => {
    const adminId = req.params.id;
    const query = 'DELETE FROM users WHERE id = ? AND role = "secondary_admin"';
    connection.query(query, [adminId], (error, results) => {
        if (error) {
            console.error('Error deleting secondary admin:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Admin not found or not a secondary admin' });
        }
        res.json({ success: true, message: 'Secondary admin deleted successfully' });
    });
});

app.get('/admin/user-permissions/:userId', verifyAdminToken, (req, res) => {
    const userId = req.params.userId;
    const query = 'SELECT pp.name FROM user_page_permissions upp JOIN page_permissions pp ON upp.permission_id = pp.id WHERE upp.user_id = ?';
    connection.query(query, [userId], (error, results) => {
        if (error) {
            console.error('Error fetching user permissions:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        const permissions = results.map(row => row.name);
        res.json({ permissions });
    });
});

function checkPermission(requiredPermission) {
    return (req, res, next) => {
        const token = req.headers['authorization'];
        if (!token) return res.status(403).json({ error: 'No token provided' });

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) return res.status(401).json({ error: 'Failed to authenticate token' });
            
            if (decoded.role === 'primary_admin') {
                next(); // Primary admin has access to everything
            } else if (decoded.role === 'secondary_admin') {
                // Check if the user has the required permission
                const query = 'SELECT 1 FROM user_page_permissions upp JOIN page_permissions pp ON upp.permission_id = pp.id WHERE upp.user_id = ? AND pp.name = ?';
                connection.query(query, [decoded.id, requiredPermission], (error, results) => {
                    if (error) {
                        console.error('Error checking permissions:', error);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }
                    if (results.length > 0) {
                        next();
                    } else {
                        res.status(403).json({ error: 'Access denied' });
                    }
                });
            } else {
                res.status(403).json({ error: 'Not authorized' });
            }
        });
    };
}

  
// Protect all routes under /admin
app.use('/admin', verifyAdminToken);

app.get('/admin-login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'components', 'admin-login.html'));
});
// Admin dashboard route
app.get('/admin/dashboard', checkPermission('dashboard_view'), (req, res) => {
    res.sendFile(path.join(__dirname, 'components', 'admin', 'dashboard.html'));
  });

// Other admin routes
app.get('/admin/bursar', checkPermission('bursar_access'), (req, res) => {
  res.sendFile(path.join(__dirname, 'components', 'admin', 'bursar.html'));
});

app.get('/admin/library', checkPermission('library_access'), (req, res) => {
    res.sendFile(path.join(__dirname, 'components', 'admin', 'libary.html'));
  });

  app.get('/admin/osa', checkPermission('osa_access'), (req, res) => {
    res.sendFile(path.join(__dirname, 'components', 'admin', 'osa.html'));
  });

  app.get('/admin/guidance', checkPermission('guidance_access'), (req, res) => {
    res.sendFile(path.join(__dirname, 'components', 'admin', 'guidance.html'));
  });

  app.get('/admin/registrar', checkPermission('registrar_access'), (req, res) => {
    res.sendFile(path.join(__dirname, 'components', 'admin', 'registrar.html'));
  });

  app.get('/admin/avp', checkPermission('avp_access'), (req, res) => {
    res.sendFile(path.join(__dirname, 'components', 'admin', 'avp.html'));
  });

  app.get('/admin/course-department', checkPermission('course_department_access'), (req, res) => {
    res.sendFile(path.join(__dirname, 'components', 'admin', 'course-department.html'));
  });


  app.get('/admin/manage-admin', checkPermission('manage_admin_access'), (req, res) => {
    res.sendFile(path.join(__dirname, 'components', 'admin', 'manage-admin.html'));
  });


  app.get('/admin/user-permissions/:userId', verifyPrimaryAdminToken, (req, res) => {
    const userId = req.params.userId;
    const query = `
      SELECT pp.name
      FROM user_page_permissions upp
      JOIN page_permissions pp ON upp.permission_id = pp.id
      WHERE upp.user_id = ?
    `;
    connection.query(query, [userId], (error, results) => {
      if (error) {
        console.error('Error fetching user permissions:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      const permissions = results.map(row => row.name);
      res.json({ permissions });
    });
  });
  
  app.post('/admin/set-user-permissions', verifyPrimaryAdminToken, (req, res) => {
    const { userId, permissions } = req.body;
    
    // First, delete existing permissions for the user
    const deleteQuery = 'DELETE FROM user_page_permissions WHERE user_id = ?';
    connection.query(deleteQuery, [userId], (error) => {
      if (error) {
        console.error('Error deleting existing permissions:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      
      // Now, insert new permissions
      const insertQuery = 'INSERT INTO user_page_permissions (user_id, permission_id) SELECT ?, id FROM page_permissions WHERE name IN (?)';
      connection.query(insertQuery, [userId, permissions], (error) => {
        if (error) {
          console.error('Error setting new permissions:', error);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json({ success: true, message: 'Permissions updated successfully' });
      });
    });
  });


//profile codes
app.post('/edit-profile', verifyToken, upload.single('profileImage'), (req, res) => {
    const userId = req.userId;
    const profileImage = req.file ? req.file.filename : null;

    const query = 'UPDATE users SET profile_image = ? WHERE id = ?';
    connection.query(query, [profileImage, userId], (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ success: false, message: 'Database error occurred' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'Profile updated successfully!' });
    });
});

app.get('/admin/check-permission/:permission', verifyToken, (req, res) => {
    const requiredPermission = req.params.permission;
    const userId = req.userId;

    if (req.userRole === 'primary_admin') {
        return res.json({ hasPermission: true });
    }

    const query = 'SELECT 1 FROM user_page_permissions upp JOIN page_permissions pp ON upp.permission_id = pp.id WHERE upp.user_id = ? AND pp.name = ?';
    connection.query(query, [userId, requiredPermission], (error, results) => {
        if (error) {
            console.error('Error checking permissions:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json({ hasPermission: results.length > 0 });
    });
});

app.get('/admin/check-role', verifyToken, (req, res) => {
    const query = 'SELECT role FROM users WHERE id = ?';
    connection.query(query, [req.userId], (error, results) => {
        if (error) {
            console.error('Error checking user role:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        if (results.length > 0) {
            const isPrimaryAdmin = results[0].role === 'primary_admin';
            res.json({ isPrimaryAdmin });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });
});

// Route to handle sign-up
app.post('/signup', async (req, res) => {
    const { name, email, password, gender, userType } = req.body;

    // Check if user already exists
    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(checkUserQuery, [email], async (error, results) => {
        if (error) {
            console.error('Error checking user:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        
        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Add 'regular_user' as the default role
        const query = 'INSERT INTO users (name, email, password, gender, user_type, role) VALUES (?, ?, ?, ?, ?, ?)';
        connection.query(query, [name, email, hashedPassword, gender, userType, 'regular_user'], (error, results) => {
            if (error) {
                console.error('Error inserting user:', error);
                return res.status(500).json({ success: false, message: 'Internal Server Error' });
            }
            res.json({ success: true });
        });
    });
});

// Route to handle login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = ?';
    connection.query(query, [email], async (error, results) => {
        if (error) {
            console.error('Error fetching user:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }

        if (results.length > 0) {
            const user = results[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
                res.json({ success: true, token: token, userId: user.id });
            } else {
                res.json({ success: false, message: 'Invalid password' });
            }
        } else {
            res.json({ success: false, message: 'User not found' });
        }
    });
});

// Route to get user profile
app.get('/profile', verifyToken, (req, res) => {
    const query = 'SELECT id, name, email, gender, user_type, profile_image FROM users WHERE id = ?';
    connection.query(query, [req.userId], (error, results) => {
        if (error) {
            console.error('Error fetching user profile:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });
});

// NLP setup
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Greetings array
const greetings = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'howdy', 'hiya'];

// Route to fetch questions
app.get('/questions', (req, res) => {
    const department = req.query.department;
    let query = 'SELECT * FROM faq';
    let params = [];

    if (department) {
        query += ' WHERE department = ?';
        params.push(department);
    }

    connection.query(query, params, (error, results) => {
        if (error) {
            console.error('Error fetching questions:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        // Convert image_data to base64
        results = results.map(row => {
            if (row.image_data) {
                row.image_data = row.image_data.toString('base64');
            }
            return row;
        });
        res.json(results);
    });
});


// Route to handle chatbot messages
app.post('/chatbot', (req, res) => {
    const { message } = req.body;
    const similarityThreshold = 0.6;
    let userId = null;

    // Check for authentication
    const token = req.headers['authorization'];
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
        } catch (err) {
            console.error('Invalid token:', err);
            // Don't return here, allow the request to continue
        }
    }

    // Perform sentiment analysis
    const sentimentResult = sentiment.analyze(message);
    const sentimentScore = sentimentResult.score;

    // Define lowercaseMessage here, before it's used
    const lowercaseMessage = message.toLowerCase();

    connection.query('SELECT * FROM faq', (error, results) => {
        if (error) {
            console.error('Error fetching questions:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        let response = '';
        const containsGreeting = greetings.some(greeting => 
            lowercaseMessage.split(/\s+/).includes(greeting)
        );

        if (containsGreeting) {
            // Handle greeting based on sentiment
            if (sentimentScore > 0) {
                response += "Hello! It's great to see you in a good mood. How can I assist you today?";
            } else if (sentimentScore < 0) {
                response += "Hello. I hope I can help improve your day. What can I do for you?";
            } else {
                response += "Hello! How can I assist you today?";
            }
        }

        // Only proceed to answer questions if the message contains more than just a greeting
        if (!containsGreeting || lowercaseMessage.split(/\s+/).length > 1) {
            const questions = splitIntoQuestions(message);
            const answers = questions.map(question => improvedFindBestMatch(question, results, similarityThreshold))
                                     .filter(match => match !== null);

            const imagesToProcess = [];

            if (answers.length > 0) {
                answers.forEach(match => {
                    if (match.confidence > 0.8) {
                        response += match.response + ' ';
                    } 

                    if (match.imageId) {
                        imagesToProcess.push(match.imageId);
                    }
                });

                // Process images after constructing the text response
                if (imagesToProcess.length > 0) {
                    const processImages = imagesToProcess.map(imageId => {
                        return new Promise((resolve, reject) => {
                            const imageQuery = 'SELECT image_data FROM faq WHERE id = ?';
                            connection.query(imageQuery, [imageId], (error, results) => {
                                if (error) reject(error);
                                if (results.length > 0 && results[0].image_data) {
                                    const imageData = results[0].image_data;
                                    const base64Image = Buffer.from(imageData).toString('base64');
                                    resolve(`<img src="data:image/jpeg;base64,${base64Image}" alt="Related image">`);
                                } else {
                                    resolve(''); // Resolve with empty string if image not found or null
                                }
                            });
                        });
                    });

                    Promise.all(processImages)
                        .then(imageHtmlArray => {
                            response += imageHtmlArray.join(' ');
                            finalize();
                        })
                        .catch(error => {
                            console.error('Error processing images:', error);
                            finalize();
                        });
                } else {
                    finalize();
                }
            } else if (!containsGreeting) {
                // Handle no answers based on sentiment
                if (sentimentScore < -2) {
                    response = "I'm sorry you're feeling frustrated. Let's try to find the information you need. Could you rephrase your question or specify which department you're asking about?";
                } else if (sentimentScore > 2) {
                    response = "I appreciate your positive attitude! I couldn't find a specific answer to your question. Could you provide more details about what you're looking for?";
                } else {
                    response = "I'm afraid I don't have specific information about that. Could you rephrase your question or provide more details?";
                }
                finalize();
            } else {
                finalize();
            }
        } else {
            finalize();
        }

        function finalize() {
            // Add sentiment-based closing
            if (sentimentScore < -1) {
                response += " I hope this information helps improve your day.";
            } else if (sentimentScore > 1) {
                response += " I'm glad I could assist you!";
            }
    
            // Store conversation history only for authenticated users
            if (userId) {
                storeConversationHistory(userId, message, response.trim());
            }
    
            res.json({ answer: response.trim(), isHtml: true });
        }
    });
});



function improvedFindBestMatch(userQuestion, faqResults, threshold) {
    let bestMatch = {
        score: 0,
        response: null,
        confidence: 0
    };

    const userQuestionTokens = tokenizer.tokenize(userQuestion.toLowerCase());
    const userQuestionStems = userQuestionTokens.map(token => stemmer.stem(token));

    faqResults.forEach(record => {
        // Check keywords with higher weight
        const keywordTokens = tokenizer.tokenize(record.keywords.toLowerCase());
        const keywordStems = keywordTokens.map(token => stemmer.stem(token));
        const keywordSimilarity = natural.JaroWinklerDistance(userQuestionStems.join(' '), keywordStems.join(' '));

        // Check question with lower weight
        const questionTokens = tokenizer.tokenize(record.question.toLowerCase());
        const questionStems = questionTokens.map(token => stemmer.stem(token));
        const questionSimilarity = natural.JaroWinklerDistance(userQuestionStems.join(' '), questionStems.join(' '));

        // Calculate overall similarity with higher weight on keywords
        const overallSimilarity = (keywordSimilarity * 0.7) + (questionSimilarity * 0.3);

        // Check for exact keyword matches
        const exactKeywordMatches = keywordStems.filter(stem => userQuestionStems.includes(stem)).length;
        const keywordMatchBonus = exactKeywordMatches / keywordStems.length;

        // Combine similarity and exact matches
        const finalScore = overallSimilarity + keywordMatchBonus;

        if (finalScore > bestMatch.score) {
            bestMatch.score = finalScore;
            bestMatch.response = record.answer;
            bestMatch.confidence = finalScore;
            if (record.image_data) {
                bestMatch.imageId = record.id;
            }
        }
    });

    if (bestMatch.score >= threshold) {
        return bestMatch;
    } else {
        return null;
    }
}

function splitIntoQuestions(message) {
    // Split on common sentence-ending punctuation and question words
    const splits = message.split(/[.!?,]|\s+(?:what|where|when|who|why|how|can|could|would|should|is|are|do|does|did|will|and|also)/i);
    return splits.map(q => q.trim()).filter(q => q.length > 0);
}
app.post('/save-chat-history', verifyToken, (req, res) => {
    const { message, response } = req.body;
    const userId = req.userId; // This comes from the verifyToken middleware

    // First, create or get the conversation
    const createConversationQuery = 'INSERT INTO conversations (user_id, timestamp) VALUES (?, NOW())';
    connection.query(createConversationQuery, [userId], (error, result) => {
        if (error) {
            console.error('Error creating conversation:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        const conversationId = result.insertId;

        // Then, store the message and response
        const storeMessageQuery = 'INSERT INTO messages (conversation_id, message, response) VALUES (?, ?, ?)';
        connection.query(storeMessageQuery, [conversationId, message, response], (error) => {
            if (error) {
                console.error('Error storing message:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.json({ success: true });
        });
    });
});

app.get('/chat-history', verifyToken, (req, res) => {
    const query = `
        SELECT c.id, c.timestamp, m.message, m.response
        FROM conversations c
        JOIN messages m ON c.id = m.conversation_id
        WHERE c.user_id = ?
        ORDER BY c.timestamp DESC, m.id ASC
    `;
    connection.query(query, [req.userId], (error, results) => {
        if (error) {
            console.error('Error fetching chat history:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        const groupedResults = results.reduce((acc, curr) => {
            const date = new Date(curr.timestamp).toLocaleDateString();
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(curr);
            return acc;
        }, {});
        res.json(groupedResults);
    });
});

/////
app.delete('/delete-conversations-by-date/:date', verifyToken, (req, res) => {
    const date = req.params.date;
    const query = 'DELETE c, m FROM conversations c JOIN messages m ON c.id = m.conversation_id WHERE DATE(c.timestamp) = ? AND c.user_id = ?';
    connection.query(query, [date, req.userId], (error, results) => {
        if (error) {
            console.error('Error deleting conversations:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'No conversations found for this date' });
        }
        res.json({ success: true, message: 'Conversations deleted successfully' });
    });
});


function storeConversationHistory(userId, message, response) {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if a conversation exists for this user and date
    const checkConversationQuery = 'SELECT id FROM conversations WHERE user_id = ? AND DATE(timestamp) = ? ORDER BY timestamp DESC LIMIT 1';
    connection.query(checkConversationQuery, [userId, today], (error, results) => {
        if (error) {
            console.error('Error checking conversation:', error);
            return;
        }

        let conversationId;
        if (results.length > 0) {
            // Conversation exists for today, use its ID
            conversationId = results[0].id;
        } else {
            // No conversation exists for today, create a new one
            const createConversationQuery = 'INSERT INTO conversations (user_id, timestamp) VALUES (?, NOW())';
            connection.query(createConversationQuery, [userId], (error, result) => {
                if (error) {
                    console.error('Error creating conversation:', error);
                    return;
                }
                conversationId = result.insertId;
            });
        }

        // Store the message and response
        const storeMessageQuery = 'INSERT INTO messages (conversation_id, message, response, timestamp) VALUES (?, ?, ?, NOW())';
        connection.query(storeMessageQuery, [conversationId, message, response], (error) => {
            if (error) {
                console.error('Error storing message:', error);
            }
        });
    });
}
// Route to add a new question

app.post('/add-question', upload.single('image'), (req, res) => {
    console.log('Received request to add question');
    console.log('Request body:', req.body);
    console.log('File:', req.file);

    const { question, answer, keywords, department } = req.body;
    let imageData = null;

    if (req.file) {
        imageData = req.file.buffer;
    }

    const query = 'INSERT INTO faq (question, answer, keywords, department, image_data) VALUES (?, ?, ?, ?, ?)';
    connection.query(query, [question, answer, keywords, department, imageData], (error, results) => {
        if (error) {
            console.error('Error adding question:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        res.json({ success: true, message: 'Question added successfully' });
    });
});

app.get('/image/:id', (req, res) => {
    const query = 'SELECT image_data FROM faq WHERE id = ?';
    connection.query(query, [req.params.id], (error, results) => {
        if (error || results.length === 0) {
            return res.status(404).send('Image not found');
        }
        const imageData = results[0].image_data;
        const base64Image = Buffer.from(imageData).toString('base64');
        res.send(`data:image/jpeg;base64,${base64Image}`);
    });
});

// Route to delete a question
app.delete('/delete-question', (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Invalid or missing ids' });
    }

    const query = 'DELETE FROM faq WHERE id IN (?)';
    connection.query(query, [ids], (error, results) => {
        if (error) {
            console.error('Error deleting questions:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json({ success: true, message: `Deleted ${results.affectedRows} question(s)` });
    });
});

// Route to update a question
app.put('/update-question', (req, res) => {
    const { id, question, answer, keywords } = req.body;
    const query = 'UPDATE faq SET question = ?, answer = ?, keywords = ? WHERE id = ?';
    connection.query(query, [question, answer, keywords, id], (error, results) => {
        if (error) {
            console.error('Error updating question:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json({ success: true });
    });
});
//route of user to admin panel :-)
app.get('/users', (req, res) => {
    const query = 'SELECT id, name, email, gender, user_type FROM users';
    connection.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        res.json({ success: true, users: results });
    });
});

app.delete('/users', (req, res) => {
    const userIds = req.body.ids;
    if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid user IDs' });
    }

    const query = 'DELETE FROM users WHERE id IN (?)';
    connection.query(query, [userIds], (error, results) => {
        if (error) {
            console.error('Error deleting users:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        res.json({ success: true, message: 'Users deleted successfully' });
    });
});




app.post('/post-event', upload.single('eventImage'), (req, res) => {
    const { eventTitle, eventDescription, eventDate } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    // Remove the hardcoded userId
    const sql = `INSERT INTO events (title, description, event_date, image_url, created_at) 
                 VALUES (?, ?, ?, ?, NOW())`;

    connection.query(sql, [eventTitle, eventDescription, eventDate, imageUrl], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Error posting event' });
        } else {
            res.status(200).json({ success: true, message: 'Event posted successfully' });
        }
    });
});

app.get('/events', (req, res) => {
    const sql = 'SELECT * FROM events ORDER BY event_date DESC';
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Database error occurred' });
        } else {
            res.json(results);
        }
    });
});


app.delete('/remove-event/:id', (req, res) => {
    const eventId = req.params.id;

    const sql = 'DELETE FROM events WHERE id = ?';

    connection.query(sql, [eventId], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Error removing event' });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ success: false, message: 'Event not found' });
        } else {
            res.status(200).json({ success: true, message: 'Event removed successfully' });
        }
    });
});



// Catch-all route for undefined paths
app.use((req, res) => {
    res.status(404).send('Not Found');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});


