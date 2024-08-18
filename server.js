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
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
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

const upload = multer({ storage: storage });;

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


// Serve uploaded files


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

        const query = 'INSERT INTO users (name, email, password, gender, user_type) VALUES (?, ?, ?, ?, ?)';
        connection.query(query, [name, email, hashedPassword, gender, userType], (error, results) => {
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
        res.json(results);
    });
});

// Route to handle chatbot messages
app.post('/chatbot', (req, res) => {
    const { message, sessionId } = req.body;
    const similarityThreshold = 0.6;

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

            if (answers.length > 0) {
                answers.forEach(match => {
                    if (match.confidence > 0.8) {
                        response += match.response + ' ';
                    } else if (match.confidence > 0.6) {
                        response += `I think this might help: ${match.response} `;
                    } else {
                        response += "I'm not entirely sure, but here's what I found: " + match.response + ' ';
                    }
                });
            } else if (!containsGreeting) {
                // Handle no answers based on sentiment
                if (sentimentScore < -2) {
                    response = "I'm sorry you're feeling frustrated. Let's try to find the information you need. Could you rephrase your question or specify which department you're asking about?";
                } else if (sentimentScore > 2) {
                    response = "I appreciate your positive attitude! I couldn't find a specific answer to your question. Could you provide more details about what you're looking for?";
                } else {
                    response = "I'm afraid I don't have specific information about that. Could you rephrase your question or provide more details?";
                }
            }
        }

        // Add sentiment-based closing
        if (sentimentScore < -1) {
            response += " I hope this information helps improve your day.";
        } else if (sentimentScore > 1) {
            response += " I'm glad I could assist you!";
        }

        // Store conversation history (simplified version)
        storeConversationHistory(sessionId, message, response.trim());

        res.json({ answer: response.trim() });
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
        // Check keywords
        const keywordTokens = tokenizer.tokenize(record.keywords.toLowerCase());
        const keywordStems = keywordTokens.map(token => stemmer.stem(token));
        const keywordSimilarity = natural.JaroWinklerDistance(userQuestionStems.join(' '), keywordStems.join(' '));

        // Check question
        const questionTokens = tokenizer.tokenize(record.question.toLowerCase());
        const questionStems = questionTokens.map(token => stemmer.stem(token));
        const questionSimilarity = natural.JaroWinklerDistance(userQuestionStems.join(' '), questionStems.join(' '));

        // Use the higher of the two similarities
        const overallSimilarity = Math.max(keywordSimilarity, questionSimilarity);

        if (overallSimilarity > bestMatch.score) {
            bestMatch.score = overallSimilarity;
            bestMatch.response = record.answer;
            bestMatch.confidence = overallSimilarity;
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
        SELECT c.id, c.user_id, c.timestamp, m.message, m.response
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
            if (!acc[curr.id]) {
                acc[curr.id] = {
                    id: curr.id,
                    timestamp: curr.timestamp,
                    messages: []
                };
            }
            acc[curr.id].messages.push({
                message: curr.message,
                response: curr.response
            });
            return acc;
        }, {});
        res.json(Object.values(groupedResults));
    });
});

app.delete('/delete-conversation/:id', verifyToken, (req, res) => {
    const conversationId = req.params.id;
    const query = 'DELETE FROM conversations WHERE id = ? AND user_id = ?';
    connection.query(query, [conversationId, req.userId], (error, results) => {
        if (error) {
            console.error('Error deleting conversation:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Conversation not found or unauthorized' });
        }
        res.json({ success: true, message: 'Conversation deleted successfully' });
    });
});

function storeConversationHistory(sessionId, message, response) {
    // First, check if a conversation exists for this session
    const checkConversationQuery = 'SELECT id FROM conversations WHERE session_id = ? ORDER BY timestamp DESC LIMIT 1';
    connection.query(checkConversationQuery, [sessionId], (error, results) => {
        if (error) {
            console.error('Error checking conversation:', error);
            return;
        }

        let conversationId;
        if (results.length > 0) {
            // Conversation exists, use its ID
            conversationId = results[0].id;
        } else {
            // No conversation exists, create a new one
            const createConversationQuery = 'INSERT INTO conversations (session_id, timestamp) VALUES (?, NOW())';
            connection.query(createConversationQuery, [sessionId], (error, result) => {
                if (error) {
                    console.error('Error creating conversation:', error);
                    return;
                }
                conversationId = result.insertId;
            });
        }

        // Store the message and response
        const storeMessageQuery = 'INSERT INTO messages (conversation_id, message, response) VALUES (?, ?, ?)';
        connection.query(storeMessageQuery, [conversationId, message, response], (error) => {
            if (error) {
                console.error('Error storing message:', error);
            }
        });
    });
}
// Route to add a new question
app.post('/add-question', (req, res) => {
    const { question, answer, keywords, department } = req.body;
    const query = 'INSERT INTO faq (question, answer, keywords, department) VALUES (?, ?, ?, ?)';
    connection.query(query, [question, answer, keywords, department], (error, results) => {
        if (error) {
            console.error('Error adding question:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json({ success: true });
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


