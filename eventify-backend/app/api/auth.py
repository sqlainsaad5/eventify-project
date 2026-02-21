from flask import Blueprint, request, jsonify, redirect
from app.models import User
from app.extensions import db, jwt , mail
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
import requests
import os
from urllib.parse import urlencode
from flask_mail import Message


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = "http://localhost:5000/api/auth/google/callback"

# -------------------------------
# Google OAuth Routes
# -------------------------------
@auth_bp.route("/google", methods=["GET"])
def google_login():
    """Redirect to Google OAuth consent screen"""
    google_auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
        "access_type": "offline",
        "prompt": "consent"
    }
    auth_url = f"{google_auth_url}?{urlencode(params)}"
    return redirect(auth_url)

@auth_bp.route("/google/callback", methods=["GET"])
def google_callback():
    """Handle Google OAuth callback"""
    try:
        # Get authorization code from Google
        code = request.args.get("code")
        if not code:
            return jsonify({"error": "Authorization code missing"}), 400

        # Exchange code for access token
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": GOOGLE_REDIRECT_URI
        }
        
        token_response = requests.post(token_url, data=token_data)
        token_json = token_response.json()
        
        if "access_token" not in token_json:
            return jsonify({"error": "Failed to get access token"}), 400

        access_token = token_json["access_token"]

        # Get user info from Google
        userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        userinfo_response = requests.get(userinfo_url, headers=headers)
        userinfo = userinfo_response.json()

        if "email" not in userinfo:
            return jsonify({"error": "Failed to get user info from Google"}), 400

        # Extract user information
        google_id = userinfo["id"]
        email = userinfo["email"].lower()
        name = userinfo.get("name", "User")
        picture = userinfo.get("picture", "")

        # Find or create user
        user = User.query.filter_by(email=email).first()
        
        if user:
            # Check if role is allowed for Google Login
            if user.role != "user":
                params = {"error": "Google login is only available for User roles. Organizers and Vendors must use email/password."}
                return redirect(f"http://localhost:3000/login?{urlencode(params)}")
        else:
            # Create new user with Google OAuth
            user = User(
                name=name,
                email=email,
                role="user"  # Default role for Google login
            )
            # For OAuth users, we don't set a password
            user.password_hash = None
            db.session.add(user)
            db.session.commit()

        # Create JWT token
        token = create_access_token(identity=str(user.id), expires_delta=timedelta(days=1))
        
        # Redirect with encoded parameters
        params = {
            "token": token,
            "user": user.id,
            "role": user.role,
            "name": user.name,
            "email": user.email
        }
        query_string = urlencode(params)
        frontend_url = f"http://localhost:3000/google-callback?{query_string}"
        return redirect(frontend_url)

    except Exception as e:
        print(f"❌ Google OAuth error: {e}")
        return jsonify({"error": "Google authentication failed"}), 500

# -------------------------------
# Existing routes remain the same...
# -------------------------------

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "organizer")

    if not all([name, email, password]):
        return jsonify({"error": "All fields are required"}), 400

    email = email.strip().lower()
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(name=name.strip(), email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    # ✅ Generate verification token
    token = user.generate_verification_token()
    verify_url = f"http://localhost:3000/verify?token={token}"

    # ✅ Send email
    msg = Message("Verify your Eventify account", recipients=[email])
    msg.body = f"Hi {name},\n\nPlease verify your email by clicking the link below:\n{verify_url}\n\nThis link expires in 1 hour."
    mail.send(msg)

    return jsonify({
        "message": "Signup successful! Please check your email for verification.",
    }), 201

@auth_bp.route("/verify-email/<token>", methods=["GET"])
def verify_email(token):
    email = User.verify_token(token)
    if not email:
        return jsonify({"error": "Invalid or expired token"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.is_verified:
        return jsonify({"message": "Email already verified."}), 200

    user.is_verified = True
    db.session.commit()
    return jsonify({"message": "Email verified successfully!"}), 200


# Add this to auth.py or create profile_routes.py

# Add this to your auth.py file after the login route

@auth_bp.route("/profile", methods=["GET"])
@jwt_required()  # ✅ This will now work
def get_profile():
    """Get current user profile data"""
    try:
        current_user_id = get_jwt_identity()  # ✅ This gets the user ID from JWT token
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        return jsonify({
            "user": user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Add this to your auth.py file after the profile route

@auth_bp.route("/profile/update", methods=["PUT", "PATCH"])
@jwt_required()
def update_profile():
    """Update user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        data = request.get_json()
        
        # Update allowed fields
        if 'name' in data:
            user.name = data['name'].strip()
        if 'phone' in data:
            user.phone = data['phone']
        if 'city' in data:
            user.city = data['city']
        if 'category' in data:
            user.category = data['category']
            
        db.session.commit()
        
        return jsonify({
            "message": "Profile updated successfully",
            "user": user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/profile/upload-image", methods=["POST"])
@jwt_required()
def upload_profile_image():
    """Upload profile image"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        data = request.get_json()
        
        if not data or 'image_data' not in data:
            return jsonify({"error": "No image data provided"}), 400
            
        # Validate base64 image data
        image_data = data['image_data']
        if not image_data.startswith('data:image/'):
            return jsonify({"error": "Invalid image format"}), 400
            
        # Check image size (max 2MB)
        if len(image_data) > 2 * 1024 * 1024:  # 2MB in bytes
            return jsonify({"error": "Image too large. Maximum size is 2MB"}), 400
            
        # Update user profile image
        user.profile_image = image_data
        db.session.commit()
        
        return jsonify({
            "message": "Profile image updated successfully",
            "user": user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ✅ Add this route to auth.py - AFTER all existing routes
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Get current logged-in user data"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        return jsonify(user.to_dict()), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

  


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not all([email, password]):
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email.strip().lower()).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_verified:
        return jsonify({"error": "Please verify your email before logging in."}), 403

    token = create_access_token(identity=str(user.id), expires_delta=timedelta(days=1))

    return jsonify({
        "message": "Login successful",
        "user": user.to_dict(),
        "token": token
    }), 200
@auth_bp.route("/organizers", methods=["GET"])
@jwt_required()
def get_organizers():
    """Get all users with the 'organizer' role"""
    try:
        organizers = User.query.filter_by(role='organizer').all()
        return jsonify([o.to_dict() for o in organizers]), 200
    except Exception as e:
        print(f"❌ Error fetching organizers: {e}")
        return jsonify({"error": str(e)}), 500
