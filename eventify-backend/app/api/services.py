# app/routes/services.py - FIXED IMPORTS
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Service, ServicePackage, User  # ✅ Correct import
import json

services_bp = Blueprint('services', __name__)

# ✅ Get all services for a vendor
@services_bp.route('/api/vendor/services', methods=['GET'])
def get_vendor_services():
    try:
        vendor_id = request.args.get('vendor_id')
        
        if not vendor_id:
            return jsonify({"error": "Vendor ID required"}), 400
        
        services = Service.query.filter_by(vendor_id=vendor_id).all()
        return jsonify([service.to_dict() for service in services])
    
    except Exception as e:
        print("❌ Error fetching services:", str(e))
        return jsonify({"error": "Internal server error"}), 500

# ✅ Create new service - FIXED VERSION
@services_bp.route('/api/vendor/services', methods=['POST'])
def create_service():
    try:
        data = request.get_json()
        print("📦 Received service data:", data)
        
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
        
        # Validate required fields
        required_fields = ['vendor_id', 'name', 'category', 'eventType', 'basePrice']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Convert data types safely
        try:
            vendor_id = int(data['vendor_id'])
            base_price = float(data['basePrice'])
        except (ValueError, TypeError) as e:
            return jsonify({"error": "Invalid data types for vendor_id or basePrice"}), 400
        
        # Create main service
        service = Service(
            vendor_id=vendor_id,
            name=data['name'],
            category=data['category'],
            event_type=data['eventType'],
            base_price=base_price,
            description=data.get('description', ''),
            location=data.get('location', ''),
            availability=str(data.get('availability', [])),
            portfolio_images=str(data.get('portfolioImages', [])),
            is_active=data.get('isActive', True)
        )
        
        db.session.add(service)
        db.session.flush()  # Get service ID without committing
        print(f"✅ Service created with ID: {service.id}")
        
        # Create packages if provided
        packages_data = data.get('packages', [])
        for pkg_data in packages_data:
            try:
                package = ServicePackage(
                    service_id=service.id,
                    package_name=pkg_data.get('packageName', 'Basic Package'),
                    price=float(pkg_data.get('price', 0)),
                    duration=pkg_data.get('duration', ''),
                    features=str(pkg_data.get('features', []))
                )
                db.session.add(package)
                print(f"📋 Package added: {package.package_name}")
            except Exception as pkg_error:
                print(f"❌ Error creating package: {pkg_error}")
                continue
        
        # Commit everything
        db.session.commit()
        print("✅ Service and packages saved to database")
        
        return jsonify({
            "message": "Service created successfully", 
            "service": service.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print("❌ Error creating service:", str(e))
        return jsonify({"error": f"Failed to create service: {str(e)}"}), 500

# ✅ Update service - FIXED VERSION
@services_bp.route('/api/vendor/services/<int:service_id>', methods=['PUT'])
def update_service(service_id):
    try:
        service = Service.query.get_or_404(service_id)
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        print(f"🔄 Updating service {service_id} with data:", data)
        
        # Update service fields
        service.name = data.get('name', service.name)
        service.category = data.get('category', service.category)
        service.event_type = data.get('eventType', service.event_type)
        service.base_price = float(data.get('basePrice', service.base_price))
        service.description = data.get('description', service.description)
        service.location = data.get('location', service.location)
        service.availability = str(data.get('availability', service.availability))
        service.portfolio_images = str(data.get('portfolioImages', service.portfolio_images))
        service.is_active = data.get('isActive', service.is_active)
        
        # Delete old packages
        ServicePackage.query.filter_by(service_id=service_id).delete()
        print(f"🗑️ Deleted old packages for service {service_id}")
        
        # Add new packages
        packages_data = data.get('packages', [])
        for pkg_data in packages_data:
            try:
                package = ServicePackage(
                    service_id=service_id,
                    package_name=pkg_data.get('packageName', ''),
                    price=float(pkg_data.get('price', 0)),
                    duration=pkg_data.get('duration', ''),
                    features=str(pkg_data.get('features', []))
                )
                db.session.add(package)
                print(f"📋 Added package: {package.package_name}")
            except Exception as pkg_error:
                print(f"❌ Error creating package: {pkg_error}")
                continue
        
        db.session.commit()
        return jsonify({
            "message": "Service updated successfully", 
            "service": service.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        print("❌ Error updating service:", str(e))
        return jsonify({"error": f"Failed to update service: {str(e)}"}), 500

# ✅ Delete service
@services_bp.route('/api/vendor/services/<int:service_id>', methods=['DELETE'])
def delete_service(service_id):
    try:
        service = Service.query.get_or_404(service_id)
        db.session.delete(service)
        db.session.commit()
        print(f"🗑️ Service {service_id} deleted successfully")
        return jsonify({"message": "Service deleted successfully"})
        
    except Exception as e:
        db.session.rollback()
        print("❌ Error deleting service:", str(e))
        return jsonify({"error": str(e)}), 500

# ✅ Toggle service status
@services_bp.route('/api/vendor/services/<int:service_id>/toggle', methods=['PATCH'])
def toggle_service_status(service_id):
    try:
        service = Service.query.get_or_404(service_id)
        service.is_active = not service.is_active
        db.session.commit()
        
        status = "active" if service.is_active else "inactive"
        print(f"🔄 Service {service_id} status toggled to: {status}")
        
        return jsonify({
            "message": "Service status updated", 
            "isActive": service.is_active
        })
        
    except Exception as e:
        db.session.rollback()
        print("❌ Error toggling service status:", str(e))
        return jsonify({"error": str(e)}), 500

    

# ✅ Get single service
@services_bp.route('/api/vendor/services/<int:service_id>', methods=['GET'])
def get_service(service_id):
    try:
        service = Service.query.get_or_404(service_id)
        return jsonify(service.to_dict())
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500