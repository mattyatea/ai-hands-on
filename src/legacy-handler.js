function processUserRequest(req, res, db, cache, logger, config, emailService, queueService, analyticsService) {
    let user = null;
    let session = null;
    let token = null;
    let result = {};
    let errors = [];
    let warnings = [];
    let startTime = Date.now();
    let isAuthenticated = false;
    let permissions = [];
    let userProfile = null;
    let preferences = {};
    let notifications = [];
    let activities = [];
    let transactions = [];
    let subscriptions = [];
    
    if (!req || !res) {
        return res.status(400).json({ error: 'Invalid request' });
    }
    
    const requestId = Math.random().toString(36).substring(7);
    logger.info(`Processing request ${requestId}`);
    
    try {
        const headers = req.headers;
        const body = req.body;
        const query = req.query;
        const params = req.params;
        const method = req.method;
        const path = req.path;
        const ip = req.ip;
        const userAgent = headers['user-agent'];
        
        if (headers.authorization) {
            const authHeader = headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
                
                const decoded = jwt.verify(token, config.jwtSecret);
                if (decoded) {
                    const userId = decoded.userId;
                    const sessionId = decoded.sessionId;
                    
                    const cachedUser = cache.get(`user:${userId}`);
                    if (cachedUser) {
                        user = JSON.parse(cachedUser);
                    } else {
                        const userQuery = `SELECT * FROM users WHERE id = $1`;
                        const userResult = db.query(userQuery, [userId]);
                        if (userResult.rows.length > 0) {
                            user = userResult.rows[0];
                            cache.set(`user:${userId}`, JSON.stringify(user), 3600);
                        }
                    }
                    
                    if (user) {
                        isAuthenticated = true;
                        
                        const sessionQuery = `SELECT * FROM sessions WHERE id = $1 AND user_id = $2`;
                        const sessionResult = db.query(sessionQuery, [sessionId, userId]);
                        if (sessionResult.rows.length > 0) {
                            session = sessionResult.rows[0];
                            
                            if (session.expires_at < new Date()) {
                                isAuthenticated = false;
                                errors.push('Session expired');
                            } else {
                                const updateSessionQuery = `UPDATE sessions SET last_activity = NOW() WHERE id = $1`;
                                db.query(updateSessionQuery, [sessionId]);
                            }
                        }
                        
                        if (isAuthenticated) {
                            const permissionQuery = `SELECT p.* FROM permissions p JOIN user_permissions up ON p.id = up.permission_id WHERE up.user_id = $1`;
                            const permissionResult = db.query(permissionQuery, [userId]);
                            permissions = permissionResult.rows;
                            
                            const profileQuery = `SELECT * FROM user_profiles WHERE user_id = $1`;
                            const profileResult = db.query(profileQuery, [userId]);
                            if (profileResult.rows.length > 0) {
                                userProfile = profileResult.rows[0];
                            }
                            
                            const preferencesQuery = `SELECT * FROM user_preferences WHERE user_id = $1`;
                            const preferencesResult = db.query(preferencesQuery, [userId]);
                            if (preferencesResult.rows.length > 0) {
                                preferences = preferencesResult.rows[0];
                            }
                        }
                    }
                }
            }
        }
        
        if (method === 'GET') {
            if (path === '/api/user/profile') {
                if (!isAuthenticated) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                
                result.user = user;
                result.profile = userProfile;
                result.preferences = preferences;
                
                const notificationQuery = `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`;
                const notificationResult = db.query(notificationQuery, [user.id]);
                notifications = notificationResult.rows;
                result.notifications = notifications;
                
                const activityQuery = `SELECT * FROM user_activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`;
                const activityResult = db.query(activityQuery, [user.id]);
                activities = activityResult.rows;
                result.activities = activities;
                
                analyticsService.track('profile_view', {
                    userId: user.id,
                    timestamp: new Date(),
                    ip: ip,
                    userAgent: userAgent
                });
                
            } else if (path === '/api/user/transactions') {
                if (!isAuthenticated) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                
                const page = parseInt(query.page) || 1;
                const limit = parseInt(query.limit) || 20;
                const offset = (page - 1) * limit;
                
                const transactionQuery = `SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
                const transactionResult = db.query(transactionQuery, [user.id, limit, offset]);
                transactions = transactionResult.rows;
                
                const countQuery = `SELECT COUNT(*) FROM transactions WHERE user_id = $1`;
                const countResult = db.query(countQuery, [user.id]);
                const totalCount = parseInt(countResult.rows[0].count);
                
                result.transactions = transactions;
                result.pagination = {
                    page: page,
                    limit: limit,
                    total: totalCount,
                    pages: Math.ceil(totalCount / limit)
                };
                
            } else if (path === '/api/user/subscriptions') {
                if (!isAuthenticated) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                
                const subscriptionQuery = `SELECT * FROM subscriptions WHERE user_id = $1`;
                const subscriptionResult = db.query(subscriptionQuery, [user.id]);
                subscriptions = subscriptionResult.rows;
                
                for (let subscription of subscriptions) {
                    const planQuery = `SELECT * FROM subscription_plans WHERE id = $1`;
                    const planResult = db.query(planQuery, [subscription.plan_id]);
                    if (planResult.rows.length > 0) {
                        subscription.plan = planResult.rows[0];
                    }
                }
                
                result.subscriptions = subscriptions;
                
            } else if (path.startsWith('/api/users/')) {
                const targetUserId = params.id;
                
                if (!isAuthenticated) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                
                const hasPermission = permissions.some(p => p.name === 'view_users');
                if (!hasPermission) {
                    return res.status(403).json({ error: 'Forbidden' });
                }
                
                const targetUserQuery = `SELECT * FROM users WHERE id = $1`;
                const targetUserResult = db.query(targetUserQuery, [targetUserId]);
                if (targetUserResult.rows.length === 0) {
                    return res.status(404).json({ error: 'User not found' });
                }
                
                result.user = targetUserResult.rows[0];
                delete result.user.password;
                
            } else {
                return res.status(404).json({ error: 'Endpoint not found' });
            }
            
        } else if (method === 'POST') {
            if (path === '/api/user/register') {
                const { username, email, password, firstName, lastName } = body;
                
                if (!username || !email || !password) {
                    errors.push('Missing required fields');
                    return res.status(400).json({ errors: errors });
                }
                
                if (username.length < 3 || username.length > 30) {
                    errors.push('Username must be between 3 and 30 characters');
                }
                
                if (!email.includes('@')) {
                    errors.push('Invalid email format');
                }
                
                if (password.length < 8) {
                    errors.push('Password must be at least 8 characters');
                }
                
                if (errors.length > 0) {
                    return res.status(400).json({ errors: errors });
                }
                
                const existingUserQuery = `SELECT * FROM users WHERE username = $1 OR email = $2`;
                const existingUserResult = db.query(existingUserQuery, [username, email]);
                if (existingUserResult.rows.length > 0) {
                    return res.status(409).json({ error: 'User already exists' });
                }
                
                const hashedPassword = bcrypt.hashSync(password, 10);
                const insertUserQuery = `INSERT INTO users (username, email, password, first_name, last_name, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`;
                const insertUserResult = db.query(insertUserQuery, [username, email, hashedPassword, firstName, lastName]);
                const newUser = insertUserResult.rows[0];
                
                const verificationToken = Math.random().toString(36).substring(2, 15);
                const insertTokenQuery = `INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')`;
                db.query(insertTokenQuery, [newUser.id, verificationToken]);
                
                emailService.send({
                    to: email,
                    subject: 'Welcome to Our Platform',
                    template: 'registration',
                    data: {
                        username: username,
                        verificationLink: `${config.baseUrl}/verify/${verificationToken}`
                    }
                });
                
                queueService.publish('user_registered', {
                    userId: newUser.id,
                    username: username,
                    email: email,
                    timestamp: new Date()
                });
                
                result.message = 'Registration successful';
                result.userId = newUser.id;
                
            } else if (path === '/api/user/login') {
                const { username, password } = body;
                
                if (!username || !password) {
                    return res.status(400).json({ error: 'Missing credentials' });
                }
                
                const loginQuery = `SELECT * FROM users WHERE username = $1 OR email = $1`;
                const loginResult = db.query(loginQuery, [username]);
                if (loginResult.rows.length === 0) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
                
                const loginUser = loginResult.rows[0];
                const passwordMatch = bcrypt.compareSync(password, loginUser.password);
                if (!passwordMatch) {
                    const failedAttemptQuery = `INSERT INTO failed_login_attempts (user_id, ip_address, attempted_at) VALUES ($1, $2, NOW())`;
                    db.query(failedAttemptQuery, [loginUser.id, ip]);
                    
                    const recentAttemptsQuery = `SELECT COUNT(*) FROM failed_login_attempts WHERE user_id = $1 AND attempted_at > NOW() - INTERVAL '15 minutes'`;
                    const recentAttemptsResult = db.query(recentAttemptsQuery, [loginUser.id]);
                    const recentAttempts = parseInt(recentAttemptsResult.rows[0].count);
                    
                    if (recentAttempts >= 5) {
                        const lockAccountQuery = `UPDATE users SET locked_until = NOW() + INTERVAL '30 minutes' WHERE id = $1`;
                        db.query(lockAccountQuery, [loginUser.id]);
                        
                        emailService.send({
                            to: loginUser.email,
                            subject: 'Account Locked',
                            template: 'account_locked',
                            data: {
                                username: loginUser.username,
                                unlockTime: new Date(Date.now() + 30 * 60 * 1000)
                            }
                        });
                    }
                    
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
                
                if (loginUser.locked_until && loginUser.locked_until > new Date()) {
                    return res.status(423).json({ error: 'Account is locked' });
                }
                
                const sessionId = Math.random().toString(36).substring(2, 15);
                const insertSessionQuery = `INSERT INTO sessions (id, user_id, ip_address, user_agent, created_at, expires_at) VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '7 days') RETURNING *`;
                const insertSessionResult = db.query(insertSessionQuery, [sessionId, loginUser.id, ip, userAgent]);
                session = insertSessionResult.rows[0];
                
                const accessToken = jwt.sign({
                    userId: loginUser.id,
                    sessionId: sessionId
                }, config.jwtSecret, { expiresIn: '1h' });
                
                const refreshToken = jwt.sign({
                    userId: loginUser.id,
                    sessionId: sessionId
                }, config.jwtSecret, { expiresIn: '7d' });
                
                const updateLastLoginQuery = `UPDATE users SET last_login = NOW() WHERE id = $1`;
                db.query(updateLastLoginQuery, [loginUser.id]);
                
                analyticsService.track('user_login', {
                    userId: loginUser.id,
                    timestamp: new Date(),
                    ip: ip,
                    userAgent: userAgent
                });
                
                result.accessToken = accessToken;
                result.refreshToken = refreshToken;
                result.user = {
                    id: loginUser.id,
                    username: loginUser.username,
                    email: loginUser.email
                };
                
            } else if (path === '/api/user/update') {
                if (!isAuthenticated) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                
                const updates = body;
                const allowedFields = ['first_name', 'last_name', 'bio', 'avatar_url', 'phone', 'date_of_birth'];
                const updateFields = [];
                const updateValues = [];
                let paramIndex = 1;
                
                for (const field of allowedFields) {
                    if (updates[field] !== undefined) {
                        updateFields.push(`${field} = $${paramIndex}`);
                        updateValues.push(updates[field]);
                        paramIndex++;
                    }
                }
                
                if (updateFields.length > 0) {
                    updateValues.push(user.id);
                    const updateQuery = `UPDATE user_profiles SET ${updateFields.join(', ')}, updated_at = NOW() WHERE user_id = $${paramIndex}`;
                    db.query(updateQuery, updateValues);
                    
                    cache.delete(`user:${user.id}`);
                    
                    const auditQuery = `INSERT INTO audit_logs (user_id, action, details, created_at) VALUES ($1, $2, $3, NOW())`;
                    db.query(auditQuery, [user.id, 'profile_update', JSON.stringify(updates)]);
                    
                    result.message = 'Profile updated successfully';
                } else {
                    warnings.push('No fields to update');
                }
                
            } else if (path === '/api/user/delete') {
                if (!isAuthenticated) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                
                const { password, confirmation } = body;
                
                if (!password || confirmation !== 'DELETE') {
                    return res.status(400).json({ error: 'Invalid confirmation' });
                }
                
                const userQuery = `SELECT * FROM users WHERE id = $1`;
                const userResult = db.query(userQuery, [user.id]);
                const currentUser = userResult.rows[0];
                
                const passwordMatch = bcrypt.compareSync(password, currentUser.password);
                if (!passwordMatch) {
                    return res.status(401).json({ error: 'Invalid password' });
                }
                
                db.query('BEGIN');
                try {
                    db.query(`DELETE FROM user_permissions WHERE user_id = $1`, [user.id]);
                    db.query(`DELETE FROM user_preferences WHERE user_id = $1`, [user.id]);
                    db.query(`DELETE FROM user_profiles WHERE user_id = $1`, [user.id]);
                    db.query(`DELETE FROM notifications WHERE user_id = $1`, [user.id]);
                    db.query(`DELETE FROM user_activities WHERE user_id = $1`, [user.id]);
                    db.query(`DELETE FROM sessions WHERE user_id = $1`, [user.id]);
                    db.query(`UPDATE users SET deleted_at = NOW(), email = CONCAT(email, '_deleted_', NOW()), username = CONCAT(username, '_deleted_', NOW()) WHERE id = $1`, [user.id]);
                    db.query('COMMIT');
                    
                    cache.delete(`user:${user.id}`);
                    
                    emailService.send({
                        to: currentUser.email,
                        subject: 'Account Deleted',
                        template: 'account_deleted',
                        data: {
                            username: currentUser.username
                        }
                    });
                    
                    result.message = 'Account deleted successfully';
                } catch (deleteError) {
                    db.query('ROLLBACK');
                    throw deleteError;
                }
            }
            
        } else if (method === 'PUT') {
            if (path === '/api/user/password') {
                if (!isAuthenticated) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                
                const { currentPassword, newPassword, confirmPassword } = body;
                
                if (!currentPassword || !newPassword || !confirmPassword) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }
                
                if (newPassword !== confirmPassword) {
                    return res.status(400).json({ error: 'Passwords do not match' });
                }
                
                if (newPassword.length < 8) {
                    return res.status(400).json({ error: 'Password must be at least 8 characters' });
                }
                
                const userQuery = `SELECT * FROM users WHERE id = $1`;
                const userResult = db.query(userQuery, [user.id]);
                const currentUser = userResult.rows[0];
                
                const passwordMatch = bcrypt.compareSync(currentPassword, currentUser.password);
                if (!passwordMatch) {
                    return res.status(401).json({ error: 'Invalid current password' });
                }
                
                const hashedPassword = bcrypt.hashSync(newPassword, 10);
                const updatePasswordQuery = `UPDATE users SET password = $1, password_changed_at = NOW() WHERE id = $2`;
                db.query(updatePasswordQuery, [hashedPassword, user.id]);
                
                const invalidateSessionsQuery = `DELETE FROM sessions WHERE user_id = $1 AND id != $2`;
                db.query(invalidateSessionsQuery, [user.id, session.id]);
                
                emailService.send({
                    to: currentUser.email,
                    subject: 'Password Changed',
                    template: 'password_changed',
                    data: {
                        username: currentUser.username,
                        changedAt: new Date()
                    }
                });
                
                result.message = 'Password changed successfully';
            }
            
        } else if (method === 'DELETE') {
            if (path.startsWith('/api/user/session/')) {
                if (!isAuthenticated) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                
                const sessionIdToDelete = params.sessionId;
                const deleteSessionQuery = `DELETE FROM sessions WHERE id = $1 AND user_id = $2`;
                const deleteResult = db.query(deleteSessionQuery, [sessionIdToDelete, user.id]);
                
                if (deleteResult.rowCount > 0) {
                    result.message = 'Session terminated successfully';
                } else {
                    return res.status(404).json({ error: 'Session not found' });
                }
            }
        }
        
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        logger.info(`Request ${requestId} completed in ${processingTime}ms`);
        
        if (warnings.length > 0) {
            result.warnings = warnings;
        }
        
        result.metadata = {
            requestId: requestId,
            processingTime: processingTime,
            timestamp: new Date()
        };
        
        return res.status(200).json(result);
        
    } catch (error) {
        logger.error(`Error processing request ${requestId}: ${error.message}`);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Duplicate entry' });
        }
        
        if (error.code === '23503') {
            return res.status(400).json({ error: 'Foreign key constraint violation' });
        }
        
        return res.status(500).json({ error: 'Internal server error', requestId: requestId });
    }
}

module.exports = { processUserRequest };