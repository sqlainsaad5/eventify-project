# app/__init__.py - WITH TEMPORARY DATA STORAGE
from urllib import response
from flask import Flask, app, jsonify, request
from .config import Config
from .extensions import db, migrate, jwt , mail
from flask_cors import CORS
from dotenv import load_dotenv
import os
load_dotenv()

# ✅ TEMPORARY DATA STORAGE
# ✅ TEMPORARY DATA STORAGE
# temporary_services = []
# next_service_id = 1

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Ensure upload directory exists
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    from flask import send_from_directory
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)

    # ✅ Smart CORS configuration
    def dynamic_origin(origin):
        # Allow localhost, 127.x, 192.168.x.x, and vercel app automatically
        allowed_patterns = [
            "http://localhost",
            "http://127.",
            "http://192.168.",
            "https://",
        ]
        if origin and any(origin.startswith(p) for p in allowed_patterns):
            return origin
        return None  # block unknown origins in production
    
    @app.route("/api/<path:path>", methods=["OPTIONS"])
    def handle_preflight(path):
        response = jsonify({"status": "ok"})
        origin = request.headers.get("Origin")
        allowed = dynamic_origin(origin)
        if allowed:
            response.headers["Access-Control-Allow-Origin"] = allowed
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response, 200

    @app.after_request
    def apply_cors_headers(response):
        origin = request.headers.get("Origin")
        allowed = dynamic_origin(origin)
        if allowed:
            response.headers["Access-Control-Allow-Origin"] = allowed
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    # ✅ JWT error handlers (same as before)
    @jwt.unauthorized_loader
    def unauthorized_response(callback):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": "Invalid token", "details": str(error)}), 422

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired"}), 401

    @jwt.needs_fresh_token_loader
    def needs_fresh_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Fresh token required"}), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has been revoked"}), 401

    # ✅ TEMPORARY SERVICES ROUTES WITH DATA STORAGE
    # @app.route('/api/vendor/services', methods=['GET', 'POST', 'OPTIONS'])
    # def handle_services():
    #     global next_service_id, temporary_services
        
    #     if request.method == 'OPTIONS':
    #         return '', 200
    #     elif request.method == 'GET':
    #         vendor_id = request.args.get('vendor_id', 1)
    #         vendor_services = [s for s in temporary_services if s.get('vendor_id') == int(vendor_id)]
    #         return jsonify(vendor_services)
    #     elif request.method == 'POST':
    #         try:
    #             data = request.json
    #             print("📦 Received service data:", data)
                
    #             # Create service object
    #             service = {
    #                 "id": next_service_id,
    #                 "name": data.get('name', ''),
    #                 "category": data.get('category', ''),
    #                 "eventType": data.get('eventType', ''),
    #                 "basePrice": data.get('basePrice', 0),
    #                 "description": data.get('description', ''),
    #                 "location": data.get('location', ''),
    #                 "packages": data.get('packages', []),
    #                 "availability": data.get('availability', []),
    #                 "portfolioImages": data.get('portfolioImages', []),
    #                 "isActive": data.get('isActive', True),
    #                 "vendor_id": data.get('vendor_id', 1)
    #             }
                
    #             temporary_services.append(service)
    #             next_service_id += 1
                
    #             print(f"✅ Service added: {service['name']} (ID: {service['id']})")
    #             return jsonify({
    #                 "message": "Service created successfully", 
    #                 "service": service
    #             }), 201
                
    #         except Exception as e:
    #             print("❌ Error:", str(e))
    #             return jsonify({"error": str(e)}), 500

    # @app.route('/api/vendor/services/<int:service_id>', methods=['PUT', 'DELETE', 'PATCH', 'OPTIONS'])
    # def handle_service_operations(service_id):
    #     global temporary_services
        
    #     if request.method == 'OPTIONS':
    #         return '', 200
    #     elif request.method == 'PUT':
    #         # Update service
    #         return jsonify({"message": "Service updated successfully"})
    #     elif request.method == 'DELETE':
    #         # Remove service
    #         temporary_services = [s for s in temporary_services if s['id'] != service_id]
    #         return jsonify({"message": "Service deleted successfully"})
    #     elif request.method == 'PATCH':
    #         # Toggle status
    #         for service in temporary_services:
    #             if service['id'] == service_id:
    #                 service['isActive'] = not service.get('isActive', True)
    #                 return jsonify({
    #                     "message": "Service status updated", 
    #                     "isActive": service['isActive']
    #                 })

    # ✅ Register blueprints
    from .api.auth import auth_bp
    from .api.events import events_bp
    from .api.vendors import vendors_bp
    from .api.chat import chat_bp
    from .api.payments import payments_bp
    from .api.services import services_bp  

    app.register_blueprint(auth_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(vendors_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(services_bp)

    @app.route("/")
    def index():
        return {"status": "ok", "message": "Eventify backend running"}

    return app