-- PostgreSQL procedure for user authentication
CREATE OR REPLACE PROCEDURE authenticate_user(
    p_username VARCHAR(255),
    p_password VARCHAR(255),
    p_login_time TIMESTAMP
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id INTEGER;
    v_hashed_password VARCHAR(255);
    v_is_active BOOLEAN;
    v_failed_attempts INTEGER;
    v_max_failed_attempts INTEGER := 5;
    v_lockout_duration INTERVAL := INTERVAL '30 minutes';
BEGIN
    -- Get user information
    SELECT 
        u.id,
        u.password_hash,
        u.is_active,
        COALESCE(u.failed_login_attempts, 0)
    INTO 
        v_user_id,
        v_hashed_password,
        v_is_active,
        v_failed_attempts
    FROM users u
    WHERE u.username = p_username;

    -- Check if user exists
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid credentials';
    END IF;

    -- Check if user is active
    IF NOT v_is_active THEN
        RAISE EXCEPTION 'User account is inactive';
    END IF;

    -- Check if account is locked due to too many failed attempts
    IF v_failed_attempts >= v_max_failed_attempts THEN
        -- Check if lockout period has passed
        SELECT 
            CASE 
                WHEN last_failed_attempt < (NOW() - v_lockout_duration) THEN false
                ELSE true
            END
        INTO v_is_active
        FROM users
        WHERE id = v_user_id;

        IF v_is_active THEN
            RAISE EXCEPTION 'Account is temporarily locked due to too many failed login attempts';
        ELSE
            -- Reset failed attempts if lockout period has passed
            UPDATE users 
            SET failed_login_attempts = 0, last_failed_attempt = NULL
            WHERE id = v_user_id;
            v_failed_attempts := 0;
        END IF;
    END IF;

    -- Verify password
    IF NOT (v_hashed_password = crypt(p_password, v_hashed_password)) THEN
        -- Increment failed login attempts
        UPDATE users 
        SET 
            failed_login_attempts = v_failed_attempts + 1,
            last_failed_attempt = NOW()
        WHERE id = v_user_id;

        -- Log failed login attempt
        INSERT INTO login_logs (user_id, login_time, ip_address, user_agent, success)
        VALUES (v_user_id, p_login_time, '127.0.0.1', 'API', false);

        RAISE EXCEPTION 'Invalid credentials';
    END IF;

    -- Reset failed login attempts on successful login
    UPDATE users 
    SET 
        failed_login_attempts = 0,
        last_failed_attempt = NULL,
        last_login_at = p_login_time
    WHERE id = v_user_id;

    -- Log successful login
    INSERT INTO login_logs (user_id, login_time, ip_address, user_agent, success)
    VALUES (v_user_id, p_login_time, '127.0.0.1', 'API', true);

    -- Return user ID
    PERFORM set_config('app.current_user_id', v_user_id::text, false);
    
    -- Return result
    RETURN QUERY SELECT v_user_id as user_id;
END;
$$; 